#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

const baseUrl = (process.env.LOAD_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const email = process.env.LOAD_TEST_EMAIL;
const password = process.env.LOAD_TEST_PASSWORD;
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 25);
const durationSeconds = Number(process.env.LOAD_TEST_DURATION_SECONDS || 60);
const timeoutMs = Number(process.env.LOAD_TEST_TIMEOUT_MS || 15000);

const scenarios = [
  { name: "database health", weight: 5, path: "/api/health/db" },
  { name: "admin context", weight: 15, path: "/api/admin/me", auth: true },
  { name: "centers", weight: 10, path: "/api/admin/centers", auth: true },
  { name: "teachers", weight: 15, path: "/api/admin/teachers", auth: true },
  { name: "students", weight: 25, path: "/api/admin/students", auth: true },
  {
    name: "all-center attendance",
    weight: 30,
    path: "/api/admin/attendance?centerId=all&classId=all",
    auth: true,
  },
];

function usage(message) {
  if (message) console.error(`\nERROR: ${message}`);
  console.error(`
Read-only load test for the Curiosity Next.js server.

Required environment variables:
  LOAD_TEST_EMAIL              An admin/management test account email
  LOAD_TEST_PASSWORD           The matching password

Optional environment variables:
  LOAD_TEST_BASE_URL           Default: http://127.0.0.1:3000
  LOAD_TEST_CONCURRENCY        Default: 25
  LOAD_TEST_DURATION_SECONDS   Default: 60
  LOAD_TEST_TIMEOUT_MS         Default: 15000

Example:
  $env:LOAD_TEST_EMAIL="load-admin@example.com"
  $env:LOAD_TEST_PASSWORD="..."
  $env:LOAD_TEST_CONCURRENCY="100"
  $env:LOAD_TEST_DURATION_SECONDS="120"
  node scripts/load-test.mjs
`);
  process.exit(1);
}

if (!email || !password) usage("Set LOAD_TEST_EMAIL and LOAD_TEST_PASSWORD.");
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 1000) usage("LOAD_TEST_CONCURRENCY must be between 1 and 1000.");
if (!Number.isFinite(durationSeconds) || durationSeconds < 1) usage("LOAD_TEST_DURATION_SECONDS must be at least 1.");

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function chooseScenario() {
  const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const scenario of scenarios) {
    cursor -= scenario.weight;
    if (cursor <= 0) return scenario;
  }
  return scenarios[scenarios.length - 1];
}

function getCookie(response) {
  const setCookie = response.headers.get("set-cookie") || "";
  const token = setCookie.match(/(?:^|,\s*)token=([^;]+)/)?.[1];
  return token ? `token=${token}` : "";
}

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  const [pathname, query = ""] = path.split("?");
  const canonicalPath = `${pathname.endsWith("/") ? pathname : `${pathname}/`}${query ? `?${query}` : ""}`;

  try {
    const response = await fetch(`${baseUrl}${canonicalPath}`, { ...options, signal: controller.signal });
    await response.arrayBuffer();
    return { status: response.status, elapsed: performance.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

async function login() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const rawResponse = await fetch(`${baseUrl}/api/auth/login/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  await rawResponse.arrayBuffer();
  if (rawResponse.status < 200 || rawResponse.status >= 300) {
    throw new Error(`Login failed with HTTP ${rawResponse.status}`);
  }

  const cookie = getCookie(rawResponse);
  if (!cookie) throw new Error("Login succeeded but no authentication cookie was returned.");
  return cookie;
}

async function runWorker(cookie, endAt, stats) {
  while (Date.now() < endAt) {
    const scenario = chooseScenario();
    const startedAt = performance.now();

    try {
      const response = await fetchWithTimeout(scenario.path, {
        headers: scenario.auth ? { cookie } : {},
      });
      const elapsed = performance.now() - startedAt;
      stats.requests += 1;
      stats.latencies.push(elapsed);
      stats.byScenario[scenario.name] ||= { requests: 0, errors: 0, latencies: [] };
      stats.byScenario[scenario.name].requests += 1;
      stats.byScenario[scenario.name].latencies.push(elapsed);

      if (response.status < 200 || response.status >= 300) {
        stats.errors += 1;
        stats.byScenario[scenario.name].errors += 1;
      }
    } catch (error) {
      stats.requests += 1;
      stats.errors += 1;
      stats.byScenario[scenario.name] ||= { requests: 0, errors: 0, latencies: [] };
      stats.byScenario[scenario.name].requests += 1;
      stats.byScenario[scenario.name].errors += 1;
      stats.errorMessages.add(error.name === "AbortError" ? "timeout" : error.message);
    }
  }
}

async function main() {
  console.log(`Target: ${baseUrl}`);
  console.log(`Read-only workload: ${concurrency} concurrent workers for ${durationSeconds}s`);
  console.log("No attendance, assessment, student, or teacher records will be written.");

  const cookie = await login();
  const stats = {
    requests: 0,
    errors: 0,
    latencies: [],
    byScenario: {},
    errorMessages: new Set(),
  };
  const endAt = Date.now() + durationSeconds * 1000;
  await Promise.all(Array.from({ length: concurrency }, () => runWorker(cookie, endAt, stats)));

  const elapsedSeconds = durationSeconds;
  console.log("\nResults");
  console.log(`Requests: ${stats.requests}`);
  console.log(`Errors: ${stats.errors} (${((stats.errors / Math.max(stats.requests, 1)) * 100).toFixed(2)}%)`);
  console.log(`Throughput: ${(stats.requests / elapsedSeconds).toFixed(2)} requests/sec`);
  console.log(`Latency p50/p95/p99: ${percentile(stats.latencies, 0.5).toFixed(0)} / ${percentile(stats.latencies, 0.95).toFixed(0)} / ${percentile(stats.latencies, 0.99).toFixed(0)} ms`);

  for (const scenario of scenarios) {
    const item = stats.byScenario[scenario.name];
    if (!item) continue;
    console.log(`${scenario.name}: ${item.requests} requests, ${item.errors} errors, p95 ${percentile(item.latencies, 0.95).toFixed(0)} ms`);
  }

  if (stats.errorMessages.size) {
    console.log(`Errors observed: ${Array.from(stats.errorMessages).slice(0, 5).join(" | ")}`);
  }

  if (process.env.LOAD_TEST_REPORT_JSON) {
    const report = {
      target: baseUrl,
      concurrency,
      durationSeconds,
      requests: stats.requests,
      errors: stats.errors,
      errorRate: stats.errors / Math.max(stats.requests, 1),
      throughput: stats.requests / elapsedSeconds,
      latencyMs: {
        p50: percentile(stats.latencies, 0.5),
        p95: percentile(stats.latencies, 0.95),
        p99: percentile(stats.latencies, 0.99),
      },
      scenarios: Object.fromEntries(Object.entries(stats.byScenario).map(([name, item]) => [name, {
        requests: item.requests,
        errors: item.errors,
        p95: percentile(item.latencies, 0.95),
      }])),
      errorMessages: Array.from(stats.errorMessages),
      generatedAt: new Date().toISOString(),
    };
    await writeFile(process.env.LOAD_TEST_REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`JSON report: ${process.env.LOAD_TEST_REPORT_JSON}`);
  }

  process.exitCode = stats.errors ? 2 : 0;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});