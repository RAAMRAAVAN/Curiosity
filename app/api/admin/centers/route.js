import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';
import { isValidCenterSlug, normalizeCenterSlug } from "@/lib/centerSlug";

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'centers.view');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    let centers = await prisma.center.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (!auth.actor.isAdmin) {
      centers = centers.filter((center) => auth.actor.canAccessCenter(center.id));
    }

    return ApiResponse.success(centers);
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to load centers", 500, error);
  }
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'centers.create');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const body = await req.json();
    const slug = normalizeCenterSlug(body.slug);
    if (!body.name || !isValidCenterSlug(slug)) {
      return ApiResponse.error("Name and a unique 3-letter uppercase slug are required", 400);
    }

    const center = await prisma.center.create({
      data: {
        name: body.name,
        slug,
        status: body.status !== undefined ? Boolean(body.status) : true,
      },
    });

    return ApiResponse.success(center, "Center created successfully.");
  } catch (error) {
    console.error(error);
    if (error?.code === "P2002") {
      return ApiResponse.error("This center slug is already in use", 409);
    }
    return ApiResponse.error("Unable to create center", 500, error);
  }
}
