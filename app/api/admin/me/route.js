import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";

export async function GET(req) {
  const authUser = getUserFromRequest(req);

  if (!authUser || authUser.role !== "ADMIN") {
    return ApiResponse.error("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
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
    return ApiResponse.error("Unauthorized", 401);
  }

  return ApiResponse.success(user, "Admin authenticated");
}
