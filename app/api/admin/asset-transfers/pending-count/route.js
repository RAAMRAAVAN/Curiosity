import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getAssetCenterScope } from '@/lib/assetManagement';

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'asset_receive.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const scope = getAssetCenterScope(auth.actor);
    const count = await prisma.assetTransfer.count({
      where: { status: 'PENDING', ...(scope === null ? {} : { toCenterId: { in: scope } }) },
    });
    return ApiResponse.success({ count });
  } catch (error) {
    console.error('Pending transfer count error:', error);
    return ApiResponse.error('Unable to load pending transfers.', 500, error);
  }
}
