const DEFAULT_DB_MODE = "local";

function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  const trimmed = rawUrl.trim();

  if (!trimmed.match(/^postgresql:\/\//i)) {
    return trimmed;
  }

  return trimmed.replace(
    /(postgresql:\/\/[^:]+:)([^@]+)(@.*)$/i,
    (_, prefix, password, suffix) => {
      const normalizedPassword = password.includes("%") ? password : encodeURIComponent(password);
      return `${prefix}${normalizedPassword}${suffix}`;
    }
  );
}

export function resolveDatabaseUrl(env = process.env) {
  const manualUrl = env.DATABASE_URL?.trim();
  if (manualUrl) {
    return normalizeDatabaseUrl(manualUrl);
  }

  const dbMode = (env.DB_MODE || DEFAULT_DB_MODE).toLowerCase();
  const localUrl = env.LOCAL_DATABASE_URL?.trim();
  const neonUrl = env.NEON_DATABASE_URL?.trim();

  if (dbMode === "neon") {
    if (neonUrl) return normalizeDatabaseUrl(neonUrl);
    if (localUrl) return normalizeDatabaseUrl(localUrl);
    throw new Error(
      "NEON_DATABASE_URL is not configured. Set DB_MODE=neon and add NEON_DATABASE_URL to your .env file."
    );
  }

  if (dbMode === "local") {
    if (localUrl) return normalizeDatabaseUrl(localUrl);
    if (neonUrl) return normalizeDatabaseUrl(neonUrl);
    throw new Error(
      "LOCAL_DATABASE_URL is not configured. Set DB_MODE=local and add LOCAL_DATABASE_URL to your .env file."
    );
  }

  throw new Error(
    `Unsupported DB_MODE: "${env.DB_MODE}". Use "local" or "neon".`
  );
}

export function applyDatabaseConfig(env = process.env) {
  const resolvedUrl = resolveDatabaseUrl(env);
  env.DATABASE_URL = resolvedUrl;
  return resolvedUrl;
}
