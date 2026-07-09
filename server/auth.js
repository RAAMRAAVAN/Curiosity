import { verifyToken } from "./jwt";

function extractToken(req) {
  if (!req) return null;

  if (typeof req.cookies?.get === "function") {
    const tokenCookie = req.cookies.get("token");
    if (tokenCookie?.value) {
      return tokenCookie.value;
    }
  }

  const cookieHeader = req.headers?.get?.("cookie") || "";
  return cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("token="))
    ?.split("=")[1] || null;
}

export function getUserFromRequest(req) {
  const token = extractToken(req);
  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}