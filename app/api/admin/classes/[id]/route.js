import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'classes.delete');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const { id } = await params;

  try {
    if (!prisma["class"]) {
      return ApiResponse.error("Prisma model 'Class' not available. Run `npx prisma generate` and apply migrations.", 500);
    }
    const classRecord = await prisma['class'].findUnique({ where: { id } });
    if (!classRecord) {
      return ApiResponse.error('Class not found', 404);
    }

    const classCenterId = classRecord.centerId == null ? null : String(classRecord.centerId).trim();
    if (!auth.actor.isAdmin) {
      const assignedCenterIds = (Array.isArray(auth.actor.assignedCenterIds) ? auth.actor.assignedCenterIds : [])
        .map((centerId) => String(centerId).trim())
        .filter(Boolean);

      if (!classCenterId || (!assignedCenterIds.includes(classCenterId) && !auth.actor.canAccessCenter(classCenterId))) {
        return ApiResponse.error('Forbidden', 403);
      }
    }

    await prisma["class"].delete({ where: { id } });
    return ApiResponse.success(null, "Class deleted");
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to delete class", 500, err);
  }
}

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'classes.edit');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const { id } = await params;
  const body = await req.json();

  try {
    if (!prisma["class"]) {
      return ApiResponse.error("Prisma model 'Class' not available. Run `npx prisma generate` and apply migrations.", 500);
    }
    const classRecord = await prisma['class'].findUnique({ where: { id } });
    if (!classRecord) {
      return ApiResponse.error('Class not found', 404);
    }

    const nextCenterId = body.centerId !== undefined ? body.centerId : classRecord.centerId;
    const normalizedNextCenterId = nextCenterId == null ? null : String(nextCenterId).trim();
    if (!auth.actor.isAdmin) {
      const assignedCenterIds = (Array.isArray(auth.actor.assignedCenterIds) ? auth.actor.assignedCenterIds : [])
        .map((centerId) => String(centerId).trim())
        .filter(Boolean);

      if (normalizedNextCenterId && !assignedCenterIds.includes(normalizedNextCenterId) && !auth.actor.canAccessCenter(normalizedNextCenterId)) {
        return ApiResponse.error('Forbidden: center is not assigned to this user.', 403);
      }
    }

    const updated = await prisma["class"].update({ where: { id }, data: { className: body.className, icon: body.icon || null, centerId: body.centerId !== undefined ? (body.centerId || null) : undefined } });
    return ApiResponse.success(updated, "Class updated");
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to update class", 500, err);
  }
}

