import { prisma } from '@/server/prisma';
import { getUserFromRequest } from '@/server/auth';
import { createHash } from 'node:crypto';

const permissionCategoryLabels = {
  assessments316: 'Assessment (3-16 years)',
  asset_categories: 'Item Category',
  asset_items: 'Item',
  asset_list: 'Asset',
  asset_transfer: 'Asset Transfer',
  asset_receive: 'Asset Receive',
  asset_tracking: 'Asset Tracking',
  asset_reports: 'Asset Reports',
  class_content: 'Classes',
  navigation: 'Admin Navigation',
  results: 'Assessment Results',
};

const permissionActionLabels = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  cancel: 'Cancel',
  receive: 'Receive',
  reject: 'Reject',
  assign: 'Assign',
  mapping: 'Map',
  export: 'Export',
  mark: 'Mark',
  revoke: 'Revoke',
  manage: 'Manage',
  self: 'Self',
  monthly: 'Monthly',
  holiday: 'Holidays',
  appear: 'Record',
  reappear: 'Allow Reattempt',
};

const permissionCategory = (key) => {
  const resource = String(key || '').split('.')[0];
  return permissionCategoryLabels[resource] || resource.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const permissionLabel = (key) => {
  if (key === '*') return 'All permissions';
  const [resource, ...actionParts] = String(key || '').split('.');
  const resourceLabel = permissionCategoryLabels[resource]
    || resource.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const action = actionParts.map((part) => permissionActionLabels[part]
    || part.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())).join(' ');
  return `${action || 'Access'} ${resourceLabel}`;
};

const permissionRecordId = (key) => `perm_${createHash('sha1').update(key).digest('hex')}`;

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
  'classes.mapping',
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
  'assessments.absent.view',
  'assessments.absent.mark',
  'assessments.absent.revoke',
  'assessments316.view',
  'assessments316.create',
  'assessments316.edit',
  'assessments316.delete',
  'assessments316.pending.view',
  'assessments316.appeared.view',
  'assessments316.absent.view',
  'assessments316.absent.mark',
  'assessments316.absent.revoke',
  'asset_categories.view',
  'asset_categories.create',
  'asset_categories.edit',
  'asset_categories.delete',
  'asset_items.view',
  'asset_items.create',
  'asset_items.edit',
  'asset_items.delete',
  'asset_list.view',
  'asset_list.create',
  'asset_list.edit',
  'asset_list.delete',
  'asset_transfer.view',
  'asset_transfer.create',
  'asset_transfer.cancel',
  'asset_receive.view',
  'asset_receive.receive',
  'asset_receive.reject',
  'asset_tracking.view',
  'asset_reports.view',
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
  'attendance.view',
  'attendance.students.view',
  'attendance.students.monthly.view',
  'attendance.management.monthly.view',
  'attendance.teachers.monthly.view',
  'attendance.teacher.self.view',
  'attendance.management.self.view',
  'attendance.mark',
  'attendance.edit',
  'attendance.holiday',
  'navigation.edit',
];

export const DEFAULT_TEACHERS_ROLE_NAME = 'Teachers';

export const DEFAULT_TEACHERS_ROLE_PERMISSIONS = [
  'teachers.view',
  'teachers.edit',
  'students.view',
  'students.edit',
  'classes.view',
  'subjects.view',
  'assessments.view',
  'assessments.create',
  'assessments.edit',
  'assessments.delete',
  'assessments.pending.view',
  'assessments.appeared.view',
  'assessments.pending.appear',
  'assessments.appeared.reappear',
  'assessments.absent.view',
  'assessments.absent.mark',
  'assessments.absent.revoke',
  'assessments316.pending.view',
  'assessments316.appeared.view',
  'assessments316.absent.view',
  'assessments316.absent.mark',
  'assessments316.absent.revoke',
  'class_content.edit',
  'results.view',
  'results.export',
  'attendance.view',
  'attendance.mark',
  'attendance.edit',
  'students.export',
  'teachers.export',
];

const TEACHER_PERMISSIONS = DEFAULT_TEACHERS_ROLE_PERMISSIONS;

const normalizePermission = (value) => String(value || '').trim().toLowerCase();

const PERMISSION_ALIASES = {
  'attendance.students.view': ['attendance.view'],
  'attendance.teacher.self.view': ['attendance.view'],
  'attendance.management.self.view': ['attendance.view'],
  'assessments.pending.appear': ['assessments.pending.attempt'],
  'assessments.pending.attempt': ['assessments.pending.appear'],
  'assessments316.pending.appear': ['assessments316.pending.attempt', 'assessments.pending.appear', 'assessments.pending.attempt'],
  'assessments316.pending.attempt': ['assessments316.pending.appear', 'assessments.pending.appear', 'assessments.pending.attempt'],
  'assessments.appeared.reappear': ['assessments.appeared.reattempt'],
  'assessments.appeared.reattempt': ['assessments.appeared.reappear'],
};

const uniqueStrings = (values = []) => {
  const cleaned = values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
};

const validatePermissions = (permissions = []) => {
  const normalized = uniqueStrings(permissions.map(normalizePermission));
  return normalized.filter((permission) => permission === '*' || permission.includes('.'));
};

const ensurePermissionRecords = async (permissionKeys = []) => {
  const keys = uniqueStrings(permissionKeys.map(normalizePermission));
  if (!keys.length) return [];

  await prisma.permission.createMany({
    data: keys.map((key) => ({
      id: permissionRecordId(key),
      key,
      label: permissionLabel(key),
      category: permissionCategory(key),
    })),
    skipDuplicates: true,
  });

  return prisma.permission.findMany({ where: { key: { in: keys } } });
};

export const getPermissionCatalog = async () => {
  await ensurePermissionRecords(ADMIN_PERMISSIONS);
  return prisma.permission.findMany({
    where: { status: true },
    select: { key: true, label: true, category: true, description: true },
    orderBy: [{ category: 'asc' }, { label: 'asc' }],
  });
};

const roleInclude = {
  permissions: {
    include: { permission: { select: { key: true, status: true } } },
  },
};

const toPublicRole = (role) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  status: role.status,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
  permissions: role.permissions
    .filter((item) => item.permission.status)
    .map((item) => item.permission.key),
});

export const getAllCustomRoles = async () => {
  const roles = await prisma.customRole.findMany({ include: roleInclude, orderBy: { createdAt: 'desc' } });
  return roles.map(toPublicRole);
};

export const ensureTeachersRoleExists = async () => {
  const roles = await getAllCustomRoles();
  const existing = roles.find((item) => String(item.name || '').trim().toLowerCase() === DEFAULT_TEACHERS_ROLE_NAME.toLowerCase() && item.status !== false);
  if (existing) return existing;

  return createCustomRole({
    name: DEFAULT_TEACHERS_ROLE_NAME,
    description: 'Default role for teachers.',
    permissions: DEFAULT_TEACHERS_ROLE_PERMISSIONS,
  });
};

export const createCustomRole = async ({ name, description = '', permissions = [] }) => {
  const roleName = String(name || '').trim();
  if (!roleName) throw new Error('Role name is required');

  const duplicate = await prisma.customRole.findFirst({
    where: { name: { equals: roleName, mode: 'insensitive' } },
    select: { id: true },
  });
  if (duplicate) throw new Error('Role name already exists');

  const permissionKeys = validatePermissions(permissions);
  const permissionRecords = await ensurePermissionRecords(permissionKeys);
  const role = await prisma.customRole.create({
    data: {
      id: `role_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: roleName,
      description: String(description || '').trim(),
      permissions: {
        create: permissionRecords
          .filter((permission) => permissionKeys.includes(permission.key))
          .map((permission) => ({ permission: { connect: { id: permission.id } } })),
      },
    },
    include: roleInclude,
  });
  return toPublicRole(role);
};

export const updateCustomRole = async (roleId, { name, description, permissions, status }) => {
  const existing = await prisma.customRole.findUnique({ where: { id: roleId }, include: roleInclude });
  if (!existing) throw new Error('Role not found');

  const nextName = name !== undefined ? String(name || '').trim() : existing.name;
  if (!nextName) throw new Error('Role name is required');

  const duplicate = await prisma.customRole.findFirst({
    where: { id: { not: roleId }, name: { equals: nextName, mode: 'insensitive' } },
    select: { id: true },
  });
  if (duplicate) throw new Error('Role name already exists');

  const permissionKeys = permissions !== undefined
    ? validatePermissions(permissions)
    : existing.permissions.filter((item) => item.permission.status).map((item) => item.permission.key);
  const permissionRecords = await ensurePermissionRecords(permissionKeys);

  await prisma.$transaction(async (tx) => {
    await tx.customRole.update({
      where: { id: roleId },
      data: {
        name: nextName,
        ...(description !== undefined ? { description: String(description || '').trim() } : {}),
        ...(status !== undefined ? { status: Boolean(status) } : {}),
      },
    });
    if (permissions !== undefined) {
      await tx.customRolePermission.deleteMany({ where: { roleId } });
      if (permissionRecords.length) {
        await tx.customRolePermission.createMany({
          data: permissionRecords
            .filter((permission) => permissionKeys.includes(permission.key))
            .map((permission) => ({ roleId, permissionId: permission.id })),
          skipDuplicates: true,
        });
      }
    }
  });

  return toPublicRole(await prisma.customRole.findUnique({ where: { id: roleId }, include: roleInclude }));
};

export const deleteCustomRole = async (roleId) => {
  const result = await prisma.customRole.deleteMany({ where: { id: roleId } });
  if (!result.count) throw new Error('Role not found');
};

export const getUserAccessAssignment = async (userId) => {
  const assignment = await prisma.userAccessAssignment.findUnique({
    where: { userId },
    include: { centers: { select: { centerId: true } } },
  });
  return {
    roleId: assignment?.roleId || null,
    centerIds: uniqueStrings((assignment?.centers || []).map((item) => item.centerId)),
    updatedAt: assignment?.updatedAt || null,
  };
};

export const setUserAccessAssignment = async (userId, { roleId = null, centerIds = [] }) => {
  const normalizedCenterIds = uniqueStrings(centerIds);
  await prisma.$transaction(async (tx) => {
    await tx.userAccessAssignment.upsert({
      where: { userId },
      create: { userId, roleId },
      update: { roleId },
    });
    await tx.userAccessAssignmentCenter.deleteMany({ where: { userId } });
    if (normalizedCenterIds.length) {
      await tx.userAccessAssignmentCenter.createMany({
        data: normalizedCenterIds.map((centerId) => ({ userId, centerId })),
        skipDuplicates: true,
      });
    }
  });
  return getUserAccessAssignment(userId);
};

export const deleteUserAccessAssignment = async (userId) => {
  await prisma.userAccessAssignment.deleteMany({ where: { userId } });
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
      management: {
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
      user.teacher?.centerId,
    ]);
  } else if (isTeacher) {
    const allRoles = await getAllCustomRoles();
    const assignment = await getUserAccessAssignment(user.id);
    const teacherRole = allRoles.find((item) => item.id === assignment.roleId && item.status !== false)
      || allRoles.find((item) => String(item.name || '').trim().toLowerCase() === DEFAULT_TEACHERS_ROLE_NAME.toLowerCase() && item.status !== false)
      || await ensureTeachersRoleExists();

    customRole = teacherRole;
    grantedPermissions = validatePermissions(teacherRole?.permissions || TEACHER_PERMISSIONS);

    if (teacherRole && (!assignment.roleId || assignment.roleId !== teacherRole.id)) {
      await setUserAccessAssignment(user.id, {
        roleId: teacherRole.id,
        centerIds: [user.teacher?.centerId || user.centerId || null].filter(Boolean),
      });
    }

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

  const isAuthorized = Array.isArray(requiredPermission)
    ? requiredPermission.some((permission) => actor.hasPermission(permission))
    : actor.hasPermission(requiredPermission);
  if (!isAuthorized) {
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
