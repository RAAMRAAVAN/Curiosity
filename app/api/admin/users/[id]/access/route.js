import { ApiResponse } from '@/utils/apiResponse';
import { getUserAccessAssignment, getAllCustomRoles, requireAdminPermission, setUserAccessAssignment } from '@/lib/adminRbac';
import { prisma } from '@/server/prisma';

export async function GET(req, { params }) {
  const auth = await requireAdminPermission(req, 'roles.assign');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const { id } = await params;
  const [assignment, roles] = await Promise.all([
    getUserAccessAssignment(id),
    getAllCustomRoles(),
  ]);

  const selectedRole = roles.find((item) => item.id === assignment.roleId) || null;
  return ApiResponse.success({
    ...assignment,
    role: selectedRole,
  });
}

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'roles.assign');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) {
      return ApiResponse.error('User not found', 404);
    }

    if (String(user.role || '').toUpperCase() !== 'MANAGEMENT') {
      return ApiResponse.error('Custom role assignment is supported only for MANAGEMENT users.', 400);
    }

    const roleId = body?.roleId || null;
    const centerIds = Array.isArray(body?.centerIds) ? body.centerIds : [];

    if (roleId) {
      const roles = await getAllCustomRoles();
      const roleExists = roles.some((item) => item.id === roleId && item.status !== false);
      if (!roleExists) {
        return ApiResponse.error('Selected role not found or disabled.', 400);
      }
    }

    if (centerIds.length > 0) {
      if (!auth.actor.isAdmin && centerIds.some((centerId) => !auth.actor.canAccessCenter(centerId))) {
        return ApiResponse.error('Forbidden: one or more selected centers are outside your scope.', 403);
      }

      const centers = await prisma.center.findMany({
        where: { id: { in: centerIds } },
        select: { id: true },
      });

      if (centers.length !== centerIds.length) {
        return ApiResponse.error('One or more selected centers are invalid.', 400);
      }
    }

    const assignment = await setUserAccessAssignment(id, { roleId, centerIds });
    return ApiResponse.success(assignment, 'User access updated successfully.');
  } catch (error) {
    console.error(error);
    return ApiResponse.error(error.message || 'Unable to update user access', 500, error);
  }
}
