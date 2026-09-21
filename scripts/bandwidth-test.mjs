#!/usr/bin/env node

import jwt from "jsonwebtoken";
import { writeFile } from "node:fs/promises";

const baseUrl = (process.env.BANDWIDTH_TEST_BASE_URL || "https://thankfulhelpinghand.org").replace(/\/$/, "");
const jwtSecret = process.env.JWT_SECRET;
const repeats = Number(process.env.BANDWIDTH_TEST_REPEATS || 3);
const timeoutMs = Number(process.env.LOAD_TEST_TIMEOUT_MS || 30000);

if (!jwtSecret) throw new Error("JWT_SECRET must be loaded from the test environment.");

const cookie = `token=${jwt.sign({ id: "load_admin_0000", userId: "load_admin_0000", role: "ADMIN" }, jwtSecret, { expiresIn: "1h" })}`;
const endpoints = [
  { name: "homepage", path: "/" },
  { name: "database health", path: "/api/health/db/" },
  { name: "students", path: "/api/admin/students/", auth: true },
  { name: "all-center attendance", path: "/api/admin/attendance/?centerId=all&classId=all", auth: true },
];

async function measure(endpoint) {
  const samples = [];
  for (let index = 0; index < repeats; index += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, { headers: endpoint.auth ? { cookie } : {}, signal: controller.signal });
      const body = await response.arrayBuffer();
      const elapsed = performance.now() - started;
      samples.push({ status: response.status, bytes: body.byteLength, elapsed });
    } finally {
      clearTimeout(timer);
    }
  }
  const successful = samples.filter((sample) => sample.status >= 200 && sample.status < 300);
  const bytes = successful.reduce((sum, sample) => sum + sample.bytes, 0) / Math.max(successful.length, 1);
  const elapsed = successful.reduce((sum, sample) => sum + sample.elapsed, 0) / Math.max(successful.length, 1);
  return { ...endpoint, samples, averageBytes: bytes, averageElapsedMs: elapsed, averageMegabits: bytes * 8 / 1000000, observedMbps: bytes * 8 / 1000000 / Math.max(elapsed / 1000, 0.001) };
}

const measurements = await Promise.all(endpoints.map(measure));
const report = { target: baseUrl, repeats, generatedAt: new Date().toISOString(), measurements };
console.log(JSON.stringify(report, null, 2));
if (process.env.BANDWIDTH_REPORT_JSON) {
  await writeFile(process.env.BANDWIDTH_REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`JSON report: ${process.env.BANDWIDTH_REPORT_JSON}`);
}