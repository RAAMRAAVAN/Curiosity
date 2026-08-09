import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { canAccessAdminArea } from "@/lib/roleAccess";

export async function GET(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  try {
    if (!prisma["class"]) {
      return ApiResponse.error("Prisma model 'Class' not available. Run `npx prisma generate` and apply migrations.", 500);
    }
    const classes = await prisma["class"].findMany({ orderBy: { createdAt: "asc" } });
    return ApiResponse.success(classes);
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to load classes", 500, err);
  }
}

export async function POST(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  const body = await req.json();
  if (!body.className) return ApiResponse.error("className is required", 400);

  try {
    if (!prisma["class"]) {
      return ApiResponse.error("Prisma model 'Class' not available. Run `npx prisma generate` and apply migrations.", 500);
    }
    const created = await prisma["class"].create({ data: { className: body.className, icon: body.icon || null } });
    return ApiResponse.success(created, "Class created");
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to create class", 500, err);
  }
}
