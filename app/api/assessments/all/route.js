import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getAssessmentVisibleClassValues } from '@/lib/assessmentStudentScope';

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

const getEligibleStudentIds = async (assessment, accessibleCenterIds, teacherClassIds) => {
  const visibleClassValues = getAssessmentVisibleClassValues(assessment, accessibleCenterIds, teacherClassIds);
  const centerFilter = accessibleCenterIds === null
    ? {}
    : { centerId: { in: accessibleCenterIds } };

  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      status: true,
      student: {
        studyingClass: { in: visibleClassValues },
        ...centerFilter,
      },
    },
    select: { id: true },
  });
  return students.map((student) => student.id);
};

const addStats = async (assessment, accessibleCenterIds, teacherClassIds) => {
  const eligibleStudentIds = await getEligibleStudentIds(assessment, accessibleCenterIds, teacherClassIds);
  const [attemptedResults, absentResults] = await Promise.all([
    prisma.assessmentResult.findMany({
      where: { assessmentId: assessment.id, status: true, userId: { in: eligibleStudentIds } },
      select: { userId: true },
    }),
    prisma.assessmentAttendance.findMany({
      where: { assessmentId: assessment.id, status: 'ABSENT', userId: { in: eligibleStudentIds } },
      select: { userId: true },
    }),
  ]);
  const attemptedUserIds = new Set(attemptedResults.map((result) => result.userId));
  const absentUserIds = new Set(absentResults.map((result) => result.userId));
  const attempts = eligibleStudentIds.filter((id) => attemptedUserIds.has(id)).length;
  const pending = eligibleStudentIds.filter((id) => !attemptedUserIds.has(id) && !absentUserIds.has(id)).length;
  return { ...assessment, attempts, pending };
};

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'assessments.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    let teacherId = null;
    let scopedCenterId = null;
    let teacherClassIds = [];

    if (auth.actor.isTeacher) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: auth.actor.userId },
        select: {
          id: true,
          centerId: true,
          user: {
            select: {
              classAccesses: { where: { status: true }, select: { classId: true } },
            },
          },
        },
      });
      if (!teacher) return ApiResponse.error('Teacher account not found.', 404);
      if (!teacher.centerId) return ApiResponse.error('Teacher account is not mapped to any center.', 400);
      teacherId = teacher.id;
      scopedCenterId = teacher.centerId;
      teacherClassIds = teacher.user.classAccesses.map((access) => access.classId);
    }

    const accessibleCenterIds = getAccessibleCenterIds(auth.actor, scopedCenterId);

    const assessments = await prisma.assessment.findMany({
      where: {
        status: true,
        ...(teacherId ? { classId: { in: teacherClassIds } } : {}),
        ...(teacherId ? { subject: { teacherSubjects: { some: { teacherId, status: true } } } } : {}),
      },
      include: {
        class: { select: { id: true, className: true, centerId: true } },
        subject: { select: { id: true, subjectName: true, classId: true } },
        allowedClasses: { where: { active: true }, select: { classId: true, class: { select: { id: true, className: true, centerId: true } } } },
        questions: {
          where: { status: true },
          orderBy: { displayOrder: 'asc' },
          include: { options: { where: { status: true }, orderBy: { displayOrder: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(assessments.map((assessment) => addStats(assessment, accessibleCenterIds, teacherId ? teacherClassIds : null)));
    return ApiResponse.success(result);
  } catch (error) {
    console.error('Load all assessments error:', error);
    return ApiResponse.error('Unable to load assessments', 500, error);
  }
}