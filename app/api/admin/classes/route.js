import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'classes.view');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    if (!prisma["class"]) {
      return ApiResponse.error("Prisma model 'Class' not available. Run `npx prisma generate` and apply migrations.", 500);
    }
    let classes = await prisma["class"].findMany({ orderBy: { createdAt: "asc" } });
    if (!auth.actor.isAdmin) {
      const accessibleCenterIds = new Set(
        (Array.isArray(auth.actor.assignedCenterIds) ? auth.actor.assignedCenterIds : []).map((id) => String(id).trim()).filter(Boolean)
      );
      classes = classes.filter((item) => {
        const centerId = item?.centerId == null ? null : String(item.centerId).trim();
        return !centerId || accessibleCenterIds.has(centerId) || auth.actor.canAccessCenter(centerId);
      });
    }
    return ApiResponse.success(classes);
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to load classes", 500, err);
  }
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'classes.create');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const body = await req.json();
  if (!body.className) return ApiResponse.error("className is required", 400);

  const requestedCenterId = body.centerId == null ? null : String(body.centerId).trim();
  if (!auth.actor.isAdmin) {
    const assignedCenterIds = (Array.isArray(auth.actor.assignedCenterIds) ? auth.actor.assignedCenterIds : [])
      .map((id) => String(id).trim())
      .filter(Boolean);

    if (requestedCenterId && !assignedCenterIds.includes(requestedCenterId) && !auth.actor.canAccessCenter(requestedCenterId)) {
      return ApiResponse.error('Forbidden: center is not assigned to this user.', 403);
    }

    if (!requestedCenterId && assignedCenterIds.length === 0) {
      return ApiResponse.error('Forbidden: center is not assigned to this user.', 403);
    }
  }

  try {
    if (!prisma["class"]) {
      return ApiResponse.error("Prisma model 'Class' not available. Run `npx prisma generate` and apply migrations.", 500);
    }
    const created = await prisma["class"].create({ data: { className: body.className, icon: body.icon || null, centerId: body.centerId || null } });
    return ApiResponse.success(created, "Class created");
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to create class", 500, err);
  }
}
