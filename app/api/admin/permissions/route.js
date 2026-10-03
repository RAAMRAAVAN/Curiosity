import { ApiResponse } from '@/utils/apiResponse';
import { getPermissionCatalog, requireAdminPermission } from '@/lib/adminRbac';

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'roles.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    return ApiResponse.success(await getPermissionCatalog());
  } catch (error) {
    console.error('Load permission catalog error:', error);
    return ApiResponse.error('Unable to load permissions.', 500, error);
  }
}