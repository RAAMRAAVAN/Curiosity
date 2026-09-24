import { requireAdminPermission } from "@/lib/adminRbac";
import { ApiResponse } from "@/utils/apiResponse";

export async function GET(req) {
  const auth = await requireAdminPermission(req, "attendance.view");
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  return ApiResponse.success({ state: "IDLE", date: new Date().toISOString().slice(0, 10), total: 0, processed: 0, marked: 0 });
}
