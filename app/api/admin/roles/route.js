import { ApiResponse } from '@/utils/apiResponse';
import { createCustomRole, ensureTeachersRoleExists, getAllCustomRoles, requireAdminPermission } from '@/lib/adminRbac';
import { paginateArray, parsePagination } from '@/lib/pagination';

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'roles.view');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const roles = await getAllCustomRoles();
  const teachersRole = await ensureTeachersRoleExists();
  const mergedRoles = [teachersRole, ...roles.filter((role) => role.id !== teachersRole.id)];
  const pagination = parsePagination(req);
  if (pagination) {
    const term = pagination.search.toLowerCase();
    const matching = term
      ? mergedRoles.filter((role) => `${role.name || ''} ${role.description || ''}`.toLowerCase().includes(term))
      : mergedRoles;
    const { rows, meta } = paginateArray(matching, pagination);
    return ApiResponse.paginated(rows, meta);
  }
  return ApiResponse.success(mergedRoles);
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
