import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getAssetCenterScope } from '@/lib/assetManagement';

export async function GET(req) {
  const auth = await requireAdminPermission(req, ['asset_transfer.create', 'asset_transfer.view']);
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const scope = getAssetCenterScope(auth.actor);
    const [centers, assets, pending] = await Promise.all([
      prisma.center.findMany({ where: { status: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.assetList.findMany({
        where: { status: true, lifecycle: 'AVAILABLE', ...(scope === null ? {} : { centerId: { in: scope } }) },
        select: {
          id: true,
          assetCode: true,
          serialNumber: true,
          quantity: true,
          centerId: true,
          center: { select: { name: true } },
          itemMaster: { select: { name: true, unit: true } },
        },
        orderBy: [{ center: { name: 'asc' } }, { assetCode: 'asc' }],
      }),
      prisma.assetTransfer.groupBy({ by: ['assetId'], where: { status: 'PENDING' }, _sum: { quantity: true } }),
    ]);
    const reserved = Object.fromEntries(pending.map((row) => [row.assetId, row._sum.quantity || 0]));
    const transferable = assets
      .map((asset) => ({ ...asset, available: asset.quantity - (reserved[asset.id] || 0) }))
      .filter((asset) => asset.available > 0);
    return ApiResponse.success({ centers, assets: transferable });
  } catch (error) {
    console.error('Load transfer options error:', error);
    return ApiResponse.error('Unable to load transfer options.', 500, error);
  }
}
