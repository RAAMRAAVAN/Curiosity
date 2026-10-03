import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { canAccessAssetCenter, generateAssetCode, getReservedQuantity, lockAsset, normalizeAssetText, parseMoney, recordAssetEvent } from '@/lib/assetManagement';

const conditions = ['GOOD', 'FAIR', 'NEEDS_REPAIR', 'DAMAGED'];
const assetInclude = {
  itemMaster: { include: { category: { select: { id: true, name: true } } } },
  center: { select: { id: true, name: true, slug: true } },
};

class LifecycleError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

export async function POST(req, { params }) {
  const auth = await requireAdminPermission(req, 'asset_list.edit');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const body = await req.json();
    const action = String(body?.action || '');
    const remarks = normalizeAssetText(body?.remarks);
    const vendor = normalizeAssetText(body?.vendor);
    const cost = parseMoney(body?.cost);
    if (!cost.ok) return ApiResponse.error('Cost must be a non-negative number.', 400);

    const target = { send_for_repair: 'UNDER_REPAIR', return_from_repair: 'AVAILABLE', dispose: 'DISPOSED' }[action];
    if (!target) return ApiResponse.error('Unknown action.', 400);
    if (action === 'dispose' && !remarks) return ApiResponse.error('Enter a reason for disposal.', 400);
    const condition = body?.condition || 'GOOD';
    if (action === 'return_from_repair' && !conditions.includes(condition)) {
      return ApiResponse.error('Asset condition is invalid.', 400);
    }

    const eventType = { send_for_repair: 'SENT_FOR_REPAIR', return_from_repair: 'RETURNED_FROM_REPAIR', dispose: 'DISPOSED' }[action];

    const updated = await prisma.$transaction(async (tx) => {
      await lockAsset(tx, id);
      const record = await tx.assetList.findUnique({ where: { id }, include: { itemMaster: { select: { categoryId: true } } } });
      if (!record) throw new LifecycleError('Asset record not found.', 404);
      if (!canAccessAssetCenter(auth.actor, record.centerId)) {
        throw new LifecycleError('You are not authorized to access this center.', 403);
      }
      if (record.lifecycle === 'DISPOSED') throw new LifecycleError('This asset has already been disposed.');
      if (action === 'send_for_repair' && record.lifecycle !== 'AVAILABLE') throw new LifecycleError('Only available assets can be sent for repair.');
      if (action === 'return_from_repair' && record.lifecycle !== 'UNDER_REPAIR') throw new LifecycleError('This asset is not under repair.');

      const requested = body?.quantity === undefined || body.quantity === '' || body.quantity === null ? record.quantity : Number(body.quantity);
      if (!Number.isInteger(requested) || requested < 1 || requested > record.quantity) {
        throw new LifecycleError(`Quantity must be between 1 and ${record.quantity}.`, 400);
      }
      if (record.lifecycle === 'UNDER_REPAIR' && requested !== record.quantity) {
        throw new LifecycleError('An asset under repair can only be updated as a whole.', 400);
      }
      // Only the part not reserved by pending transfers may change status.
      const reserved = await getReservedQuantity(tx, id);
      if (action !== 'return_from_repair' && requested > record.quantity - reserved) {
        throw new LifecycleError(`${reserved} unit(s) are reserved by pending transfers. Resolve them first.`);
      }

      const base = { centerId: record.centerId, remarks, vendor, cost: cost.value, performedById: auth.actor.userId };

      if (requested === record.quantity) {
        const result = await tx.assetList.update({
          where: { id },
          data: { lifecycle: target, ...(action === 'return_from_repair' ? { condition } : {}) },
          include: assetInclude,
        });
        await recordAssetEvent(tx, { ...base, assetId: id, type: eventType, quantity: requested });
        return result;
      }

      // Partial quantity: split the units out into their own trackable record.
      await tx.assetList.update({ where: { id }, data: { quantity: { decrement: requested } } });
      const child = await tx.assetList.create({
        data: {
          assetCode: await generateAssetCode(tx, record.itemMaster.categoryId),
          itemMasterId: record.itemMasterId,
          centerId: record.centerId,
          quantity: requested,
          condition: record.condition,
          lifecycle: target,
          parentAssetId: record.id,
          location: record.location,
          purchaseDate: record.purchaseDate,
          purchaseCost: record.purchaseCost,
          vendor: record.vendor,
          invoiceNumber: record.invoiceNumber,
          warrantyExpiry: record.warrantyExpiry,
          notes: record.notes,
        },
        include: assetInclude,
      });
      await recordAssetEvent(tx, { centerId: record.centerId, assetId: id, type: 'SPLIT', quantity: requested, remarks: `${requested} unit(s) split out as ${child.assetCode}.`, performedById: auth.actor.userId });
      await recordAssetEvent(tx, { ...base, assetId: child.id, type: eventType, quantity: requested, remarks: `Split from ${record.assetCode}.${remarks ? ` ${remarks}` : ''}` });
      return child;
    });
    return ApiResponse.success(updated, 'Asset status updated.');
  } catch (error) {
    if (error instanceof LifecycleError) return ApiResponse.error(error.message, error.status);
    console.error('Asset lifecycle error:', error);
    return ApiResponse.error('Unable to update asset status.', 500, error);
  }
}
