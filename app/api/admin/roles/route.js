import { ApiResponse } from '@/utils/apiResponse';
import { createCustomRole, getAllCustomRoles, requireAdminPermission } from '@/lib/adminRbac';

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'roles.view');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const roles = await getAllCustomRoles();
  return ApiResponse.success(roles);
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'roles.create');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const body = await req.json();
    const role = await createCustomRole({
      name: body?.name,
      description: body?.description,
      permissions: Array.isArray(body?.permissions) ? body.permissions : [],
    });

    return ApiResponse.success(role, 'Role created successfully.');
  } catch (error) {
    console.error(error);
    return ApiResponse.error(error.message || 'Unable to create role', 400);
  }
}
