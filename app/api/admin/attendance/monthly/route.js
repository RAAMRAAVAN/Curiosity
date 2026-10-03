import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { ApiResponse } from '@/utils/apiResponse';
import { getTeacherAssignedClassIds } from '@/lib/teacherClassAccess';
import { buildPaginationMeta, containsFilter, parsePagination } from '@/lib/pagination';

function getMonthDates(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const dates = [];
  for (let day = 1; day <= end.getDate(); day += 1) {
    dates.push(new Date(year, month - 1, day));
  }
  return dates;
}

async function getCenterIds(actor, centerId) {
  const requestedCenterIds = String(centerId || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (!requestedCenterIds.length) {
    return [];
  }

  const allowed = actor.isTeacher
    ? [actor.centerId || (await prisma.teacher.findUnique({ where: { userId: actor.userId }, select: { centerId: true } }))?.centerId].filter(Boolean)
    : await prisma.center.findMany({ select: { id: true } }).then((rows) => rows.map((row) => row.id));

  const selected = requestedCenterIds.filter((id) => allowed.includes(id));
  return selected;
}

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'attendance.students.monthly.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { searchParams } = new URL(req.url);
    const centerId = searchParams.get('centerId') || '';
    const classId = searchParams.get('classId') || '';
    const month = Number(searchParams.get('month') || new Date().getMonth() + 1);
    const year = Number(searchParams.get('year') || new Date().getFullYear());

    const requestedClassIds = classId.split(',').map((value) => value.trim()).filter(Boolean);

    if (!centerId || !requestedClassIds.length) {
      return ApiResponse.error('Center and class are required.', 400);
    }

    const centerIds = await getCenterIds(auth.actor, centerId);
    if (!centerIds.includes(centerId)) {
      return ApiResponse.error('Center is not available for this user.', 403);
    }

    const assignedClassIds = auth.actor.isTeacher ? await getTeacherAssignedClassIds(prisma, auth.actor.userId) : null;
    if (assignedClassIds && requestedClassIds.some((id) => !assignedClassIds.includes(id))) {
      return ApiResponse.error('Class is not available for this user.', 403);
    }

    const classes = await prisma.class.findMany({
      where: {
        id: { in: requestedClassIds },
        status: true,
        OR: [{ centerId }, { centerId: null }],
      },
      select: { id: true, className: true },
    });

    if (classes.length !== requestedClassIds.length) {
      return ApiResponse.error('Class is not available for this center.', 403);
    }
    const classNameById = new Map(classes.map(({ id, className }) => [id, className]));

    const monthDates = getMonthDates(year, month);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const pagination = parsePagination(req);
    const userWhere = {
      role: 'STUDENT',
      status: true,
      student: {
        centerId,
        studyingClass: { in: requestedClassIds },
      },
      ...(pagination?.search ? { name: containsFilter(pagination.search) } : {}),
    };
    const [totalStudents, users] = await Promise.all([
      pagination ? prisma.user.count({ where: userWhere }) : Promise.resolve(0),
      prisma.user.findMany({
        where: userWhere,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
        select: {
          id: true,
          name: true,
          student: { select: { studyingClass: true } },
        },
      }),
    ]);

    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: {
        centerId,
        classId: { in: requestedClassIds },
        ...(pagination ? { studentId: { in: users.map((user) => user.id) } } : {}),
        attendanceDate: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
      },
      select: {
        studentId: true,
        attendanceDate: true,
        status: true,
      },
    });

    const attendanceMap = attendanceRecords.reduce((acc, item) => {
      const dateKey = new Date(item.attendanceDate).toISOString().slice(0, 10);
      if (!acc[item.studentId]) acc[item.studentId] = {};
      acc[item.studentId][dateKey] = item.status;
      return acc;
    }, {});

    const rows = users.map((user) => {
      const dailyStatus = {};
      let presentCount = 0;
      let absentCount = 0;
      let holidayCount = 0;

      monthDates.forEach((currentDate) => {
        const dateKey = currentDate.toISOString().slice(0, 10);
        const status = attendanceMap[user.id]?.[dateKey] || '—';
        dailyStatus[dateKey] = status;

        if (status === 'PRESENT') presentCount += 1;
        else if (status === 'ABSENT') absentCount += 1;
        else if (status === 'HOLIDAY' || status === 'WEEKLY_OFF') holidayCount += 1;
      });

      return {
        id: user.id,
        studentName: user.name,
        className: classNameById.get(user.student?.studyingClass) || '—',
        presentCount,
        absentCount,
        holidayCount,
        dailyStatus,
      };
    });

    const payload = {
      centerId,
      classId,
      month,
      year,
      rows,
      monthLabel: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)),
    };
    return pagination
      ? ApiResponse.paginated(payload, buildPaginationMeta(totalStudents, pagination))
      : ApiResponse.success(payload);
  } catch (error) {
    console.error('Monthly attendance fetch error:', error);
    return ApiResponse.error('Unable to load monthly attendance report.', 500);
  }
}
