import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from "@/lib/adminRbac";
import { buildPaginationMeta, parsePagination } from "@/lib/pagination";
import { canViewStudentAudit } from "@/lib/studentAuditAccess";

export async function GET(req) {
  const auth = await requireAdminPermission(req, "attendance.students.view");
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const actor = await prisma.user.findUnique({
      where: { id: auth.actor.userId },
      select: { role: true, email: true },
    });
    if (!auth.actor.isAdmin || !canViewStudentAudit(actor)) {
      return ApiResponse.error("Only the designated administrator can view attendance logs.", 403);
    }

    const pagination = parsePagination(req, { defaultSize: 25 }) || {
      page: 1,
      pageSize: 25,
      skip: 0,
      take: 25,
    };
    const params = new URL(req.url).searchParams;
    const dateFilter = params.get("date");
    if (dateFilter) {
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateFilter)
        ? new Date(`${dateFilter}T00:00:00.000Z`)
        : null;
      if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
        return ApiResponse.error("Invalid attendance date filter.", 400);
      }
    }
    const studentId = params.get("studentId");

    const [countRows, logs] = await Promise.all([
      prisma.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM "student_attendance_audit_logs"
        WHERE (${studentId}::text IS NULL OR "student_id" = ${studentId})
          AND (${dateFilter}::date IS NULL OR "attendance_date" = ${dateFilter}::date)
      `,
      prisma.$queryRaw`
        SELECT
          "id",
          "student_id" AS "studentId",
          "student_name" AS "studentName",
          "attendance_date" AS "attendanceDate",
          "center_id" AS "centerId",
          "center_name" AS "centerName",
          "class_id" AS "classId",
          "class_name" AS "className",
          "actor_id" AS "actorId",
          "actor_name" AS "actorName",
          "action",
          "before_status" AS "beforeStatus",
          "after_status" AS "afterStatus",
          "created_at" AS "createdAt"
        FROM "student_attendance_audit_logs"
        WHERE (${studentId}::text IS NULL OR "student_id" = ${studentId})
          AND (${dateFilter}::date IS NULL OR "attendance_date" = ${dateFilter}::date)
        ORDER BY "attendance_date" DESC, "created_at" DESC
        LIMIT ${pagination.take} OFFSET ${pagination.skip}
      `,
    ]);

    return ApiResponse.paginated(logs, buildPaginationMeta(countRows[0]?.total || 0, pagination));
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to load attendance history.", 500, error);
  }
}
