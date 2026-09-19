import { prisma } from '@/server/prisma';
import { getUserFromRequest } from '@/server/auth';
import { ApiResponse } from '@/utils/apiResponse';

const getUserId = (user) => user?.userId || user?.id || null;

const loadAssessment = (id) => prisma.assessment316.findFirst({
  where: { id, status: true },
  include: {
    allowedClasses: { include: { class: { select: { id: true, className: true } } } },
    subjects: { include: { subject: { select: { id: true, subjectName: true, classId: true } } } },
    checklist: {
      where: { status: true },
      orderBy: { displayOrder: 'asc' },
      include: { options: { where: { status: true }, orderBy: { displayOrder: 'asc' } } },
    },
  },
});

const isEligible = async (assessment, user) => {
  if (['ADMIN', 'MANAGEMENT'].includes(String(user?.role || '').toUpperCase())) return true;
  const userId = getUserId(user);
  if (!userId) return false;

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, student: { select: { studyingClass: true, status: true } } },
  });
  if (!profile || String(profile.role).toUpperCase() !== 'STUDENT' || profile.student?.status === false) return false;

  const allowedClassIds = assessment.allowedClasses.map((item) => String(item.classId));
  if (!allowedClassIds.length) return true;
  const classValue = String(profile.student?.studyingClass || '').trim();
  if (!classValue) return false;

  const matchingClass = await prisma.class.findFirst({
    where: { OR: [{ id: classValue }, { className: classValue }] },
    select: { id: true },
  });
  return Boolean(matchingClass && allowedClassIds.includes(String(matchingClass.id)));
};

const responseForUser = async (assessmentId, userId) => prisma.assessment316Response.findUnique({
  where: { assessmentId_userId: { assessmentId, userId } },
  include: { items: { select: { checklistId: true, optionId: true } } },
});

export async function GET(req, { params }) {
  const user = getUserFromRequest(req);
  if (!getUserId(user)) return ApiResponse.error('Please sign in to attend this assessment.', 401);

  try {
    const { id } = await params;
    const assessment = await loadAssessment(id);
    if (!assessment || !(await isEligible(assessment, user))) {
      return ApiResponse.error('Assessment not found or you are not eligible.', 404);
    }

    const subjectId = new URL(req.url).searchParams.get('subjectId');
    if (subjectId && assessment.subjects.length && !assessment.subjects.some((item) => item.subjectId === subjectId)) {
      return ApiResponse.error('This subject is not assigned to the assessment.', 403);
    }

    const existing = await responseForUser(id, getUserId(user));
    return ApiResponse.success({
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      subjects: assessment.subjects.map((item) => item.subject),
      checklist: assessment.checklist.map((item) => ({
        id: item.id,
        label: item.itemText,
        options: item.options.map((option) => ({ id: option.id, label: option.optionText })),
      })),
      response: existing ? {
        id: existing.id,
        selections: existing.items.map((item) => ({ checklistId: item.checklistId, optionId: item.optionId })),
        submittedAt: existing.submittedAt,
      } : null,
    });
  } catch (error) {
    console.error('Load 3-16 student assessment error:', error);
    return ApiResponse.error('Unable to load assessment.', 500, error);
  }
}
