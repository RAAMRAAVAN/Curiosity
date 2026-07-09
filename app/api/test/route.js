import { getUserFromRequest } from "@/server/auth";

export async function GET(req) {
  const user = getUserFromRequest(req);

  if (!user) {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  return Response.json({
    success: true,
    message: "Authenticated user",
    user,
  });
}