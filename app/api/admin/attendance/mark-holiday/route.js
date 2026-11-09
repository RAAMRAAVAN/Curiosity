import { prisma } from "@/server/prisma";
import { requireAdminPermission } from "@/lib/adminRbac";
import { ApiResponse } from "@/utils/apiResponse";
import { getTeacherAssignedClassIds } from "@/lib/teacherClassAccess";
import { getIndiaDateString } from "@/lib/indiaDate";
import { createStudentAttendanceAuditLog } from "@/lib/studentAttendanceAudit";

function dateValue(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
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
    select: { id: true, className: true },
  });
  return centers.filter((center) => actor.canAccessCenter(center.id)).map((center) => center.id);
}

async function attendanceScope(actor, centerId) {
  const allowedCenterIds = await accessibleCenterIds(actor);
  if (!allowedCenterIds.length) return null;
  const requestedCenterIds = [...new Set(
    String(centerId || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  )];
  if (requestedCenterIds.length === 1 && requestedCenterIds[0] === "all") return allowedCenterIds;
  if (!requestedCenterIds.length || requestedCenterIds.includes("all")) return null;
  if (requestedCenterIds.some((id) => !allowedCenterIds.includes(id))) return null;
  return requestedCenterIds;
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, "attendance.holiday");
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const body = await req.json();
    const dateText = String(body.date || getIndiaDateString());
    const date = dateValue(dateText);
    const status = String(body.status || "").toUpperCase();
    if (!date) return ApiResponse.error("Invalid attendance date.", 400);
    if (status !== "HOLIDAY" && status !== "WEEKLY_OFF") {
      return ApiResponse.error("Leave type must be HOLIDAY or WEEKLY_OFF.", 400);
    }
    if (dateText < getIndiaDateString() && !auth.actor.hasPermission("attendance.edit")) {
      return ApiResponse.error("Past attendance is read-only for this user.", 403);
    }

    const centerIds = await attendanceScope(auth.actor, body.centerId);
    if (!centerIds) return ApiResponse.error("You are not assigned to a valid center.", 403);

    const assignedClassIds = auth.actor.isTeacher ? await getTeacherAssignedClassIds(prisma, auth.actor.userId) : null;
    const requestedClassIds = [...new Set(
      String(body.classId || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    )];
    const isAllClasses = requestedClassIds.length === 1 && requestedClassIds[0] === "all";
    if (!requestedClassIds.length || (requestedClassIds.includes("all") && !isAllClasses)) {
      return ApiResponse.error("Select one or more valid classes.", 400);
    }
    if (!isAllClasses && assignedClassIds && requestedClassIds.some((id) => !assignedClassIds.includes(id))) {
      return ApiResponse.error("Class is not available for this center.", 403);
    }
    const classRecords = await prisma.class.findMany({
      where: {
        ...(isAllClasses
          ? (assignedClassIds ? { id: { in: assignedClassIds } } : {})
          : { id: { in: requestedClassIds } }),
        status: true,
        OR: [{ centerId: { in: centerIds } }, { centerId: null }],
      },
      select: { id: true, className: true },
    });
    if (!isAllClasses && classRecords.length !== requestedClassIds.length) {
      return ApiResponse.error("Class is not available for this center.", 403);
    }

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        status: true,
        student: {
          centerId: { in: centerIds },
          ...(isAllClasses
            ? (assignedClassIds ? { studyingClass: { in: assignedClassIds } } : {})
            : { studyingClass: { in: requestedClassIds } }),
        },
      },
      select: {
        id: true,
        name: true,
        student: {
          select: {
            centerId: true,
            studyingClass: true,
            center: { select: { name: true } },
          },
        },
      },
    });
    if (!students.length) return ApiResponse.error("No visible students found for this filter.", 400);

    const markedAt = new Date();
    const actor = await prisma.user.findUnique({
      where: { id: auth.actor.userId },
      select: { name: true },
    });
    const existingAttendances = await prisma.studentAttendance.findMany({
      where: {
        attendanceDate: date,
        studentId: { in: students.map((student) => student.id) },
      },
      select: { studentId: true, status: true },
    });
    const existingStatusByStudentId = new Map(
      existingAttendances.map((attendance) => [attendance.studentId, attendance.status]),
    );
    const classNameById = new Map(
      classRecords.map((classRecord) => [classRecord.id, classRecord.className]),
    );
    await prisma.$transaction(
      [
        ...students.map((student) => prisma.studentAttendance.upsert({
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
        })),
        ...students.map((student) => {
          const beforeStatus = existingStatusByStudentId.get(student.id) || null;
          return createStudentAttendanceAuditLog(prisma, {
            studentId: student.id,
            studentName: student.name,
            attendanceDate: date,
            centerId: student.student.centerId,
            centerName: student.student.center?.name || null,
            classId: student.student.studyingClass,
            className: classNameById.get(student.student.studyingClass) || null,
            actorId: auth.actor.userId,
            actorName: actor?.name || "Unknown user",
            beforeStatus,
            afterStatus: status,
          });
        }),
      ],
    );

    return ApiResponse.success({ markedCount: students.length, status }, `Marked ${students.length} student(s) as ${status === "HOLIDAY" ? "holiday" : "weekly off"}.`);
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to mark leave", 500);
  }
}
