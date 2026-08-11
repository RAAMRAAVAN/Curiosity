import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { canAccessAdminArea } from "@/lib/roleAccess";

export async function PATCH(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const updateData = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.status !== undefined) updateData.status = Boolean(body.status);

    const center = await prisma.center.update({
      where: { id: params.id },
      data: updateData,
    });

    return ApiResponse.success(center, "Center updated successfully.");
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to update center", 500, error);
  }
}

export async function DELETE(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  try {
    await prisma.center.delete({ where: { id: params.id } });
    return ApiResponse.success(null, "Center deleted successfully.");
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to delete center", 500, error);
  }
}
