import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { canAccessAdminArea } from "@/lib/roleAccess";
import { requireAdminPermission } from '@/lib/adminRbac';

const validPreferences = ["contents", "assessments"];

export async function GET(req) {
  const authUser = getUserFromRequest(req);

  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  const setting = await prisma.appSetting.findUnique({
    where: { key: "admin.classNavigationPreference" },
  });

  return ApiResponse.success({
    preference: setting?.value || "contents",
  });
}

export async function PATCH(req) {
  const auth = await requireAdminPermission(req, 'navigation.edit');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  const body = await req.json().catch(() => ({}));
  const preference = body.preference;

  if (!validPreferences.includes(preference)) {
    return ApiResponse.error("Invalid navigation preference", 400);
  }

  await prisma.appSetting.upsert({
    where: { key: "admin.classNavigationPreference" },
    update: { value: preference },
    create: { key: "admin.classNavigationPreference", value: preference },
  });

  return ApiResponse.success({ preference });
}
