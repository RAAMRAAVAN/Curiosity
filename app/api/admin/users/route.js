import bcrypt from "bcryptjs";
import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { validateSignup } from "@/features/auth/auth.validation";
import { authRepository } from "@/features/auth/auth.repository";
import { getAllCustomRoles, getUserAccessAssignment, requireAdminPermission, setUserAccessAssignment } from '@/lib/adminRbac';

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

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'users.view');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const users = await prisma.user.findMany({
    where: {
      role: { not: "STUDENT" },
    },
    orderBy: { createdAt: "desc" },
    include: {
      teacher: true,
      student: true,
      admin: true,
      management: true,
      parent: true,
    },
  });

  const [roles, assignments] = await Promise.all([
    getAllCustomRoles(),
    Promise.all(users.map((user) => getUserAccessAssignment(user.id))),
  ]);

  const roleById = new Map(roles.map((role) => [role.id, role]));

  const visibleUsers = auth.actor.isAdmin
    ? users
    : users.filter((user, index) => {
        // Management users may be assigned to multiple centers via access assignments.
        // Use the pre-fetched assignments to determine visibility for MANAGEMENT users.
        const roleName = String(user.role || '').toUpperCase();
        if (roleName === 'MANAGEMENT') {
          const assignment = assignments[index] || {};
          const centerIds = Array.isArray(assignment.centerIds) ? assignment.centerIds : [];
          return centerIds.some((centerId) => auth.actor.canAccessCenter(centerId));
        }

        return auth.actor.canAccessCenter(resolveUserCenterId(user));
      });

  return ApiResponse.success(
    visibleUsers.map((user) => {
      const index = users.findIndex((item) => item.id === user.id);
      const assignment = assignments[index];
      const customRole = roleById.get(assignment?.roleId) || null;
      return mapUser(user, assignment, customRole);
    })
  );
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'users.create');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const body = await req.json();
  body.userType = body.userType?.toLowerCase() || "student";

  await validateSignup(body, { allowRoles: validRoles });

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existing) {
    return ApiResponse.error("Email already exists", 400);
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);
  const role = roleMap[body.userType] || "STUDENT";

  const user = await authRepository.createUser({
    name: body.name,
    email: body.email,
    password: hashedPassword,
    role,
    centerId: body.centerId || null,
  });

  const createdCenterId = body.centerId || null;
  if (!auth.actor.isAdmin && createdCenterId && !auth.actor.canAccessCenter(createdCenterId)) {
    await prisma.user.delete({ where: { id: user.id } });
    return ApiResponse.error('Forbidden: center is not assigned to this user.', 403);
  }

  const profileData = buildProfileData(body, role);
  if (Object.keys(profileData).length > 0 || role === "TEACHER") {
    await authRepository.createRoleProfile(user.id, role, {
      ...profileData,
      centerId: body.centerId || null,
      ...(role === "TEACHER" ? { name: user.name } : {}),
    });
  }

  const createdUser = await authRepository.findById(user.id);

  if (String(createdUser.role || '').toUpperCase() === 'MANAGEMENT') {
    const centerIds = Array.isArray(body.assignedCenterIds) ? body.assignedCenterIds : [];

    if (!auth.actor.isAdmin && centerIds.some((centerId) => !auth.actor.canAccessCenter(centerId))) {
      await prisma.user.delete({ where: { id: createdUser.id } });
      return ApiResponse.error('Forbidden: one or more assigned centers are outside your scope.', 403);
    }

    if (body.customRoleId) {
      const roles = await getAllCustomRoles();
      const selectedRole = roles.find((item) => item.id === body.customRoleId && item.status !== false);
      if (!selectedRole) {
        await prisma.user.delete({ where: { id: createdUser.id } });
        return ApiResponse.error('Selected custom role is invalid.', 400);
      }
    }

    await setUserAccessAssignment(createdUser.id, {
      roleId: body.customRoleId || null,
      centerIds,
    });
  }

  const assignment = await getUserAccessAssignment(createdUser.id);
  const roles = await getAllCustomRoles();
  const customRole = roles.find((role) => role.id === assignment?.roleId) || null;

  return ApiResponse.success(
    mapUser(createdUser, assignment, customRole),
    "User created successfully."
  );
}
