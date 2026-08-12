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
      classes = classes.filter((item) => !item.centerId || auth.actor.canAccessCenter(item.centerId));
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

  if (!auth.actor.isAdmin && !auth.actor.canAccessCenter(body.centerId)) {
    return ApiResponse.error('Forbidden: center is not assigned to this user.', 403);
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
