import { prisma } from "@/server/prisma";
import { requireAdminPermission } from "@/lib/adminRbac";
import { ApiResponse } from "@/utils/apiResponse";
import { getTeacherAssignedClassIds } from "@/lib/teacherClassAccess";

function dateValue(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function todayValue() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function teacherCenterId(actor) {
  if (!actor.isTeacher) return null;
  const teacher = await prisma.teacher.findUnique({
    where: { userId: actor.userId },
    select: { centerId: true },
  });
  return teacher?.centerId || null;
}

async function accessibleCenterIds(actor) {
  const teacherCenter = await teacherCenterId(actor);
  const centers = await prisma.center.findMany({
    where: teacherCenter ? { id: teacherCenter } : undefined,
    select: { id: true },
  });
  return centers.filter((center) => actor.canAccessCenter(center.id)).map((center) => center.id);
}

async function attendanceScope(actor, centerId) {
  const allowedCenterIds = await accessibleCenterIds(actor);
  if (!allowedCenterIds.length) return null;
  if (centerId === "all") return allowedCenterIds;
  if (!centerId || !allowedCenterIds.includes(centerId)) return null;
  return [centerId];
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, "attendance.holiday");
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const body = await req.json();
    const dateText = String(body.date || todayValue());
    const date = dateValue(dateText);
    const status = String(body.status || "").toUpperCase();
    if (!date) return ApiResponse.error("Invalid attendance date.", 400);
    if (status !== "HOLIDAY" && status !== "WEEKLY_OFF") {
      return ApiResponse.error("Leave type must be HOLIDAY or WEEKLY_OFF.", 400);
    }
    if (dateText !== todayValue() && !auth.actor.hasPermission("attendance.edit")) {
      return ApiResponse.error("Past attendance is read-only for this user.", 403);
    }

    const centerIds = await attendanceScope(auth.actor, body.centerId);
    if (!centerIds) return ApiResponse.error("You are not assigned to a valid center.", 403);

    const assignedClassIds = auth.actor.isTeacher ? await getTeacherAssignedClassIds(prisma, auth.actor.userId) : null;
    const isAllClasses = body.classId === "all";
    if (!isAllClasses && assignedClassIds && !assignedClassIds.includes(body.classId)) {
      return ApiResponse.error("Class is not available for this center.", 403);
    }
    if (!isAllClasses) {
      const classRecord = await prisma.class.findFirst({
        where: {
          id: body.classId,
          status: true,
          OR: [{ centerId: { in: centerIds } }, { centerId: null }],
        },
        select: { id: true },
      });
      if (!classRecord) return ApiResponse.error("Class is not available for this center.", 403);
    }

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        status: true,
        student: {
          centerId: { in: centerIds },
          ...(isAllClasses
            ? (assignedClassIds ? { studyingClass: { in: assignedClassIds } } : {})
            : { studyingClass: body.classId }),
        },
      },
      select: { id: true, student: { select: { centerId: true, studyingClass: true } } },
    });
    if (!students.length) return ApiResponse.error("No visible students found for this filter.", 400);

    const markedAt = new Date();
    await prisma.$transaction(
      students.map((student) => prisma.studentAttendance.upsert({
        where: { attendanceDate_studentId: { attendanceDate: date, studentId: student.id } },
        create: {
          attendanceDate: date,
          studentId: student.id,
          centerId: student.student.centerId,
          classId: student.student.studyingClass,
          status,
          markedBy: auth.actor.userId,
          markedAt,
        },
        update: {
          centerId: student.student.centerId,
          classId: student.student.studyingClass,
          status,
          markedBy: auth.actor.userId,
          markedAt,
        },
      }))
    );

    return ApiResponse.success({ markedCount: students.length, status }, `Marked ${students.length} student(s) as ${status === "HOLIDAY" ? "holiday" : "weekly off"}.`);
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to mark leave", 500);
  }
}
