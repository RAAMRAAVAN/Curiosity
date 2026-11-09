#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function readTestEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("Test environment is not initialized. Run scripts/setup-test-environment.ps1 first.");
  }

  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function validateTestDatabase(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("The test database URL is invalid.");
  }

  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !localHosts.has(url.hostname) ||
    url.port !== "55433" ||
    databaseName !== "curiosity_loadtest" ||
    decodeURIComponent(url.username) !== "curiosity_test_user"
  ) {
    throw new Error("Refusing to run: test commands require the isolated local curiosity_loadtest database on port 55433.");
  }
}

function validateTestServer(baseUrl, hasAccessToken) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("The test server URL is invalid.");
  }

  const isLocalTestServer = url.protocol === "http:"
    && new Set(["127.0.0.1", "localhost", "::1"]).has(url.hostname)
    && url.port === "3100";
  const isApprovedTunnel = url.protocol === "https:"
    && url.hostname === "loadtest.hansuttamxikhya.in"
    && !url.port;

  if (!isLocalTestServer && !isApprovedTunnel) {
    throw new Error("Refusing to run: test workloads may target only localhost:3100 or https://loadtest.hansuttamxikhya.in.");
  }
  if (isApprovedTunnel && !hasAccessToken) {
    throw new Error("Cloudflare Access service-token credentials are required for the approved test hostname.");
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift();
  if (!["next", "prisma", "node"].includes(command)) {
    throw new Error("Allowed test commands are: next, prisma, and node.");
  }

  const root = path.resolve(__dirname, "..");
  const testEnv = readTestEnv(path.join(root, ".env.test.local"));
  validateTestDatabase(testEnv.DATABASE_URL);
  if (args.some((arg) => arg.includes("load-test.mjs"))) {
    const loadTestBaseUrl = process.env.LOAD_TEST_BASE_URL || testEnv.LOAD_TEST_BASE_URL;
    const accessClientId = process.env.CF_ACCESS_CLIENT_ID || testEnv.CF_ACCESS_CLIENT_ID;
    const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET || testEnv.CF_ACCESS_CLIENT_SECRET;
    validateTestServer(loadTestBaseUrl, Boolean(accessClientId && accessClientSecret));
  }
  if (!testEnv.JWT_SECRET) throw new Error("The test JWT secret is missing.");

  const env = {
    ...process.env,
    ...testEnv,
    ...(process.env.LOAD_TEST_BASE_URL ? { LOAD_TEST_BASE_URL: process.env.LOAD_TEST_BASE_URL } : {}),
    ...(process.env.CF_ACCESS_CLIENT_ID ? { CF_ACCESS_CLIENT_ID: process.env.CF_ACCESS_CLIENT_ID } : {}),
    ...(process.env.CF_ACCESS_CLIENT_SECRET ? { CF_ACCESS_CLIENT_SECRET: process.env.CF_ACCESS_CLIENT_SECRET } : {}),
    DB_MODE: "local",
    LOCAL_DATABASE_URL: testEnv.DATABASE_URL,
    NEON_DATABASE_URL: "",
    DATABASE_URL: testEnv.DATABASE_URL,
    NEXT_BUILD_DIR: "test",
    NEXT_TELEMETRY_DISABLED: "1",
  };

  const executable = command === "node"
    ? process.execPath
    : process.platform === "win32" ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32" && command !== "node",
  });

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
