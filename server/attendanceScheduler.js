import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";

const STATUS_KEY = "attendance_automation_status";
const LOCK_KEY = "curiosity_daily_attendance_finalization";
const BATCH_SIZE = 500;
const RUN_AFTER_MINUTE = 55;
const STALE_RUN_MINUTES = 15;
let schedulerStarted = false;
let schedulerTimer = null;

function getIndiaNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

async function readStatus(client = prisma) {
  const record = await client.appSetting.findUnique({ where: { key: STATUS_KEY } });
  if (!record?.value) return null;
  try {
    return JSON.parse(record.value);
  } catch {
    return null;
  }
}

async function writeStatus(status, client = prisma) {
  const value = JSON.stringify({ ...status, updatedAt: new Date().toISOString() });
  await client.appSetting.upsert({
    where: { key: STATUS_KEY },
    create: { key: STATUS_KEY, value },
    update: { value },
  });
}

async function getSystemUser() {
  const existing = await prisma.user.findUnique({ where: { email: "system-attendance@curiosity.internal" } });
  if (existing) {
    if (!existing.status || existing.name !== "Attendance System") {
      return prisma.user.update({ where: { id: existing.id }, data: { name: "Attendance System", status: true } });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      name: "Attendance System",
      email: "system-attendance@curiosity.internal",
      password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
      role: "ADMIN",
      status: true,
    },
  });
}

async function claimRun(date) {
  return prisma.$transaction(async (transaction) => {
    const lockResult = await transaction.$queryRawUnsafe(
      `SELECT pg_try_advisory_xact_lock(hashtext('${LOCK_KEY}')) AS locked`
    );
    if (!lockResult[0]?.locked) return false;

    const current = await readStatus(transaction);
    const currentDate = current?.date;
    const currentUpdatedAt = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
    const isRecentRun = current?.state === "RUNNING"
      && currentDate === date
      && Date.now() - currentUpdatedAt < STALE_RUN_MINUTES * 60 * 1000;

    if (currentDate === date && (current?.state === "COMPLETED" || isRecentRun)) return false;

    await writeStatus({
      state: "RUNNING",
      date,
      total: 0,
      processed: 0,
      marked: 0,
      message: "Preparing daily attendance finalization...",
      startedAt: new Date().toISOString(),
    }, transaction);
    return true;
  });
}

export async function runAttendanceFinalization(date = getIndiaNow().date) {
  const claimed = await claimRun(date);
  if (!claimed) return { skipped: true };

  try {
    const systemUser = await getSystemUser();
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        status: true,
        student: { status: true },
      },
      select: {
        id: true,
        student: { select: { centerId: true, studyingClass: true } },
      },
    });

    const eligibleStudents = students.filter((student) => student.student?.centerId && student.student?.studyingClass);
    await writeStatus({ state: "RUNNING", date, total: eligibleStudents.length, processed: 0, marked: 0, message: "Finalizing unmarked attendance..." });

    let processed = 0;
    let marked = 0;
    for (let index = 0; index < eligibleStudents.length; index += BATCH_SIZE) {
      const batch = eligibleStudents.slice(index, index + BATCH_SIZE);
      const markedAt = new Date();
      const result = await prisma.studentAttendance.createMany({
        data: batch.map((student) => ({
          attendanceDate: new Date(`${date}T00:00:00.000Z`),
          studentId: student.id,
          centerId: student.student.centerId,
          classId: student.student.studyingClass,
          status: "ABSENT",
          markedBy: systemUser.id,
          markedAt,
        })),
        skipDuplicates: true,
      });
      processed += batch.length;
      marked += result.count;
      await writeStatus({ state: "RUNNING", date, total: eligibleStudents.length, processed, marked, message: "Marking unmarked attendance as absent..." });
    }

    const completed = {
      state: "COMPLETED",
      date,
      total: eligibleStudents.length,
      processed,
      marked,
      message: `Attendance finalization completed. ${marked} student(s) marked absent.`,
      completedAt: new Date().toISOString(),
    };
    await writeStatus(completed);
    return completed;
  } catch (error) {
    const failed = {
      state: "FAILED",
      date,
      message: error.message || "Attendance finalization failed.",
      error: error.stack || String(error),
      completedAt: new Date().toISOString(),
    };
    await writeStatus(failed);
    console.error("Daily attendance finalization failed:", error);
    throw error;
  }
}

async function schedulerTick() {
  const now = getIndiaNow();
  if (now.hour !== 23 || now.minute < RUN_AFTER_MINUTE) return;
  try {
    await runAttendanceFinalization(now.date);
  } catch {
    // Status is persisted by runAttendanceFinalization for the admin overlay.
  }
}

export function startAttendanceScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  schedulerTimer = setInterval(schedulerTick, 30 * 1000);
  schedulerTimer.unref?.();
  void schedulerTick();
  console.log("Attendance scheduler started for 11:55 PM Asia/Kolkata.");
}

export { getIndiaNow, readStatus, STATUS_KEY };
