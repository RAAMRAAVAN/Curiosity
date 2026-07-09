import bcrypt from "bcryptjs";
import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";

const roleMap = {
  student: "STUDENT",
  teacher: "TEACHER",
  admin: "ADMIN",
  parent: "PARENT",
};

const validRoles = ["student", "teacher", "admin", "parent"];

export async function GET(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "ADMIN") {
    return ApiResponse.error("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
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

  if (!user) {
    return ApiResponse.error("User not found", 404);
  }

  return ApiResponse.success(user);
}

export async function PATCH(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "ADMIN") {
    return ApiResponse.error("Unauthorized", 401);
  }

  const body = await req.json();
  const updateData = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.dob !== undefined) updateData.dob = body.dob ? new Date(body.dob) : null;
  if (body.gender !== undefined) updateData.gender = body.gender;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.address !== undefined) updateData.address = body.address;
  if (body.schoolName !== undefined) updateData.schoolName = body.schoolName;
  if (body.studyingClass !== undefined) updateData.studyingClass = body.studyingClass;

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

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
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

  return ApiResponse.success(user, "User updated successfully.");
}

export async function DELETE(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "ADMIN") {
    return ApiResponse.error("Unauthorized", 401);
  }

  await prisma.user.delete({
    where: { id: params.id },
  });

  return ApiResponse.success(null, "User deleted successfully.");
}
