import bcrypt from "bcryptjs";
import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { validateSignup } from "@/features/auth/auth.validation";
import { canAccessAdminArea, canManageAdminData } from "@/lib/roleAccess";
import { authRepository } from "@/features/auth/auth.repository";

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

function mapUser(user) {
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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
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
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  if (!canManageAdminData(authUser)) {
    return ApiResponse.error("Forbidden", 403);
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teacher: true,
      student: true,
      admin: true,
      management: true,
      parent: true,
    },
  });

  return ApiResponse.success(users.map(mapUser));
}

export async function POST(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  if (!canManageAdminData(authUser)) {
    return ApiResponse.error("Forbidden", 403);
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

  const profileData = buildProfileData(body, role);
  if (Object.keys(profileData).length > 0 || role === "TEACHER") {
    await authRepository.createRoleProfile(user.id, role, {
      ...profileData,
      centerId: body.centerId || null,
      ...(role === "TEACHER" ? { name: user.name } : {}),
    });
  }

  const createdUser = await authRepository.findById(user.id);

  return ApiResponse.success(mapUser(createdUser), "User created successfully.");
}
