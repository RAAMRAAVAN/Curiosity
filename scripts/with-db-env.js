#!/usr/bin/env node
// Resolves DATABASE_URL from DB_MODE/LOCAL_DATABASE_URL/NEON_DATABASE_URL (see lib/db-config.js)
// and spawns `npx prisma <args>` with it set, since the Prisma CLI does not run the app's
// runtime env-resolution logic and only auto-loads .env (not .env.local).
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function parseEnvFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) return result;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  const trimmed = rawUrl.trim();
  if (!/^postgresql:\/\//i.test(trimmed)) return trimmed;
  return trimmed.replace(
    /(postgresql:\/\/[^:]+:)([^@]+)(@.*)$/i,
    (_, prefix, password, suffix) => {
      const normalizedPassword = password.includes("%")
        ? password
        : encodeURIComponent(password);
      return `${prefix}${normalizedPassword}${suffix}`;
    }
  );
}

function resolveDatabaseUrl(env) {
  const manualUrl = env.DATABASE_URL?.trim();
  if (manualUrl) return normalizeDatabaseUrl(manualUrl);

  const dbMode = (env.DB_MODE || "local").toLowerCase();
  const localUrl = env.LOCAL_DATABASE_URL?.trim();
  const neonUrl = env.NEON_DATABASE_URL?.trim();

  if (dbMode === "neon") {
    if (neonUrl) return normalizeDatabaseUrl(neonUrl);
    if (localUrl) return normalizeDatabaseUrl(localUrl);
    throw new Error("NEON_DATABASE_URL is not configured in .env.local");
  }

  if (localUrl) return normalizeDatabaseUrl(localUrl);
  if (neonUrl) return normalizeDatabaseUrl(neonUrl);
  throw new Error("LOCAL_DATABASE_URL is not configured in .env.local");
}

const root = path.resolve(__dirname, "..");
const merged = {
  ...parseEnvFile(path.join(root, ".env")),
  ...parseEnvFile(path.join(root, ".env.local")),
  ...process.env,
};

const databaseUrl = resolveDatabaseUrl(merged);
console.log(`[with-db-env] DB_MODE=${(merged.DB_MODE || "local").toLowerCase()}`);

const args = process.argv.slice(2);
const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: databaseUrl },
});

process.exit(result.status ?? 1);
