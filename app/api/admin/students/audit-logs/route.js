import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from "@/lib/adminRbac";
import { buildPaginationMeta, parsePagination } from "@/lib/pagination";
import { canViewStudentAudit } from "@/lib/studentAuditAccess";

export async function GET(req) {
  const auth = await requireAdminPermission(req, "students.view");
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const actor = await prisma.user.findUnique({
      where: { id: auth.actor.userId },
      select: { role: true, email: true },
    });
    if (!auth.actor.isAdmin || !canViewStudentAudit(actor)) {
      return ApiResponse.error("Only the designated administrator can view student activity logs.", 403);
    }

    const pagination = parsePagination(req, { defaultSize: 25 }) || {
      page: 1,
      pageSize: 25,
      skip: 0,
      take: 25,
    };
    const params = new URL(req.url).searchParams;
    const where = {
      ...(params.get("studentId") ? { studentId: params.get("studentId") } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.studentAuditLog.count({ where }),
      prisma.studentAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return ApiResponse.paginated(logs, buildPaginationMeta(total, pagination));
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to load student activity history.", 500, error);
  }
}
