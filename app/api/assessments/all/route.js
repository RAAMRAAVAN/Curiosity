import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

const getAccessibleCenterIds = (actor, scopedCenterId) => {
  if (actor?.isAdmin) return null;

  return Array.from(new Set(
    (scopedCenterId
      ? [scopedCenterId]
      : Array.isArray(actor?.assignedCenterIds) ? actor.assignedCenterIds : [])
      .map((centerId) => String(centerId).trim())
      .filter(Boolean)
  ));
};

const getEligibleStudentIds = async (assessment, accessibleCenterIds) => {
  const visibleClassIds = Array.from(new Set([
    assessment.classId,
    ...(assessment.allowedClasses || []).map((item) => item.classId),
  ].filter(Boolean)));
  const centerFilter = accessibleCenterIds === null
    ? {}
    : { centerId: { in: accessibleCenterIds } };

  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      status: true,
      student: {
        studyingClass: { in: visibleClassIds },
        ...centerFilter,
      },
    },
    select: { id: true },
  });
  return students.map((student) => student.id);
};

const addStats = async (assessment, accessibleCenterIds) => {
  const eligibleStudentIds = await getEligibleStudentIds(assessment, accessibleCenterIds);
  const resultCenterFilter = accessibleCenterIds === null
    ? {}
    : { user: { student: { centerId: { in: accessibleCenterIds } } } };
  const [attempts, absent] = await Promise.all([
    prisma.assessmentResult.count({
      where: { assessmentId: assessment.id, status: true, ...resultCenterFilter },
    }),
    prisma.assessmentAttendance.count({
      where: { assessmentId: assessment.id, status: 'ABSENT', ...resultCenterFilter },
    }),
  ]);
  return { ...assessment, attempts, pending: Math.max(eligibleStudentIds.length - attempts - absent, 0) };
};

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'assessments.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    let teacherId = null;
    let scopedCenterId = null;

    if (auth.actor.isTeacher) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: auth.actor.userId },
        select: { id: true, centerId: true },
      });
      if (!teacher) return ApiResponse.error('Teacher account not found.', 404);
      if (!teacher.centerId) return ApiResponse.error('Teacher account is not mapped to any center.', 400);
      teacherId = teacher.id;
      scopedCenterId = teacher.centerId;
    }

    const accessibleCenterIds = getAccessibleCenterIds(auth.actor, scopedCenterId);

    const assessments = await prisma.assessment.findMany({
      where: {
        status: true,
        ...(teacherId ? { subject: { teacherSubjects: { some: { teacherId, status: true } } } } : {}),
      },
      include: {
        class: { select: { id: true, className: true } },
        subject: { select: { id: true, subjectName: true, classId: true } },
        allowedClasses: { where: { active: true }, select: { classId: true } },
        questions: {
          where: { status: true },
          orderBy: { displayOrder: 'asc' },
          include: { options: { where: { status: true }, orderBy: { displayOrder: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(assessments.map((assessment) => addStats(assessment, accessibleCenterIds)));
    return ApiResponse.success(result);
  } catch (error) {
    console.error('Load all assessments error:', error);
    return ApiResponse.error('Unable to load assessments', 500, error);
  }
}