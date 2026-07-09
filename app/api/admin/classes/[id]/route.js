import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";

export async function DELETE(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "ADMIN") {
    return ApiResponse.error("Unauthorized", 401);
  }

  const { id } = await params;

  try {
    if (!prisma["class"]) {
      return ApiResponse.error("Prisma model 'Class' not available. Run `npx prisma generate` and apply migrations.", 500);
    }
    await prisma["class"].delete({ where: { id } });
    return ApiResponse.success(null, "Class deleted");
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to delete class", 500, err);
  }
}

export async function PATCH(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "ADMIN") {
    return ApiResponse.error("Unauthorized", 401);
  }

  const { id } = await params;
  const body = await req.json();

  try {
    if (!prisma["class"]) {
      return ApiResponse.error("Prisma model 'Class' not available. Run `npx prisma generate` and apply migrations.", 500);
    }
    const updated = await prisma["class"].update({ where: { id }, data: { className: body.className, icon: body.icon || null } });
    return ApiResponse.success(updated, "Class updated");
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to update class", 500, err);
  }
}

