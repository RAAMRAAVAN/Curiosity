import { prisma } from '@/server/prisma';
import { getUserAccessAssignment } from '@/lib/adminRbac';

const STAFF_CONFIG = {
  teacher: {
    role: 'TEACHER',
    relation: 'teacher',
    attendanceModel: 'teacherAttendance',
    attendanceForeignKey: 'teacherId',
  },
  management: {
    role: 'MANAGEMENT',
    relation: 'management',
    attendanceModel: 'managementAttendance',
    attendanceForeignKey: 'managementId',
  },
};

export async function getStaffMonthlyAttendance(actor, { audience, centerId, month, year, pagination = null }) {
  const staffConfig = STAFF_CONFIG[audience];
  if (!staffConfig) return { status: 400, message: 'Choose teachers or management.' };
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
    return { status: 400, message: 'A valid month and year are required.' };
  }

  let centers;
  if (centerId) {
    if (!actor.canAccessCenter(centerId)) {
      return { status: 403, message: 'Center is not available for this user.' };
    }
    const center = await prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, name: true },
    });
    if (!center) return { status: 404, message: 'Center was not found.' };
    centers = [center];
  } else if (audience === 'management') {
    const availableCenters = await prisma.center.findMany({
      select: { id: true, name: true },
    });
    centers = availableCenters.filter((center) => actor.canAccessCenter(center.id));
    if (!centers.length) return { status: 403, message: 'No centers are available for this user.' };
  } else {
    return { status: 400, message: 'A center is required for teacher attendance.' };
  }
  const centerIds = centers.map((center) => center.id);

  const users = await prisma.user.findMany({
    where: {
      role: staffConfig.role,
      status: true,
      [staffConfig.relation]: { status: true },
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      centerId: true,
      teacher: { select: { id: true, name: true, centerId: true } },
      management: { select: { id: true, centerId: true } },
    },
  });

  const assignments = audience === 'management'
    ? await Promise.all(users.map((user) => getUserAccessAssignment(user.id)))
    : [];

  const allStaff = users.flatMap((user, index) => {
    const profile = user[staffConfig.relation];
    const assignedCenterIds = assignments[index]?.centerIds || [];
    const belongsToCenter = centerIds.includes(profile?.centerId)
      || centerIds.includes(user.centerId)
      || assignedCenterIds.some((assignedCenterId) => centerIds.includes(assignedCenterId));

    if (!profile || !belongsToCenter) return [];

    return [{
      id: profile.id,
      name: audience === 'teacher' ? (profile.name || user.name) : user.name,
    }];
  }).sort((left, right) => left.name.localeCompare(right.name));

  // Only the requested page of staff is used to load attendance rows.
  const searchTerm = pagination?.search ? pagination.search.toLowerCase() : '';
  const matchingStaff = searchTerm ? allStaff.filter((person) => String(person.name || '').toLowerCase().includes(searchTerm)) : allStaff;
  const totalStaff = matchingStaff.length;
  const staff = pagination ? matchingStaff.slice(pagination.skip, pagination.skip + pagination.take) : matchingStaff;

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const attendanceRows = staff.length
    ? await prisma[staffConfig.attendanceModel].findMany({
      where: {
        [staffConfig.attendanceForeignKey]: { in: staff.map((person) => person.id) },
        centerId: { in: centerIds },
        attendanceDate: { gte: startDate, lte: endDate },
      },
      select: {
        [staffConfig.attendanceForeignKey]: true,
        attendanceDate: true,
        checkInAt: true,
        checkInLatitude: true,
        checkInLongitude: true,
        checkInAccuracyMeters: true,
        checkOutAt: true,
        checkOutLatitude: true,
        checkOutLongitude: true,
        checkOutAccuracyMeters: true,
      },
    })
    : [];

  const attendanceMap = attendanceRows.reduce((map, record) => {
    const personId = record[staffConfig.attendanceForeignKey];
    const dateKey = new Date(record.attendanceDate).toISOString().slice(0, 10);
    if (!map[personId]) map[personId] = {};
    map[personId][dateKey] = {
      checkInAt: record.checkInAt,
      checkInLatitude: record.checkInLatitude == null ? null : Number(record.checkInLatitude),
      checkInLongitude: record.checkInLongitude == null ? null : Number(record.checkInLongitude),
      checkInAccuracyMeters: record.checkInAccuracyMeters == null ? null : Number(record.checkInAccuracyMeters),
      checkOutAt: record.checkOutAt,
      checkOutLatitude: record.checkOutLatitude == null ? null : Number(record.checkOutLatitude),
      checkOutLongitude: record.checkOutLongitude == null ? null : Number(record.checkOutLongitude),
      checkOutAccuracyMeters: record.checkOutAccuracyMeters == null ? null : Number(record.checkOutAccuracyMeters),
    };
    return map;
  }, {});

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthDates = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return {
      day,
      dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
  });

  const rows = staff.map((person) => {
    const dailyStatus = {};
    const dailyDetails = {};
    let presentCount = 0;

    monthDates.forEach(({ dateKey }) => {
      const details = attendanceMap[person.id]?.[dateKey] || null;
      const status = details?.checkInAt ? 'PRESENT' : 'NO_RECORD';
      dailyStatus[dateKey] = status;
      dailyDetails[dateKey] = details;
      if (status === 'PRESENT') presentCount += 1;
    });

    return {
      id: person.id,
      name: person.name,
      presentCount,
      noRecordCount: daysInMonth - presentCount,
      dailyStatus,
      dailyDetails,
    };
  });

  return {
    status: 200,
    data: {
      totalStaff,
      audience,
      centerId: centerId || null,
      centerName: centerId ? centers[0].name : 'All centers',
      month,
      year,
      monthDates,
      rows,
      monthLabel: new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(year, month - 1, 1))),
    },
  };
}