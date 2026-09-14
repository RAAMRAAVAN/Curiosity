import { prisma } from "@/server/prisma";
import { requireAdminPermission } from "@/lib/adminRbac";
import { ApiResponse } from "@/utils/apiResponse";

function dateValue(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
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
  if (centerId === "all") {
    return { centerIds: allowedCenterIds, center: { id: "all", name: "All", slug: null } };
  }
  if (!centerId || !allowedCenterIds.includes(centerId)) return null;
  const center = await prisma.center.findUnique({ where: { id: centerId }, select: { id: true, name: true, slug: true } });
  return center ? { centerIds: [center.id], center } : null;
}

export async function GET(req) {
  const auth = await requireAdminPermission(req, "attendance.view");
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { searchParams } = new URL(req.url);
    const dateText = searchParams.get("date") || todayValue();
    const date = dateValue(dateText);
    const classId = searchParams.get("classId") || "";
    const scope = await attendanceScope(auth.actor, searchParams.get("centerId"));
    if (!scope) return ApiResponse.error("You are not assigned to a valid center.", 403);
    if (!date) return ApiResponse.error("Invalid attendance date.", 400);

    const classes = await prisma.class.findMany({
      where: {
        status: true,
        OR: [{ centerId: { in: scope.centerIds } }, { centerId: null }],
      },
      select: { id: true, className: true, centerId: true },
      orderBy: { className: "asc" },
    });
    if (!classId) return ApiResponse.success({ center: scope.center, classes, students: [], date: dateText, today: todayValue() });

    const selectedClass = classes.find((item) => item.id === classId);
    if (!selectedClass) return ApiResponse.error("Class is not available for this center.", 403);

    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        student: { centerId: { in: scope.centerIds }, studyingClass: classId },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        student: { select: { centerId: true, studyingClass: true, center: { select: { name: true } } } },
        studentAttendances: {
          where: { attendanceDate: date },
          select: {
            status: true,
            markedAt: true,
            markedBy: true,
            marker: { select: { name: true } },
          },
        },
      },
    });

    return ApiResponse.success({
      center: scope.center,
      classes,
      selectedClass,
      date: dateText,
      today: todayValue(),
      students: users.map((user) => ({
        id: user.id,
        name: user.name,
        centerName: user.student?.center?.name || "-",
        className: selectedClass.className,
        status: user.studentAttendances[0]?.status || null,
        markedAt: user.studentAttendances[0]?.markedAt || null,
        markedBy: user.studentAttendances[0]?.markedBy || null,
        markedByName: user.studentAttendances[0]?.marker?.name || null,
      })),
    });
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to load attendance", 500);
  }
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, "attendance.view");
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const body = await req.json();
    const dateText = String(body.date || todayValue());
    const date = dateValue(dateText);
    if (!date) return ApiResponse.error("Invalid attendance date.", 400);

    const today = todayValue();
    if (!auth.actor.hasPermission("attendance.mark") && !auth.actor.hasPermission("attendance.edit")) {
      return ApiResponse.error("You are not authorized to change attendance.", 403);
    }
    if (dateText !== today && !auth.actor.hasPermission("attendance.edit")) {
      return ApiResponse.error("Past attendance is read-only for this user.", 403);
    }

    const scope = await attendanceScope(auth.actor, body.centerId);
    if (!scope) return ApiResponse.error("You are not assigned to a valid center.", 403);
    const classRecord = await prisma.class.findFirst({
      where: { id: body.classId, status: true, OR: [{ centerId: { in: scope.centerIds } }, { centerId: null }] },
      select: { id: true },
    });
    if (!classRecord) return ApiResponse.error("Class is not available for this center.", 403);

    const student = await prisma.user.findFirst({
      where: { id: body.studentId, role: "STUDENT", student: { centerId: { in: scope.centerIds }, studyingClass: body.classId } },
      select: { id: true, student: { select: { centerId: true } } },
    });
    if (!student) return ApiResponse.error("Student is not in the selected class and center.", 403);

    if (body.status === null || body.status === "REVERT") {
      await prisma.studentAttendance.deleteMany({ where: { attendanceDate: date, studentId: student.id } });
      return ApiResponse.success({ studentId: student.id, status: null, markedAt: null, markedBy: null, markedByName: null }, "Attendance reverted.");
    }

    if (body.status !== "PRESENT" && body.status !== "ABSENT") {
      return ApiResponse.error("Attendance status must be PRESENT or ABSENT.", 400);
    }

    const record = await prisma.studentAttendance.upsert({
      where: { attendanceDate_studentId: { attendanceDate: date, studentId: student.id } },
      create: { attendanceDate: date, studentId: student.id, centerId: student.student.centerId, classId: classRecord.id, status: body.status, markedBy: auth.actor.userId },
      update: { centerId: student.student.centerId, classId: classRecord.id, status: body.status, markedBy: auth.actor.userId, markedAt: new Date() },
      select: {
        studentId: true,
        status: true,
        markedAt: true,
        markedBy: true,
        marker: { select: { name: true } },
      },
    });

    return ApiResponse.success({
      ...record,
      markedByName: record.marker?.name || null,
      marker: undefined,
    }, "Attendance saved.");
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to save attendance", 500);
  }
}
