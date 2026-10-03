import { requireAdminPermission } from '@/lib/adminRbac';
import { getStaffMonthlyAttendance } from '@/lib/staffMonthlyAttendance';
import { ApiResponse } from '@/utils/apiResponse';
import { buildPaginationMeta, parsePagination } from '@/lib/pagination';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const audience = searchParams.get('audience') || '';
  const permission = audience === 'teacher'
    ? 'attendance.teachers.monthly.view'
    : audience === 'management'
      ? 'attendance.management.monthly.view'
      : null;
  if (!permission) return ApiResponse.error('Choose teachers or management.', 400);

  const auth = await requireAdminPermission(req, permission);
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const pagination = parsePagination(req);
    const report = await getStaffMonthlyAttendance(auth.actor, {
      audience,
      centerId: searchParams.get('centerId') || '',
      month: Number(searchParams.get('month') || new Date().getMonth() + 1),
      year: Number(searchParams.get('year') || new Date().getFullYear()),
      pagination,
    });

    if (report.status !== 200) return ApiResponse.error(report.message, report.status);
    return pagination
      ? ApiResponse.paginated(report.data, buildPaginationMeta(report.data.totalStaff, pagination))
      : ApiResponse.success(report.data);
  } catch (error) {
    console.error('Staff monthly attendance fetch error:', error);
    return ApiResponse.error('Unable to load monthly attendance report.', 500);
  }
}