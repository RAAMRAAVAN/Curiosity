import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { applyDatabaseConfig } from "../lib/db-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

for (const envFile of [path.join(rootDir, ".env"), path.join(rootDir, ".env.local")]) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

applyDatabaseConfig(process.env);

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const STATUS_KEY = "attendance_automation_status";
const LOCK_KEY = "curiosity_daily_attendance_finalization";
const BATCH_SIZE = 500;
const STALE_RUN_MINUTES = 15;

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

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

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
  const existing = await prisma.user.findUnique({
    where: { email: "system-attendance@curiosity.internal" },
  });

  if (existing) {
    if (!existing.status || existing.name !== "Attendance System") {
      return prisma.user.update({
        where: { id: existing.id },
        data: { name: "Attendance System", status: true },
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      name: "Attendance System",
      email: "system-attendance@curiosity.internal",
      password: await bcrypt.hash(Math.random().toString(36).slice(2) + Date.now().toString(), 10),
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

export async function finalizeAttendance(date = getIndiaNow().date) {
  const claimed = await claimRun(date);
  if (!claimed) {
    return { skipped: true, date, reason: "A run is already in progress or has already completed for this date." };
  }

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

    const eligibleStudents = students.filter(
      (student) => student.student?.centerId && student.student?.studyingClass
    );

    await writeStatus({
      state: "RUNNING",
      date,
      total: eligibleStudents.length,
      processed: 0,
      marked: 0,
      message: "Finalizing unmarked attendance...",
    });

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

      await writeStatus({
        state: "RUNNING",
        date,
        total: eligibleStudents.length,
        processed,
        marked,
        message: "Marking unmarked attendance as absent...",
      });
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
    throw error;
  }
}

async function main() {
  const now = getIndiaNow();
  const result = await finalizeAttendance(now.date);
  console.log(JSON.stringify({ ...result, timezone: "Asia/Kolkata", executedAt: new Date().toISOString() }, null, 2));
}

try {
  await main();
} catch (error) {
  console.error("Attendance finalization failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
