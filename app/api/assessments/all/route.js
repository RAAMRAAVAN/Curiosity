import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

const getEligibleStudentIds = async (assessment, actor, scopedCenterId) => {
  const visibleClassIds = Array.from(new Set([
    assessment.classId,
    ...(assessment.allowedClasses || []).map((item) => item.classId),
  ].filter(Boolean)));
  const centerFilter = scopedCenterId
    ? { centerId: scopedCenterId }
    : actor?.isAdmin || !Array.isArray(actor?.assignedCenterIds)
      ? {}
      : { centerId: { in: actor.assignedCenterIds } };

  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      status: true,
      ...centerFilter,
      student: { studyingClass: { in: visibleClassIds } },
    },
    select: { id: true },
  });
  return students.map((student) => student.id);
};

const addStats = async (assessment, actor, scopedCenterId) => {
  const eligibleStudentIds = await getEligibleStudentIds(assessment, actor, scopedCenterId);
  const [attempts, absent] = await Promise.all([
    prisma.assessmentResult.count({
      where: { assessmentId: assessment.id, status: true, ...(scopedCenterId ? { user: { student: { centerId: scopedCenterId } } } : {}) },
    }),
    prisma.assessmentAttendance.count({
      where: { assessmentId: assessment.id, status: 'ABSENT', ...(scopedCenterId ? { user: { student: { centerId: scopedCenterId } } } : {}) },
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

    const result = await Promise.all(assessments.map((assessment) => addStats(assessment, auth.actor, scopedCenterId)));
    return ApiResponse.success(result);
  } catch (error) {
    console.error('Load all assessments error:', error);
    return ApiResponse.error('Unable to load assessments', 500, error);
  }
}