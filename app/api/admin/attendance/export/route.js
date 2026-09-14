import ExcelJS from "exceljs";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from "@/lib/adminRbac";

function dateValue(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function toExcelLocalDate(value) {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return new Date(Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second));
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
  if (centerId === "all") return { centerIds: allowedCenterIds, centerName: "All" };
  if (!centerId || !allowedCenterIds.includes(centerId)) return null;
  const center = await prisma.center.findUnique({ where: { id: centerId }, select: { name: true } });
  return center ? { centerIds: [centerId], centerName: center.name } : null;
}

export async function GET(req) {
  const auth = await requireAdminPermission(req, "attendance.view");
  if (!auth.ok) return new Response(auth.message, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const dateText = searchParams.get("date") || todayValue();
    const date = dateValue(dateText);
    const classId = searchParams.get("classId") || "";
    const scope = await attendanceScope(auth.actor, searchParams.get("centerId"));
    if (!scope) return new Response("You are not assigned to a valid center.", { status: 403 });
    if (!date) return new Response("Invalid attendance date.", { status: 400 });
    if (!classId) return new Response("A class must be selected before exporting.", { status: 400 });

    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        status: true,
        OR: [{ centerId: { in: scope.centerIds } }, { centerId: null }],
      },
      select: { id: true, className: true },
    });
    if (!classRecord) return new Response("Class is not available for this center.", { status: 403 });

    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        student: { centerId: { in: scope.centerIds }, studyingClass: classId },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        student: { select: { center: { select: { name: true } } } },
        studentAttendances: {
          where: { attendanceDate: date },
          select: {
            status: true,
            markedAt: true,
            marker: { select: { name: true } },
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance");
    worksheet.columns = [
      { header: "Enrollment ID", key: "id", width: 24 },
      { header: "Student Name", key: "name", width: 28 },
      { header: "Centre Name", key: "centerName", width: 24 },
      { header: "Class", key: "className", width: 20 },
      { header: "Attendance Date", key: "date", width: 18, style: { numFmt: "dd-mm-yyyy" } },
      { header: "Status", key: "status", width: 14 },
      { header: "Marked by", key: "markedBy", width: 24 },
      { header: "Mark Date", key: "markedDate", width: 18, style: { numFmt: "dd-mm-yyyy" } },
      { header: "Mark Time", key: "markedTime", width: 14, style: { numFmt: "hh:mm:ss" } },
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    users.forEach((user) => {
      const attendance = user.studentAttendances[0];
      worksheet.addRow({
        id: user.id,
        name: user.name,
        centerName: user.student?.center?.name || "-",
        className: classRecord.className,
        date,
        status: attendance?.status || "Not marked",
        markedBy: attendance?.marker?.name || "-",
        markedDate: toExcelLocalDate(attendance?.markedAt),
        markedTime: toExcelLocalDate(attendance?.markedAt),
      });
    });

    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="attendance-${dateText}-${classRecord.className.replace(/[^a-z0-9]+/gi, "-")}.xlsx"`,
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Unable to export attendance", { status: 500 });
  }
}
