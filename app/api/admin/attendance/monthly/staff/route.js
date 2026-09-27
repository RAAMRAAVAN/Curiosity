import { requireAdminPermission } from '@/lib/adminRbac';
import { getStaffMonthlyAttendance } from '@/lib/staffMonthlyAttendance';
import { ApiResponse } from '@/utils/apiResponse';

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'attendance.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { searchParams } = new URL(req.url);
    const report = await getStaffMonthlyAttendance(auth.actor, {
      audience: searchParams.get('audience') || '',
      centerId: searchParams.get('centerId') || '',
      month: Number(searchParams.get('month') || new Date().getMonth() + 1),
      year: Number(searchParams.get('year') || new Date().getFullYear()),
    });

    if (report.status !== 200) return ApiResponse.error(report.message, report.status);
    return ApiResponse.success(report.data);
  } catch (error) {
    console.error('Staff monthly attendance fetch error:', error);
    return ApiResponse.error('Unable to load monthly attendance report.', 500);
  }
}