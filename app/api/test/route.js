import { getUserFromRequest } from "@/server/auth";
import { ApiResponse } from "@/utils/apiResponse";

export async function GET(req) {
  const user = getUserFromRequest(req);

  if (!user) {
    return ApiResponse.error("Unauthorized", 401);
  }

  return ApiResponse.success(user, "Authenticated user");
}