import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'centers.edit');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const body = await req.json();
    const updateData = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.status !== undefined) updateData.status = Boolean(body.status);

    const existingCenter = await prisma.center.findUnique({ where: { id: params.id } });
    if (!existingCenter) {
      return ApiResponse.error('Center not found', 404);
    }

    if (!auth.actor.isAdmin && !auth.actor.canAccessCenter(existingCenter.id)) {
      return ApiResponse.error('Forbidden', 403);
    }

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
  const auth = await requireAdminPermission(req, 'centers.delete');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const existingCenter = await prisma.center.findUnique({ where: { id: params.id } });
    if (!existingCenter) {
      return ApiResponse.error('Center not found', 404);
    }

    if (!auth.actor.isAdmin && !auth.actor.canAccessCenter(existingCenter.id)) {
      return ApiResponse.error('Forbidden', 403);
    }

    await prisma.center.delete({ where: { id: params.id } });
    return ApiResponse.success(null, "Center deleted successfully.");
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to delete center", 500, error);
  }
}
