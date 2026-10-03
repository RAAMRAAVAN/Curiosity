import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { canAccessAssetCenter, generateAssetCode, getAssetCenterScope, normalizeAssetText, parseAssetDate, recordAssetEvent } from '@/lib/assetManagement';
import { buildPaginationMeta, containsFilter, parsePagination } from '@/lib/pagination';

const assetInclude = {
  itemMaster: { include: { category: { select: { id: true, name: true } } } },
  center: { select: { id: true, name: true, slug: true } },
};

const parseQuantity = (value) => {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : null;
};

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'asset_list.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const centerScope = getAssetCenterScope(auth.actor);
    const requestedCenterId = new URL(req.url).searchParams.get('centerId');
    if (requestedCenterId && !canAccessAssetCenter(auth.actor, requestedCenterId)) {
      return ApiResponse.error('You are not authorized to view assets for this center.', 403);
    }

    const where = {
      status: true,
      ...(centerScope === null ? {} : { centerId: { in: centerScope } }),
      ...(requestedCenterId ? { centerId: requestedCenterId } : {}),
    };
    const orderBy = [{ center: { name: 'asc' } }, { itemMaster: { name: 'asc' } }, { createdAt: 'desc' }];

    const pagination = parsePagination(req);
    if (pagination) {
      const condition = pagination.params.get('condition');
      const lifecycle = pagination.params.get('lifecycle');
      if (condition) where.condition = condition;
      if (lifecycle) where.lifecycle = lifecycle;
      if (pagination.search) {
        const term = containsFilter(pagination.search);
        where.OR = [
          { assetCode: term },
          { serialNumber: term },
          { assetTag: term },
          { location: term },
          { vendor: term },
          { itemMaster: { name: term } },
          { itemMaster: { category: { name: term } } },
          { center: { name: term } },
        ];
      }
      const [total, rows, quantity] = await Promise.all([
        prisma.assetList.count({ where }),
        prisma.assetList.findMany({ where, include: assetInclude, orderBy, skip: pagination.skip, take: pagination.take }),
        prisma.assetList.aggregate({ where: { ...where, lifecycle: lifecycle || { not: 'DISPOSED' } }, _sum: { quantity: true } }),
      ]);
      return ApiResponse.paginated(rows, { ...buildPaginationMeta(total, pagination), totalQuantity: quantity._sum.quantity || 0 });
    }

    const records = await prisma.assetList.findMany({ where, include: assetInclude, orderBy });
    return ApiResponse.success(records);
  } catch (error) {
    console.error('Load asset list error:', error);
    return ApiResponse.error('Unable to load assets.', 500, error);
  }
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'asset_list.create');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const body = await req.json();
    const itemMasterId = String(body?.itemMasterId || '').trim();
    const centerId = String(body?.centerId || '').trim();
    const quantity = parseQuantity(body?.quantity);
    if (!itemMasterId || !centerId || !quantity) {
      return ApiResponse.error('Item, center, and a quantity greater than zero are required.', 400);
    }
    if (!canAccessAssetCenter(auth.actor, centerId)) {
      return ApiResponse.error('You are not authorized to create assets for this center.', 403);
    }

    const item = await prisma.itemMaster.findFirst({ where: { id: itemMasterId, status: true }, select: { id: true, categoryId: true } });
    const center = await prisma.center.findFirst({ where: { id: centerId, status: true }, select: { id: true } });
    if (!item) return ApiResponse.error('Select an active item.', 400);
    if (!center) return ApiResponse.error('Select an active center.', 400);

    const serialNumber = normalizeAssetText(body?.serialNumber);
    if (serialNumber && quantity !== 1) {
      return ApiResponse.error('An asset with a serial number must have a quantity of 1.', 400);
    }

    const purchaseDate = parseAssetDate(body?.purchaseDate);
    if (!purchaseDate.ok) return ApiResponse.error('Purchase date is invalid.', 400);
    const purchaseCost = body?.purchaseCost === undefined || body.purchaseCost === null || body.purchaseCost === ''
      ? null
      : Number(body.purchaseCost);
    if (purchaseCost !== null && (!Number.isFinite(purchaseCost) || purchaseCost < 0)) {
      return ApiResponse.error('Purchase cost must be a non-negative number.', 400);
    }

    const warrantyExpiry = parseAssetDate(body?.warrantyExpiry);
    if (!warrantyExpiry.ok) return ApiResponse.error('Warranty expiry date is invalid.', 400);

    const record = await prisma.$transaction(async (tx) => {
      const assetCode = await generateAssetCode(tx, item.categoryId);
      const created = await tx.assetList.create({
        data: {
          assetCode,
          itemMasterId,
          centerId,
          quantity,
          assetTag: normalizeAssetText(body?.assetTag),
          serialNumber,
          condition: body?.condition || 'GOOD',
          location: normalizeAssetText(body?.location),
          purchaseDate: purchaseDate.value,
          purchaseCost,
          vendor: normalizeAssetText(body?.vendor),
          invoiceNumber: normalizeAssetText(body?.invoiceNumber),
          warrantyExpiry: warrantyExpiry.value,
          notes: normalizeAssetText(body?.notes),
        },
        include: assetInclude,
      });
      await recordAssetEvent(tx, {
        assetId: created.id,
        type: 'PURCHASED',
        centerId,
        quantity,
        remarks: 'Asset added to inventory.',
        vendor: created.vendor,
        cost: purchaseCost,
        referenceNo: created.invoiceNumber,
        performedById: auth.actor.userId,
      });
      return created;
    });
    return ApiResponse.success(record, 'Asset recorded.', 201);
  } catch (error) {
    if (error?.code === 'P2002') {
      return ApiResponse.error(String(error?.meta?.target || '').includes('serial') ? 'This serial number already exists for the selected item.' : 'This asset tag is already in use.', 409);
    }
    console.error('Create asset record error:', error);
    return ApiResponse.error('Unable to create asset record.', 500, error);
  }
}