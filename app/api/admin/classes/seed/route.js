import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { canAccessAdminArea, hasAnyRole } from "@/lib/roleAccess";

export async function POST(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  if (!hasAnyRole(authUser, ["ADMIN"])) {
    return ApiResponse.error("Forbidden", 403);
  }

  const classNumbers = Array.from({ length: 12 }, (_, i) => String(i + 1));

  try {
    const results = [];
    if (!prisma["class"]) {
      return ApiResponse.error("Prisma model 'Class' not available. Run `npx prisma generate` and apply migrations.", 500);
    }
    for (const num of classNumbers) {
      const up = await prisma["class"].upsert({
        where: { className: num },
        update: { className: num },
        create: { className: num, icon: null },
      });
      results.push(up);
    }
    return ApiResponse.success(results, "Seeded classes 1-12");
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to seed classes", 500, err);
  }
}
