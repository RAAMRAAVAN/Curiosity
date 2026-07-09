import { ApiResponse } from "@/utils/apiResponse";
import { clearAuthCookie } from "@/server/cookie";

export async function POST() {
  const response = ApiResponse.success(null, "Logged out successfully.");
  clearAuthCookie(response);
  return response;
}
