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

function sortClasses(classes) {
  return [...classes].sort((a, b) => {
    const aValue = String(a.className || "");
    const bValue = String(b.className || "");
    const aNum = Number.parseInt(aValue, 10);
    const bNum = Number.parseInt(bValue, 10);
    const aHasNumber = !Number.isNaN(aNum) && /\d/.test(aValue);
    const bHasNumber = !Number.isNaN(bNum) && /\d/.test(bValue);

    if (aHasNumber && bHasNumber) {
      return aNum - bNum;
    }

    return aValue.localeCompare(bValue, undefined, { sensitivity: "base" });
  });
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
  const requestedCenterIds = String(centerId || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (requestedCenterIds.includes("all")) {
    return { centerIds: allowedCenterIds, center: { id: "all", name: "All", slug: null } };
  }
  const selectedCenterIds = requestedCenterIds.filter((id) => allowedCenterIds.includes(id));
  if (!selectedCenterIds.length || selectedCenterIds.length !== requestedCenterIds.length) return null;
  const selectedCenters = await prisma.center.findMany({ where: { id: { in: selectedCenterIds } }, select: { id: true, name: true, slug: true } });
  return selectedCenters.length === selectedCenterIds.length
    ? { centerIds: selectedCenterIds, center: selectedCenters.length === 1 ? selectedCenters[0] : { id: selectedCenterIds.join(","), name: "Selected centres", slug: null } }
    : null;
}

export async function GET(req) {
  const auth = await requireAdminPermission(req, "attendance.view");
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { searchParams } = new URL(req.url);
    const dateText = searchParams.get("date") || todayValue();
    const date = dateValue(dateText);
    const requestedClassIds = (searchParams.get("classId") || "").split(",").map((value) => value.trim()).filter(Boolean);
    const scope = await attendanceScope(auth.actor, searchParams.get("centerId"));
    if (!scope) return ApiResponse.error("You are not assigned to a valid center.", 403);
    if (!date) return ApiResponse.error("Invalid attendance date.", 400);

    const assignedClassIds = auth.actor.isTeacher ? await getTeacherAssignedClassIds(prisma, auth.actor.userId) : null;
    const rawClasses = await prisma.class.findMany({
      where: assignedClassIds
        ? { status: true, id: { in: assignedClassIds } }
        : {
            status: true,
            OR: [{ centerId: { in: scope.centerIds } }, { centerId: null }],
          },
      select: { id: true, className: true, centerId: true },
    });
    const classes = sortClasses(rawClasses);
    if (!requestedClassIds.length) return ApiResponse.success({ center: scope.center, classes, students: [], date: dateText, today: todayValue() });

    const classMap = Object.fromEntries(classes.map((item) => [item.id, item.className]));
    const isAllClasses = requestedClassIds.includes("all");
    const selectedClassIds = isAllClasses ? classes.map((item) => item.id) : requestedClassIds;
    const selectedClasses = classes.filter((item) => selectedClassIds.includes(item.id));
    if (!isAllClasses && selectedClasses.length !== requestedClassIds.length) return ApiResponse.error("Class is not available for this center.", 403);

    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        status: true,
        student: {
          centerId: { in: scope.centerIds },
          studyingClass: isAllClasses
            ? (assignedClassIds ? { in: assignedClassIds } : undefined)
            : { in: selectedClassIds },
        },
      },
      orderBy: { id: "asc" },
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
      selectedClass: isAllClasses
        ? { id: "all", className: "All" }
        : selectedClasses.length === 1
          ? selectedClasses[0]
          : { id: selectedClassIds.join(","), className: "Selected classes" },
      date: dateText,
      today: todayValue(),
      students: users.map((user) => ({
        id: user.id,
        name: user.name,
        centerName: user.student?.center?.name || "-",
        classId: user.student?.studyingClass || null,
        className: classMap[user.student?.studyingClass] || "-",
        centerId: user.student?.centerId || null,
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
    if (auth.actor.isTeacher) {
      const assignedClassIds = await getTeacherAssignedClassIds(prisma, auth.actor.userId);
      if (assignedClassIds && !assignedClassIds.includes(body.classId)) {
        return ApiResponse.error("Class is not available for this center.", 403);
      }
    }
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
