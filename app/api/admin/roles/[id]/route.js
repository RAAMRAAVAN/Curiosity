import { ApiResponse } from '@/utils/apiResponse';
import { deleteCustomRole, requireAdminPermission, updateCustomRole } from '@/lib/adminRbac';

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'roles.edit');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const role = await updateCustomRole(id, {
      name: body?.name,
      description: body?.description,
      permissions: body?.permissions,
      status: body?.status,
    });

    return ApiResponse.success(role, 'Role updated successfully.');
  } catch (error) {
    console.error(error);
    return ApiResponse.error(error.message || 'Unable to update role', 400);
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'roles.delete');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const { id } = await params;
    await deleteCustomRole(id);
    return ApiResponse.success(null, 'Role deleted successfully.');
  } catch (error) {
    console.error(error);
    return ApiResponse.error(error.message || 'Unable to delete role', 400);
  }
}
