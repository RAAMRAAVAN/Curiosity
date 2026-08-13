import { prisma } from '@/server/prisma';
import { getUserFromRequest } from '@/server/auth';

const ROLES_KEY = 'rbac.roles.v1';
const USER_ACCESS_PREFIX = 'rbac.userAccess.';
const USER_ACCESS_SUFFIX = '.v1';

export const ADMIN_PERMISSIONS = [
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  'roles.view',
  'roles.create',
  'roles.edit',
  'roles.delete',
  'roles.assign',
  'centers.view',
  'centers.create',
  'centers.edit',
  'centers.delete',
  'classes.view',
  'classes.create',
  'classes.edit',
  'classes.delete',
  'class_content.edit',
  'subjects.view',
  'subjects.create',
  'subjects.edit',
  'subjects.delete',
  'assessments.view',
  'assessments.create',
  'assessments.edit',
  'assessments.delete',
  'assessments.pending.view',
  'assessments.appeared.view',
  'assessments.pending.appear',
  'assessments.appeared.reappear',
  'teachers.view',
  'teachers.create',
  'teachers.edit',
  'teachers.delete',
  'teachers.export',
  'students.view',
  'students.create',
  'students.edit',
  'students.delete',
  'students.export',
  'results.view',
  'results.export',
  'navigation.edit',
];

const TEACHER_PERMISSIONS = [
  'teachers.view',
  'teachers.edit',
  'students.view',
  'students.edit',
  'classes.view',
  'subjects.view',
  'assessments.view',
  'assessments.pending.view',
  'assessments.appeared.view',
  'assessments.pending.appear',
  'assessments.appeared.reappear',
  'class_content.edit',
  'results.view',
  'results.export',
  'students.export',
  'teachers.export',
];

const normalizePermission = (value) => String(value || '').trim().toLowerCase();

const PERMISSION_ALIASES = {
  'assessments.pending.appear': ['assessments.pending.attempt'],
  'assessments.pending.attempt': ['assessments.pending.appear'],
  'assessments.appeared.reappear': ['assessments.appeared.reattempt'],
  'assessments.appeared.reattempt': ['assessments.appeared.reappear'],
};

const userAccessKey = (userId) => `${USER_ACCESS_PREFIX}${userId}${USER_ACCESS_SUFFIX}`;

const uniqueStrings = (values = []) => {
  const cleaned = values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
};

const parseJsonSafe = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const validatePermissions = (permissions = []) => {
  const normalized = uniqueStrings(permissions.map(normalizePermission));
  return normalized.filter((permission) => permission === '*' || permission.includes('.'));
};

export const getAllCustomRoles = async () => {
  const record = await prisma.appSetting.findUnique({ where: { key: ROLES_KEY } });
  const parsed = parseJsonSafe(record?.value || '[]', []);
  return Array.isArray(parsed) ? parsed : [];
};

const saveAllCustomRoles = async (roles) => {
  await prisma.appSetting.upsert({
    where: { key: ROLES_KEY },
    create: { key: ROLES_KEY, value: JSON.stringify(roles || []) },
    update: { value: JSON.stringify(roles || []) },
  });
};

export const createCustomRole = async ({ name, description = '', permissions = [] }) => {
  const roleName = String(name || '').trim();
  if (!roleName) {
    throw new Error('Role name is required');
  }

  const roles = await getAllCustomRoles();
  const duplicate = roles.some((item) => String(item.name || '').trim().toLowerCase() === roleName.toLowerCase());
  if (duplicate) {
    throw new Error('Role name already exists');
  }

  const role = {
    id: `role_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: roleName,
    description: String(description || '').trim(),
    permissions: validatePermissions(permissions),
    status: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveAllCustomRoles([role, ...roles]);
  return role;
};

export const updateCustomRole = async (roleId, { name, description, permissions, status }) => {
  const roles = await getAllCustomRoles();
  const index = roles.findIndex((item) => item.id === roleId);
  if (index < 0) {
    throw new Error('Role not found');
  }

  const existing = roles[index];
  const nextName = name !== undefined ? String(name || '').trim() : existing.name;
  if (!nextName) {
    throw new Error('Role name is required');
  }

  const duplicate = roles.some((item, itemIndex) => itemIndex !== index && String(item.name || '').trim().toLowerCase() === nextName.toLowerCase());
  if (duplicate) {
    throw new Error('Role name already exists');
  }

  const updated = {
    ...existing,
    name: nextName,
    description: description !== undefined ? String(description || '').trim() : existing.description,
    permissions: permissions !== undefined ? validatePermissions(permissions) : existing.permissions,
    status: status !== undefined ? Boolean(status) : existing.status,
    updatedAt: new Date().toISOString(),
  };

  roles[index] = updated;
  await saveAllCustomRoles(roles);
  return updated;
};

export const deleteCustomRole = async (roleId) => {
  const roles = await getAllCustomRoles();
  const remaining = roles.filter((item) => item.id !== roleId);
  if (remaining.length === roles.length) {
    throw new Error('Role not found');
  }

  await saveAllCustomRoles(remaining);

  // Detach this role from all user assignments.
  const assignments = await prisma.appSetting.findMany({
    where: {
      key: {
        startsWith: USER_ACCESS_PREFIX,
      },
    },
  });

  for (const assignment of assignments) {
    const parsed = parseJsonSafe(assignment.value || '{}', {});
    if (parsed.roleId !== roleId) {
      continue;
    }

    const nextValue = {
      ...parsed,
      roleId: null,
      updatedAt: new Date().toISOString(),
    };

    await prisma.appSetting.update({
      where: { key: assignment.key },
      data: { value: JSON.stringify(nextValue) },
    });
  }
};

export const getUserAccessAssignment = async (userId) => {
  const record = await prisma.appSetting.findUnique({ where: { key: userAccessKey(userId) } });
  const parsed = parseJsonSafe(record?.value || '{}', {});
  return {
    roleId: parsed.roleId || null,
    centerIds: uniqueStrings(Array.isArray(parsed.centerIds) ? parsed.centerIds : []),
    updatedAt: parsed.updatedAt || null,
  };
};

export const setUserAccessAssignment = async (userId, { roleId = null, centerIds = [] }) => {
  const payload = {
    roleId: roleId || null,
    centerIds: uniqueStrings(centerIds),
    updatedAt: new Date().toISOString(),
  };

  await prisma.appSetting.upsert({
    where: { key: userAccessKey(userId) },
    create: { key: userAccessKey(userId), value: JSON.stringify(payload) },
    update: { value: JSON.stringify(payload) },
  });

  return payload;
};

export const deleteUserAccessAssignment = async (userId) => {
  try {
    await prisma.appSetting.delete({ where: { key: userAccessKey(userId) } });
  } catch {
    // no-op
  }
};

export const permissionMatches = (grantedPermission, requiredPermission) => {
  const granted = normalizePermission(grantedPermission);
  const required = normalizePermission(requiredPermission);
  const requiredVariants = [required, ...(PERMISSION_ALIASES[required] || [])];

  if (!granted || !required) return false;
  if (granted === '*') return true;
  if (requiredVariants.includes(granted)) return true;

  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -2);
    return requiredVariants.some((variant) => variant.startsWith(`${prefix}.`));
  }

  return false;
};

export const hasPermission = (grantedPermissions = [], requiredPermission) => {
  if (!requiredPermission) return true;
  return grantedPermissions.some((permission) => permissionMatches(permission, requiredPermission));
};

export const buildAdminActorContext = async (authUser) => {
  if (!authUser?.userId && !authUser?.id) {
    return null;
  }

  const userId = authUser.userId || authUser.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teacher: {
        select: {
          centerId: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const role = String(user.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isManagement = role === 'MANAGEMENT';
  const isTeacher = role === 'TEACHER';

  let grantedPermissions = [];
  let assignedCenterIds = [];
  let customRole = null;

  if (isAdmin) {
    grantedPermissions = ['*'];
  } else if (isManagement) {
    const [roles, assignment] = await Promise.all([
      getAllCustomRoles(),
      getUserAccessAssignment(user.id),
    ]);

    customRole = roles.find((item) => item.id === assignment.roleId) || null;
    if (!customRole) {
      const roleName = String(role || '').toLowerCase();
      customRole = roles.find((item) => String(item.name || '').trim().toLowerCase() === roleName && item.status !== false) || null;
    }
    grantedPermissions = validatePermissions(customRole?.permissions || []);
    assignedCenterIds = uniqueStrings([
      ...(assignment.centerIds || []),
      user.management?.centerId,
      user.centerId,
    ]);
  } else if (isTeacher) {
    grantedPermissions = TEACHER_PERMISSIONS;
    assignedCenterIds = uniqueStrings([user.teacher?.centerId || user.centerId || null].filter(Boolean));
  }

  return {
    userId: user.id,
    role,
    isAdmin,
    isManagement,
    isTeacher,
    customRole,
    grantedPermissions,
    assignedCenterIds,
    hasPermission: (permission) => hasPermission(grantedPermissions, permission),
    canAccessCenter: (centerId) => {
      if (isAdmin) return true;
      const normalizedCenterId = String(centerId ?? '').trim();
      if (!normalizedCenterId) return false;
      return assignedCenterIds.includes(normalizedCenterId);
    },
  };
};

export const getAdminActorFromRequest = async (req) => {
  const authUser = getUserFromRequest(req);
  if (!authUser) return null;
  return buildAdminActorContext(authUser);
};

export const requireAdminPermission = async (req, requiredPermission) => {
  const actor = await getAdminActorFromRequest(req);
  if (!actor) {
    return {
      ok: false,
      status: 401,
      message: 'Unauthorized',
    };
  }

  if (!actor.isAdmin && !actor.isManagement && !actor.isTeacher) {
    return {
      ok: false,
      status: 403,
      message: 'Forbidden',
    };
  }

  if (!actor.hasPermission(requiredPermission)) {
    return {
      ok: false,
      status: 403,
      message: 'You are not authorized to perform this operation.',
    };
  }

  return {
    ok: true,
    actor,
  };
};

export const filterByAssignableCenters = (actor, records = [], centerIdSelector) => {
  if (!actor || actor.isAdmin) return records;
  if (!Array.isArray(records)) return [];

  return records.filter((record) => {
    const centerId = centerIdSelector(record);
    return actor.canAccessCenter(centerId);
  });
};
