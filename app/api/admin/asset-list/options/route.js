import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getAssetCenterScope } from '@/lib/assetManagement';

export async function GET(req) {
  const auth = await requireAdminPermission(req, ['asset_list.view', 'asset_list.create', 'asset_list.edit']);
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const centerScope = getAssetCenterScope(auth.actor);
    const [centers, items] = await Promise.all([
      prisma.center.findMany({
        where: { status: true, ...(centerScope === null ? {} : { id: { in: centerScope } }) },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
      prisma.itemMaster.findMany({
        where: { status: true, category: { status: true } },
        select: { id: true, name: true, unit: true, category: { select: { id: true, name: true } } },
        orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      }),
    ]);
    return ApiResponse.success({ centers, items });
  } catch (error) {
    console.error('Load asset options error:', error);
    return ApiResponse.error('Unable to load asset options.', 500, error);
  }
}