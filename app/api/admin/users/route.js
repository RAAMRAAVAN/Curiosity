import bcrypt from "bcryptjs";
import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { validateSignup } from "@/features/auth/auth.validation";
import { canAccessAdminArea } from "@/lib/roleAccess";

const roleMap = {
  student: "STUDENT",
  teacher: "TEACHER",
  admin: "ADMIN",
  parent: "PARENT",
};

export async function GET(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dob: true,
      gender: true,
      phone: true,
      address: true,
      schoolName: true,
      studyingClass: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return ApiResponse.success(users);
}

export async function POST(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  const body = await req.json();
  validateSignup(body);

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existing) {
    return ApiResponse.error("Email already exists", 400);
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hashedPassword,
      dob: new Date(body.dob),
      gender: body.gender,
      phone: body.phone,
      address: body.address,
      schoolName: body.schoolName,
      studyingClass: body.studyingClass,
      role: roleMap[body.userType] || "STUDENT",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dob: true,
      gender: true,
      phone: true,
      address: true,
      schoolName: true,
      studyingClass: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return ApiResponse.success(user, "User created successfully.");
}
