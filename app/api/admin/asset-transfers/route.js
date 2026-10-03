import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { canAccessAssetCenter, generateTransferNo, getAssetCenterScope, getReservedQuantity, lockAsset, normalizeAssetText, recordAssetEvent } from '@/lib/assetManagement';
import { attachTransferNames, transferInclude } from '@/lib/assetTransfers';
import { buildPaginationMeta, containsFilter, parsePagination } from '@/lib/pagination';

export async function GET(req) {
  const direction = new URL(req.url).searchParams.get('direction') === 'incoming' ? 'incoming' : 'outgoing';
  const auth = await requireAdminPermission(req, direction === 'incoming' ? 'asset_receive.view' : 'asset_transfer.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const scope = getAssetCenterScope(auth.actor);
    const centerField = direction === 'incoming' ? 'toCenterId' : 'fromCenterId';
    const baseWhere = scope === null ? {} : { [centerField]: { in: scope } };
    const pagination = parsePagination(req);
    if (pagination) {
      const status = pagination.params.get('status');
      const where = { ...baseWhere, ...(status ? { status } : {}) };
      if (pagination.search) {
        const term = containsFilter(pagination.search);
        const matchedCenters = await prisma.center.findMany({ where: { name: term }, select: { id: true } });
        const centerIds = matchedCenters.map((center) => center.id);
        where.OR = [
          { transferNo: term },
          { asset: { assetCode: term } },
          { asset: { serialNumber: term } },
          { asset: { itemMaster: { name: term } } },
          ...(centerIds.length ? [{ fromCenterId: { in: centerIds } }, { toCenterId: { in: centerIds } }] : []),
        ];
      }
      const [total, rows] = await Promise.all([
        prisma.assetTransfer.count({ where }),
        prisma.assetTransfer.findMany({ where, include: transferInclude, orderBy: { createdAt: 'desc' }, skip: pagination.skip, take: pagination.take }),
      ]);
      return ApiResponse.paginated(await attachTransferNames(rows), buildPaginationMeta(total, pagination));
    }

    const transfers = await prisma.assetTransfer.findMany({
      where: baseWhere,
      include: transferInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return ApiResponse.success(await attachTransferNames(transfers));
  } catch (error) {
    console.error('Load asset transfers error:', error);
    return ApiResponse.error('Unable to load asset transfers.', 500, error);
  }
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'asset_transfer.create');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const body = await req.json();
    const assetId = String(body?.assetId || '').trim();
    const toCenterId = String(body?.toCenterId || '').trim();
    const quantity = Number(body?.quantity);
    if (!assetId || !toCenterId || !Number.isInteger(quantity) || quantity < 1) {
      return ApiResponse.error('Asset, destination center, and a quantity greater than zero are required.', 400);
    }

    const asset = await prisma.assetList.findUnique({ where: { id: assetId } });
    if (!asset || !asset.status) return ApiResponse.error('Asset not found.', 404);
    if (!canAccessAssetCenter(auth.actor, asset.centerId)) {
      return ApiResponse.error('You are not authorized to transfer assets from this center.', 403);
    }
    if (asset.lifecycle !== 'AVAILABLE') {
      return ApiResponse.error('Only assets that are available (not under repair or disposed) can be transferred.', 409);
    }
    if (toCenterId === asset.centerId) return ApiResponse.error('Select a different destination center.', 400);

    const destination = await prisma.center.findFirst({ where: { id: toCenterId, status: true }, select: { id: true } });
    if (!destination) return ApiResponse.error('Select an active destination center.', 400);

    const reserved = await getReservedQuantity(prisma, assetId);
    const available = asset.quantity - reserved;
    if (quantity > available) {
      return ApiResponse.error(`Only ${Math.max(available, 0)} unit(s) are available to transfer (${reserved} reserved by pending transfers).`, 409);
    }

    const transfer = await prisma.$transaction(async (tx) => {
      // Re-check under a row lock so concurrent requests cannot over-reserve.
      await lockAsset(tx, assetId);
      const current = await tx.assetList.findUnique({ where: { id: assetId }, select: { quantity: true, lifecycle: true, centerId: true } });
      const reserved = await getReservedQuantity(tx, assetId);
      const available = current.quantity - reserved;
      if (current.lifecycle !== 'AVAILABLE' || current.centerId !== asset.centerId) {
        throw new Error('ASSET_CHANGED');
      }
      if (quantity > available) {
        throw new Error(`UNAVAILABLE:${Math.max(available, 0)}:${reserved}`);
      }
      const created = await tx.assetTransfer.create({
        data: {
          transferNo: generateTransferNo(),
          assetId,
          fromCenterId: asset.centerId,
          toCenterId,
          quantity,
          remarks: normalizeAssetText(body?.remarks),
          requestedById: auth.actor.userId,
        },
        include: transferInclude,
      });
      await recordAssetEvent(tx, {
        assetId,
        type: 'TRANSFER_REQUESTED',
        centerId: asset.centerId,
        fromCenterId: asset.centerId,
        toCenterId,
        quantity,
        remarks: body?.remarks,
        performedById: auth.actor.userId,
        referenceNo: created.transferNo,
      });
      return created;
    });
    const [result] = await attachTransferNames([transfer]);
    return ApiResponse.success(result, 'Transfer sent for receiving approval.', 201);
  } catch (error) {
    const message = String(error?.message || '');
    if (message === 'ASSET_CHANGED') return ApiResponse.error('The asset changed while sending. Please retry.', 409);
    if (message.startsWith('UNAVAILABLE:')) {
      const [, available, reserved] = message.split(':');
      return ApiResponse.error(`Only ${available} unit(s) are available to transfer (${reserved} reserved by pending transfers).`, 409);
    }
    console.error('Create asset transfer error:', error);
    return ApiResponse.error('Unable to create asset transfer.', 500, error);
  }
}
