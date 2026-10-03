import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { canAccessAssetCenter, generateAssetCode, lockAsset, normalizeAssetText, recordAssetEvent } from '@/lib/assetManagement';
import { attachTransferNames, transferInclude } from '@/lib/assetTransfers';

class TransferError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

const actionConfig = {
  cancel: { permission: 'asset_transfer.cancel', side: 'fromCenterId', status: 'CANCELLED', event: 'TRANSFER_CANCELLED', message: 'Transfer cancelled.' },
  receive: { permission: 'asset_receive.receive', side: 'toCenterId', status: 'RECEIVED', event: 'TRANSFER_RECEIVED', message: 'Asset received. Stock updated.' },
  reject: { permission: 'asset_receive.reject', side: 'toCenterId', status: 'REJECTED', event: 'TRANSFER_REJECTED', message: 'Transfer rejected.' },
};

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, ['asset_transfer.cancel', 'asset_receive.receive', 'asset_receive.reject']);
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const body = await req.json();
    const config = actionConfig[String(body?.action || '')];
    if (!config) return ApiResponse.error('Unknown action.', 400);
    if (!auth.actor.hasPermission(config.permission)) {
      return ApiResponse.error('You do not have permission to perform this action.', 403);
    }
    const remarks = normalizeAssetText(body?.remarks);
    if (config.status === 'REJECTED' && !remarks) return ApiResponse.error('Enter a reason for rejecting.', 400);

    const result = await prisma.$transaction(async (tx) => {
      const pre = await tx.assetTransfer.findUnique({ where: { id }, select: { assetId: true } });
      if (pre) await lockAsset(tx, pre.assetId);
      const transfer = await tx.assetTransfer.findUnique({ where: { id } });
      if (!transfer) throw new TransferError('Transfer not found.', 404);
      if (!canAccessAssetCenter(auth.actor, transfer[config.side])) {
        throw new TransferError('You are not authorized to act on this transfer for this center.', 403);
      }
      if (transfer.status !== 'PENDING') throw new TransferError('This transfer has already been processed.');

      const asset = await tx.assetList.findUnique({
        where: { id: transfer.assetId },
        include: { itemMaster: { select: { categoryId: true } } },
      });
      const base = {
        assetId: transfer.assetId,
        fromCenterId: transfer.fromCenterId,
        toCenterId: transfer.toCenterId,
        quantity: transfer.quantity,
        referenceNo: transfer.transferNo,
        performedById: auth.actor.userId,
      };
      let resultingAssetId = null;

      if (config.status === 'RECEIVED') {
        if (!asset || asset.centerId !== transfer.fromCenterId || asset.lifecycle !== 'AVAILABLE' || asset.quantity < transfer.quantity) {
          throw new TransferError('The asset is no longer available at the sending center. Reject this transfer.');
        }
        if (asset.quantity === transfer.quantity) {
          await tx.assetList.update({ where: { id: asset.id }, data: { centerId: transfer.toCenterId, location: null } });
          resultingAssetId = asset.id;
          await recordAssetEvent(tx, { ...base, type: 'TRANSFER_RECEIVED', centerId: transfer.toCenterId, remarks: remarks || 'Received at destination center.' });
        } else {
          await tx.assetList.update({ where: { id: asset.id }, data: { quantity: { decrement: transfer.quantity } } });
          const child = await tx.assetList.create({
            data: {
              assetCode: await generateAssetCode(tx, asset.itemMaster.categoryId),
              itemMasterId: asset.itemMasterId,
              centerId: transfer.toCenterId,
              quantity: transfer.quantity,
              condition: asset.condition,
              purchaseDate: asset.purchaseDate,
              purchaseCost: asset.purchaseCost,
              vendor: asset.vendor,
              invoiceNumber: asset.invoiceNumber,
              warrantyExpiry: asset.warrantyExpiry,
              notes: asset.notes,
              parentAssetId: asset.id,
            },
          });
          resultingAssetId = child.id;
          await recordAssetEvent(tx, { ...base, type: 'SPLIT', centerId: transfer.fromCenterId, remarks: `${transfer.quantity} unit(s) received at destination as ${child.assetCode}.` });
          await recordAssetEvent(tx, { ...base, assetId: child.id, type: 'TRANSFER_RECEIVED', centerId: transfer.toCenterId, remarks: `Split from ${asset.assetCode}.${remarks ? ` ${remarks}` : ''}` });
        }
      } else {
        await recordAssetEvent(tx, { ...base, type: config.event, centerId: transfer.fromCenterId, remarks });
      }

      return tx.assetTransfer.update({
        where: { id },
        data: {
          status: config.status,
          respondedById: auth.actor.userId,
          respondedAt: new Date(),
          responseRemarks: remarks,
          resultingAssetId,
        },
        include: transferInclude,
      });
    });

    const [transfer] = await attachTransferNames([result]);
    return ApiResponse.success(transfer, config.message);
  } catch (error) {
    if (error instanceof TransferError) return ApiResponse.error(error.message, error.status);
    console.error('Update asset transfer error:', error);
    return ApiResponse.error('Unable to update asset transfer.', 500, error);
  }
}
