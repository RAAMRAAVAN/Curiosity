import { ApiResponse } from "@/utils/apiResponse";

export async function GET() {
  return ApiResponse.success({ state: "IDLE", date: new Date().toISOString().slice(0, 10), total: 0, processed: 0, marked: 0 });
}
