import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { canAccessAssetCenter, getReservedQuantity, lockAsset, normalizeAssetText, parseAssetDate, recordAssetEvent } from '@/lib/assetManagement';

const assetInclude = {
  itemMaster: { include: { category: { select: { id: true, name: true } } } },
  center: { select: { id: true, name: true, slug: true } },
  assignedEmployee: { select: { id: true, name: true, role: true } },
  project: { select: { id: true, name: true, suffix: true } },
};

const conditions = ['GOOD', 'FAIR', 'NEEDS_REPAIR', 'DAMAGED'];

const getAccessibleRecord = async (id, actor) => {
  const record = await prisma.assetList.findUnique({ where: { id }, include: assetInclude });
  if (!record) return { error: ApiResponse.error('Asset record not found.', 404) };
  if (!canAccessAssetCenter(actor, record.centerId)) {
    return { error: ApiResponse.error('You are not authorized to access this center.', 403) };
  }
  return { record };
};

export async function GET(req, { params }) {
  const auth = await requireAdminPermission(req, 'asset_list.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const { record, error } = await getAccessibleRecord(id, auth.actor);
    if (error) return error;
    return ApiResponse.success(record);
  } catch (error) {
    console.error('Load asset record error:', error);
    return ApiResponse.error('Unable to load asset record.', 500, error);
  }
}

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'asset_list.edit');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const { record, error } = await getAccessibleRecord(id, auth.actor);
    if (error) return error;
    if (record.lifecycle === 'DISPOSED') return ApiResponse.error('A disposed asset cannot be edited.', 409);
    const body = await req.json();

    const itemMasterId = body?.itemMasterId === undefined ? record.itemMasterId : String(body.itemMasterId || '').trim();
    const centerId = body?.centerId === undefined ? record.centerId : String(body.centerId || '').trim();
    if (itemMasterId !== record.itemMasterId) return ApiResponse.error('The item of an existing asset cannot be changed.', 400);
    if (centerId !== record.centerId) return ApiResponse.error('Use Asset Transfer to move an asset to another center.', 400);
    const quantity = body?.quantity === undefined ? record.quantity : Number(body.quantity);
    if (!itemMasterId || !centerId || !Number.isInteger(quantity) || quantity < 1) {
      return ApiResponse.error('Item, center, and a quantity greater than zero are required.', 400);
    }
    if (!canAccessAssetCenter(auth.actor, centerId)) {
      return ApiResponse.error('You are not authorized to use this center.', 403);
    }

    const serialNumber = body?.serialNumber === undefined ? record.serialNumber : normalizeAssetText(body.serialNumber);
    if (serialNumber && quantity !== 1) {
      return ApiResponse.error('An asset with a serial number must have a quantity of 1.', 400);
    }

    const warrantyExpiry = parseAssetDate(body?.warrantyExpiry);
    if (!warrantyExpiry.ok) return ApiResponse.error('Warranty expiry date is invalid.', 400);

    const [item, center] = await Promise.all([
      prisma.itemMaster.findFirst({ where: { id: itemMasterId }, select: { id: true } }),
      prisma.center.findFirst({ where: { id: centerId, status: true }, select: { id: true } }),
    ]);
    if (!item) return ApiResponse.error('Item master not found.', 400);
    if (!center) return ApiResponse.error('Select an active center.', 400);

    const condition = body?.condition ?? record.condition;
    if (!conditions.includes(condition)) return ApiResponse.error('Asset condition is invalid.', 400);

    const lifecycle = body?.lifecycle ?? record.lifecycle;
    if (!['AVAILABLE', 'IN_USE', 'UNDER_REPAIR'].includes(lifecycle)) {
      return ApiResponse.error('Asset status is invalid.', 400);
    }
    if (record.lifecycle === 'UNDER_REPAIR' && lifecycle !== 'UNDER_REPAIR') {
      return ApiResponse.error('Use Return from repair to change this asset status.', 409);
    }
    if (lifecycle === 'UNDER_REPAIR' && record.lifecycle !== 'UNDER_REPAIR') {
      return ApiResponse.error('Use Send for repair to change this asset status.', 409);
    }
    const assignedEmployeeId = body?.assignedEmployeeId === undefined
      ? record.assignedEmployeeId
      : String(body.assignedEmployeeId || '').trim() || null;
    if (body?.assignedEmployeeId !== undefined && assignedEmployeeId && assignedEmployeeId !== record.assignedEmployeeId) {
      const employee = await prisma.user.findFirst({
        where: { id: assignedEmployeeId, status: true, role: { notIn: ['STUDENT', 'ADMIN'] } },
        select: { id: true },
      });
      if (!employee) return ApiResponse.error('Select an active employee.', 400);
    }
    const projectId = body?.projectId === undefined
      ? record.projectId
      : String(body.projectId || '').trim() || null;
    if (body?.projectId !== undefined && projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, status: true }, select: { id: true } });
      if (!project) return ApiResponse.error('Select a valid project.', 400);
    }

    const purchaseDate = parseAssetDate(body?.purchaseDate);
    if (!purchaseDate.ok) return ApiResponse.error('Purchase date is invalid.', 400);
    const purchaseCost = body?.purchaseCost === undefined
      ? record.purchaseCost
      : body.purchaseCost === null || body.purchaseCost === '' ? null : Number(body.purchaseCost);
    if (purchaseCost !== null && (!Number.isFinite(Number(purchaseCost)) || Number(purchaseCost) < 0)) {
      return ApiResponse.error('Purchase cost must be a non-negative number.', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await lockAsset(tx, id);
      const reserved = await getReservedQuantity(tx, id);
      if (quantity < reserved) {
        throw new Error(`RESERVED:${reserved}`);
      }
      const result = await tx.assetList.update({
        where: { id },
        data: {
          quantity,
          condition,
          lifecycle,
          ...(body?.manufacturer !== undefined ? { manufacturer: normalizeAssetText(body.manufacturer) } : {}),
          ...(body?.modelNumber !== undefined ? { modelNumber: normalizeAssetText(body.modelNumber) } : {}),
          ...(body?.assignedEmployeeId !== undefined ? { assignedEmployeeId } : {}),
          ...(body?.projectId !== undefined ? { projectId } : {}),
          ...(body?.assetTag !== undefined ? { assetTag: normalizeAssetText(body.assetTag) } : {}),
          ...(body?.serialNumber !== undefined ? { serialNumber } : {}),
          ...(body?.location !== undefined ? { location: normalizeAssetText(body.location) } : {}),
          ...(body?.purchaseDate !== undefined ? { purchaseDate: purchaseDate.value } : {}),
          ...(body?.purchaseCost !== undefined ? { purchaseCost } : {}),
          ...(body?.vendor !== undefined ? { vendor: normalizeAssetText(body.vendor) } : {}),
          ...(body?.invoiceNumber !== undefined ? { invoiceNumber: normalizeAssetText(body.invoiceNumber) } : {}),
          ...(body?.warrantyExpiry !== undefined ? { warrantyExpiry: warrantyExpiry.value } : {}),
          ...(body?.notes !== undefined ? { notes: normalizeAssetText(body.notes) } : {}),
          ...(body?.status !== undefined ? { status: Boolean(body.status) } : {}),
        },
        include: assetInclude,
      });

      const changes = [];
      if (result.quantity !== record.quantity) changes.push(`quantity ${record.quantity} -> ${result.quantity}`);
      if (result.condition !== record.condition) changes.push(`condition ${record.condition} -> ${result.condition}`);
      if (result.lifecycle !== record.lifecycle) changes.push(`status ${record.lifecycle} -> ${result.lifecycle}`);
      if ((result.manufacturer || '') !== (record.manufacturer || '')) changes.push('manufacturer updated');
      if ((result.modelNumber || '') !== (record.modelNumber || '')) changes.push('model number updated');
      if ((result.assignedEmployeeId || '') !== (record.assignedEmployeeId || '')) changes.push('assigned employee updated');
      if ((result.serialNumber || '') !== (record.serialNumber || '')) changes.push(`serial number ${record.serialNumber || '-'} -> ${result.serialNumber || '-'}`);
      if ((result.location || '') !== (record.location || '')) changes.push(`location ${record.location || '-'} -> ${result.location || '-'}`);
      if (changes.length) {
        await recordAssetEvent(tx, {
          assetId: id,
          type: 'UPDATED',
          centerId: result.centerId,
          remarks: `Updated: ${changes.join(', ')}`,
          performedById: auth.actor.userId,
        });
      }
      return result;
    });
    return ApiResponse.success(updated, 'Asset record updated.');
  } catch (error) {
    if (String(error?.message || '').startsWith('RESERVED:')) {
      return ApiResponse.error(`${error.message.slice(9)} unit(s) are reserved by pending transfers. Quantity cannot be lower.`, 409);
    }
    if (error?.code === 'P2002') {
      return ApiResponse.error(String(error?.meta?.target || '').includes('serial') ? 'This serial number already exists for the selected item.' : 'This asset tag is already in use.', 409);
    }
    console.error('Update asset record error:', error);
    return ApiResponse.error('Unable to update asset record.', 500, error);
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'asset_list.delete');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const result = await prisma.$transaction(async (tx) => {
      await lockAsset(tx, id);
      const record = await tx.assetList.findUnique({
        where: { id },
        select: { id: true, centerId: true, status: true },
      });
      if (!record) return { type: 'missing' };
      if (!canAccessAssetCenter(auth.actor, record.centerId)) return { type: 'forbidden' };

      if (!record.status) {
        await tx.assetTransfer.deleteMany({
          where: { OR: [{ assetId: id }, { resultingAssetId: id }] },
        });
        await tx.assetList.updateMany({ where: { parentAssetId: id }, data: { parentAssetId: null } });
        await tx.assetList.delete({ where: { id } });
        return { type: 'deleted' };
      }

      if (await getReservedQuantity(tx, id)) return { type: 'pending-transfers' };

      await tx.assetList.update({ where: { id }, data: { status: false } });
      await recordAssetEvent(tx, {
        assetId: id,
        type: 'UPDATED',
        centerId: record.centerId,
        remarks: 'Record deactivated.',
        performedById: auth.actor.userId,
      });
      return { type: 'deactivated' };
    });

    if (result.type === 'missing') return ApiResponse.error('Asset record not found.', 404);
    if (result.type === 'forbidden') return ApiResponse.error('You are not authorized to access this center.', 403);
    if (result.type === 'pending-transfers') {
      return ApiResponse.error('Resolve this asset’s pending transfers before deactivating it.', 409);
    }
    return ApiResponse.success({ id }, result.type === 'deleted' ? 'Asset record and related history permanently deleted.' : 'Asset record deactivated.');
  } catch (error) {
    console.error('Deactivate asset record error:', error);
    return ApiResponse.error('Unable to update asset record status.', 500, error);
  }
}