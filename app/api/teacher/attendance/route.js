import { randomUUID } from "node:crypto";
import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { getUserFromRequest } from "@/server/auth";
import { requireAdminPermission } from "@/lib/adminRbac";

function getAttendanceDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function resolveTeacher(req) {
  const tokenUser = getUserFromRequest(req);
  const userId = tokenUser?.userId || tokenUser?.id;
  if (!userId) return { response: ApiResponse.error("Authentication required", 401) };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
      teacher: { select: { id: true, centerId: true, status: true } },
    },
  });

  if (user?.role !== "TEACHER" || !user.status || !user.teacher?.status) {
    return { response: ApiResponse.error("Teacher access required", 403) };
  }

  return { teacher: user.teacher };
}

async function findTodayAttendance(teacherId, attendanceDate) {
  const rows = await prisma.$queryRaw`
    SELECT
      "id",
      "attendance_date" AS "attendanceDate",
      "teacher_id" AS "teacherId",
      "center_id" AS "centerId",
      "check_in_at" AS "checkInAt",
      "check_in_latitude"::float8 AS "checkInLatitude",
      "check_in_longitude"::float8 AS "checkInLongitude",
      "check_in_accuracy_meters"::float8 AS "checkInAccuracyMeters",
      "check_out_at" AS "checkOutAt",
      "check_out_latitude"::float8 AS "checkOutLatitude",
      "check_out_longitude"::float8 AS "checkOutLongitude",
      "check_out_accuracy_meters"::float8 AS "checkOutAccuracyMeters"
    FROM "teacher_attendances"
    WHERE "teacher_id" = ${teacherId}
      AND "attendance_date" = CAST(${attendanceDate} AS DATE)
    LIMIT 1
  `;

  return rows[0] || null;
}

function parseLocation(body) {
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const accuracy = Number(body?.accuracyMeters);

  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || !Number.isFinite(accuracy) || accuracy < 0
  ) {
    return null;
  }

  return { latitude, longitude, accuracy };
}

export async function GET(req) {
  try {
    const permission = await requireAdminPermission(req, "attendance.teacher.self.view");
    if (!permission.ok) return ApiResponse.error(permission.message, permission.status);
    const auth = await resolveTeacher(req);
    if (auth.response) return auth.response;

    const attendanceDate = getAttendanceDate();
    const attendance = await findTodayAttendance(auth.teacher.id, attendanceDate);
    return ApiResponse.success({ attendanceDate, attendance });
  } catch (error) {
    console.error("Unable to load teacher attendance", error);
    return ApiResponse.error("Unable to load teacher attendance", 500);
  }
}

export async function POST(req) {
  try {
    const permission = await requireAdminPermission(req, "attendance.teacher.self.view");
    if (!permission.ok) return ApiResponse.error(permission.message, permission.status);
    const auth = await resolveTeacher(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const action = String(body?.action || "").toUpperCase();
    if (action !== "IN" && action !== "OUT") {
      return ApiResponse.error("Choose check-in or check-out.", 400);
    }

    const location = parseLocation(body);
    if (!location) {
      return ApiResponse.error("A valid device location is required.", 400);
    }

    const attendanceDate = getAttendanceDate();
    const id = `teacher_att_${randomUUID()}`;

    if (action === "IN") {
      const rows = await prisma.$queryRaw`
        INSERT INTO "teacher_attendances" (
          "id", "attendance_date", "teacher_id", "center_id",
          "check_in_at", "check_in_latitude", "check_in_longitude", "check_in_accuracy_meters",
          "createdAt", "updatedAt"
        ) VALUES (
          ${id}, CAST(${attendanceDate} AS DATE), ${auth.teacher.id}, ${auth.teacher.centerId},
          CURRENT_TIMESTAMP AT TIME ZONE 'UTC', ${location.latitude}, ${location.longitude}, ${location.accuracy},
          CURRENT_TIMESTAMP AT TIME ZONE 'UTC', CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
        )
        ON CONFLICT ("attendance_date", "teacher_id") DO NOTHING
        RETURNING "id"
      `;

      if (!rows.length) {
        return ApiResponse.error("You have already checked in today.", 409);
      }
    } else {
      const rows = await prisma.$queryRaw`
        UPDATE "teacher_attendances"
        SET
          "check_out_at" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
          "check_out_latitude" = ${location.latitude},
          "check_out_longitude" = ${location.longitude},
          "check_out_accuracy_meters" = ${location.accuracy},
          "updatedAt" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
        WHERE "teacher_id" = ${auth.teacher.id}
          AND "attendance_date" = CAST(${attendanceDate} AS DATE)
          AND "check_in_at" IS NOT NULL
          AND "check_out_at" IS NULL
        RETURNING "id"
      `;

      if (!rows.length) {
        const existing = await findTodayAttendance(auth.teacher.id, attendanceDate);
        return ApiResponse.error(
          existing?.checkOutAt
            ? "You have already checked out today."
            : "Check in before checking out.",
          409
        );
      }
    }

    const attendance = await findTodayAttendance(auth.teacher.id, attendanceDate);
    return ApiResponse.success(
      { attendanceDate, attendance },
      action === "IN" ? "Check-in recorded." : "Check-out recorded."
    );
  } catch (error) {
    console.error("Unable to record teacher attendance", error);
    return ApiResponse.error("Unable to record teacher attendance", 500);
  }
}
