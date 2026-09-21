#!/usr/bin/env node

import jwt from "jsonwebtoken";
import { writeFile } from "node:fs/promises";

const baseUrl = (process.env.LOAD_TEST_BASE_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
const jwtSecret = process.env.JWT_SECRET;
const workerCount = Number(process.env.HEAVY_LOAD_USERS || 935);
const timeoutMs = Number(process.env.LOAD_TEST_TIMEOUT_MS || 30000);
const date = new Date().toISOString().slice(0, 10);

if (!jwtSecret) throw new Error("JWT_SECRET must be loaded from the test environment.");
if (!Number.isInteger(workerCount) || workerCount < 1 || workerCount > 935) throw new Error("HEAVY_LOAD_USERS must be between 1 and 935.");

const loadId = (kind, index) => `load_${kind}_${String(index).padStart(4, "0")}`;

function cookieFor(userId, role) {
  return `token=${jwt.sign({ id: userId, userId, role }, jwtSecret, { expiresIn: "1h" })}`;
}

function actor(index) {
  if (index < 900) {
    const centerIndex = Math.floor(index / 6);
    const teacherIndex = index % 6;
    const studentIndex = teacherIndex;
    return {
      name: `teacher-${centerIndex + 1}-${teacherIndex + 1}`,
      userId: loadId(`teacher_${centerIndex}_${teacherIndex}`, 0),
      role: "TEACHER",
      centerId: loadId("center", centerIndex),
      classId: loadId(`class_${centerIndex}_0`, 0),
      studentId: loadId(`student_${centerIndex}_${studentIndex}`, 0),
    };
  }

  const adminIndex = index - 900;
  return {
    name: adminIndex < 5 ? `admin-${adminIndex + 1}` : `management-${adminIndex - 4}`,
    userId: adminIndex < 5 ? loadId("admin", adminIndex) : loadId("management", adminIndex - 5),
    role: adminIndex < 5 ? "ADMIN" : "MANAGEMENT",
    centerId: loadId("center", adminIndex % 150),
    classId: loadId(`class_${adminIndex % 150}_0`, 0),
    studentId: loadId(`student_${adminIndex % 150}_${adminIndex % 50}`, 0),
  };
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, { ...options, signal: controller.signal });
  const body = await response.arrayBuffer();
  clearTimeout(timer);
  return { status: response.status, elapsed: performance.now() - started, bytes: body.byteLength };
}

async function main() {
  console.log(`Target: ${baseUrl}`);
  console.log(`Simultaneous synthetic users: ${workerCount}`);
  console.log("Each user performs one read context request, one attendance read, and one attendance write.");

  const started = performance.now();
  const results = await Promise.all(Array.from({ length: workerCount }, async (_, index) => {
    const user = actor(index);
    const cookie = cookieFor(user.userId, user.role);
    const headers = { cookie };
    const item = { user: user.name, role: user.role, requests: [], errors: [] };

    for (const operation of [
      { name: "context", path: "/api/admin/me/" },
      { name: "attendance-read", path: `/api/admin/attendance/?centerId=${encodeURIComponent(user.centerId)}&classId=${encodeURIComponent(user.classId)}` },
      { name: "attendance-write", path: "/api/admin/attendance/", options: { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ centerId: user.centerId, classId: user.classId, date, studentId: user.studentId, status: index % 2 ? "PRESENT" : "ABSENT" }) } },
    ]) {
      try {
        const response = await request(operation.path, { headers, ...(operation.options || {}) });
        item.requests.push({ name: operation.name, status: response.status, elapsed: response.elapsed, bytes: response.bytes });
        if (response.status < 200 || response.status >= 300) item.errors.push(`${operation.name}:${response.status}`);
      } catch (error) {
        item.errors.push(`${operation.name}:${error.name === "AbortError" ? "timeout" : error.message}`);
      }
    }
    return item;
  }));

  const requestResults = results.flatMap((item) => item.requests);
  const errors = results.flatMap((item) => item.errors);
  const latencies = requestResults.map((item) => item.elapsed).sort((a, b) => a - b);
  const responseBytes = requestResults.reduce((sum, item) => sum + item.bytes, 0);
  const percentile = (fraction) => latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * fraction) - 1)] || 0;
  const report = {
    target: baseUrl,
    concurrency: workerCount,
    durationSeconds: (performance.now() - started) / 1000,
    requests: requestResults.length + errors.length,
    errors: errors.length,
    errorRate: errors.length / Math.max(requestResults.length + errors.length, 1),
    throughput: (requestResults.length + errors.length) / Math.max((performance.now() - started) / 1000, 0.001),
    responseBytes,
    responseMegabits: (responseBytes * 8) / 1000000,
    sustainedMbps: (responseBytes * 8) / 1000000 / Math.max((performance.now() - started) / 1000, 0.001),
    latencyMs: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) },
    operations: Object.fromEntries(["context", "attendance-read", "attendance-write"].map((name) => {
      const values = requestResults.filter((item) => item.name === name);
      return [name, { requests: values.length, errors: results.reduce((sum, item) => sum + item.errors.filter((error) => error.startsWith(`${name}:`)).length, 0), p95: values.sort((a, b) => a.elapsed - b.elapsed)[Math.ceil(values.length * 0.95) - 1]?.elapsed || 0 }];
    })),
    errorMessages: errors.slice(0, 20),
    generatedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(report, null, 2));
  if (process.env.HEAVY_LOAD_REPORT_JSON) {
    await writeFile(process.env.HEAVY_LOAD_REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`JSON report: ${process.env.HEAVY_LOAD_REPORT_JSON}`);
  }
  process.exitCode = errors.length ? 2 : 0;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});