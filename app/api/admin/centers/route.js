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
    const centers = await prisma.center.findMany({
      orderBy: { createdAt: "asc" },
    });

    return ApiResponse.success(centers);
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to load centers", 500, error);
  }
}

export async function POST(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    if (!body.name || !body.slug) {
      return ApiResponse.error("Name and slug are required", 400);
    }

    const center = await prisma.center.create({
      data: {
        name: body.name,
        slug: body.slug,
        status: body.status !== undefined ? Boolean(body.status) : true,
      },
    });

    return ApiResponse.success(center, "Center created successfully.");
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to create center", 500, error);
  }
}
