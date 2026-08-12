import bcrypt from "bcryptjs";
import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { deleteUserAccessAssignment, getAllCustomRoles, getUserAccessAssignment, requireAdminPermission, setUserAccessAssignment } from '@/lib/adminRbac';

const roleMap = {
  student: "STUDENT",
  teacher: "TEACHER",
  admin: "ADMIN",
  management: "MANAGEMENT",
  parent: "PARENT",
};

const validRoles = ["student", "teacher", "admin", "management", "parent"];

function getProfile(user) {
  return (
    user.teacher ||
    user.student ||
    user.admin ||
    user.management ||
    user.parent ||
    {}
  );
}

function mapUser(user, accessAssignment = null, customRole = null) {
  const profile = getProfile(user);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    dob: profile.dob,
    gender: profile.gender,
    phone: profile.phone,
    address: profile.address,
    schoolName: profile.schoolName,
    studyingClass: profile.studyingClass,
    customRoleId: accessAssignment?.roleId || null,
    customRoleName: customRole?.name || null,
    assignedCenterIds: accessAssignment?.centerIds || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function resolveUserCenterId(user) {
  const profile = getProfile(user);
  return profile.centerId || user.centerId || null;
}

function buildProfileData(body, role) {
  const profileData = {};

  if (body.dob !== undefined) {
    profileData.dob = body.dob ? new Date(body.dob) : null;
  }
  if (body.gender !== undefined) {
    profileData.gender = body.gender;
  }
  if (body.phone !== undefined) {
    profileData.phone = body.phone;
  }
  if (body.address !== undefined) {
    profileData.address = body.address;
  }

  if (role !== "TEACHER") {
    if (body.schoolName !== undefined) {
      profileData.schoolName = body.schoolName;
    }
    if (body.studyingClass !== undefined) {
      profileData.studyingClass = body.studyingClass;
    }
  }

  return profileData;
}

async function deleteExistingProfiles(userId) {
  await prisma.teacher.deleteMany({ where: { userId } });
  await prisma.student.deleteMany({ where: { userId } });
  await prisma.admin.deleteMany({ where: { userId } });
  await prisma.management.deleteMany({ where: { userId } });
  await prisma.parent.deleteMany({ where: { userId } });
}

async function upsertProfile(userId, role, profileData, userName) {
  if (role === "TEACHER") {
    return prisma.teacher.upsert({
      where: { userId },
      create: { userId, name: userName, ...profileData },
      update: profileData,
    });
  }

  if (role === "STUDENT") {
    return prisma.student.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    });
  }

  if (role === "ADMIN") {
    return prisma.admin.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    });
  }

  if (role === "MANAGEMENT") {
    return prisma.management.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    });
  }

  if (role === "PARENT") {
    return prisma.parent.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    });
  }

  return null;
}

export async function GET(req, { params }) {
  const auth = await requireAdminPermission(req, 'users.view');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      teacher: true,
      student: true,
      admin: true,
      management: true,
      parent: true,
    },
  });

  if (!user) {
    return ApiResponse.error("User not found", 404);
  }

  if (!auth.actor.isAdmin && !auth.actor.canAccessCenter(resolveUserCenterId(user))) {
    return ApiResponse.error('Forbidden', 403);
  }

  const [assignment, roles] = await Promise.all([
    getUserAccessAssignment(user.id),
    getAllCustomRoles(),
  ]);
  const customRole = roles.find((role) => role.id === assignment?.roleId) || null;

  return ApiResponse.success(mapUser(user, assignment, customRole));
}

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'users.edit');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const body = await req.json();
  const updateData = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.userType !== undefined) {
    if (!validRoles.includes(body.userType)) {
      return ApiResponse.error("Invalid user type.", 400);
    }
    updateData.role = roleMap[body.userType];
  }
  if (body.password) {
    updateData.password = await bcrypt.hash(body.password, 10);
  }

  if (body.email) {
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing && existing.id !== params.id) {
      return ApiResponse.error("Email already in use.", 400);
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      teacher: true,
      student: true,
      admin: true,
      management: true,
      parent: true,
    },
  });

  if (!existingUser) {
    return ApiResponse.error("User not found", 404);
  }

  if (!auth.actor.isAdmin && !auth.actor.canAccessCenter(resolveUserCenterId(existingUser))) {
    return ApiResponse.error('Forbidden', 403);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
  });

  const role = updateData.role || existingUser.role;
  const profileData = buildProfileData(body, role);
  const name = body.name ?? existingUser.name;

  if (body.centerId !== undefined) {
    profileData.centerId = body.centerId || null;
  }

  if (body.userType && role !== existingUser.role) {
    await deleteExistingProfiles(params.id);
  }

  if (Object.keys(profileData).length > 0 || role === "TEACHER") {
    await upsertProfile(params.id, role, profileData, name);
  }

  if (role === 'MANAGEMENT') {
    const centerIds = Array.isArray(body.assignedCenterIds) ? body.assignedCenterIds : [];

    if (!auth.actor.isAdmin && centerIds.some((centerId) => !auth.actor.canAccessCenter(centerId))) {
      return ApiResponse.error('Forbidden: one or more assigned centers are outside your scope.', 403);
    }

    if (body.customRoleId) {
      const roles = await getAllCustomRoles();
      const selectedRole = roles.find((item) => item.id === body.customRoleId && item.status !== false);
      if (!selectedRole) {
        return ApiResponse.error('Selected custom role is invalid.', 400);
      }
    }

    await setUserAccessAssignment(params.id, {
      roleId: body.customRoleId || null,
      centerIds,
    });
  } else {
    await deleteUserAccessAssignment(params.id);
  }

  const updatedUser = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      teacher: true,
      student: true,
      admin: true,
      management: true,
      parent: true,
    },
  });

  const [assignment, roles] = await Promise.all([
    getUserAccessAssignment(updatedUser.id),
    getAllCustomRoles(),
  ]);
  const customRole = roles.find((item) => item.id === assignment?.roleId) || null;

  return ApiResponse.success(
    mapUser(updatedUser, assignment, customRole),
    "User updated successfully."
  );
}

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'users.delete');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      teacher: true,
      student: true,
      admin: true,
      management: true,
      parent: true,
    },
  });

  if (!targetUser) {
    return ApiResponse.error('User not found', 404);
  }

  if (!auth.actor.isAdmin && !auth.actor.canAccessCenter(resolveUserCenterId(targetUser))) {
    return ApiResponse.error('Forbidden', 403);
  }

  await prisma.user.delete({
    where: { id: params.id },
  });

  await deleteUserAccessAssignment(params.id);

  return ApiResponse.success(null, "User deleted successfully.");
}
