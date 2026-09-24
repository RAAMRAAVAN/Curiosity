import { prisma } from '@/server/prisma';
import { getUserFromRequest } from '@/server/auth';
import { ApiResponse } from '@/utils/apiResponse';
import { requireAdminPermission } from '@/lib/adminRbac';

const getUserId = (user) => user?.userId || user?.id || null;

const canTeacherSubmitForAnotherStudent = async (req, role) => {
  if (String(role || '').toUpperCase() !== 'TEACHER') return false;

  const allowedChecks = [
    requireAdminPermission(req, 'assessments316.pending.appear'),
    requireAdminPermission(req, 'assessments.pending.appear'),
  ];

  const results = await Promise.all(allowedChecks);
  return results.some((result) => result.ok);
};

export async function GET(req, { params }) {
  const user = getUserFromRequest(req);
  const currentUserId = getUserId(user);
  if (!currentUserId) return ApiResponse.error('Please sign in to view this assessment.', 401);

  try {
    const { id: assessmentId } = await params;
    const requestedUserId = new URL(req.url).searchParams.get('userId');
    const targetUserId = requestedUserId || currentUserId;
    const actorRole = String(user?.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'MANAGEMENT'].includes(actorRole);
    const isTeacherAccessAllowed = await canTeacherSubmitForAnotherStudent(req, actorRole);

    if (requestedUserId && requestedUserId !== currentUserId && !isPrivileged && !isTeacherAccessAllowed) {
      return ApiResponse.error('You are not allowed to view another student\'s assessment.', 403);
    }

    const assessment = await prisma.assessment316.findFirst({
      where: { id: assessmentId, status: true },
      include: {
        checklist: {
          where: { status: true },
          orderBy: { displayOrder: 'asc' },
          include: { options: { where: { status: true }, orderBy: { displayOrder: 'asc' } } },
        },
      },
    });

    if (!assessment) return ApiResponse.error('Assessment not found.', 404);

    const response = await prisma.assessment316Response.findUnique({
      where: { assessmentId_userId: { assessmentId, userId: targetUserId } },
      include: { items: { select: { checklistId: true, optionId: true } } },
    });

    return ApiResponse.success({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        checklist: assessment.checklist.map((item) => ({
          id: item.id,
          label: item.itemText,
          options: item.options.map((option) => ({ id: option.id, label: option.optionText })),
        })),
      },
      response: response
        ? {
            id: response.id,
            selections: response.items.map((item) => ({ checklistId: item.checklistId, optionId: item.optionId })),
            submittedAt: response.submittedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Load 3-16 assessment response error:', error);
    return ApiResponse.error('Unable to load assessment response.', 500, error);
  }
}

export async function POST(req, { params }) {
  const user = getUserFromRequest(req);
  const currentUserId = getUserId(user);
  if (!currentUserId) return ApiResponse.error('Please sign in to save your assessment.', 401);

  try {
    const { id: assessmentId } = await params;
    const body = await req.json();
    const requestedUserId = body?.userId ? String(body.userId).trim() : null;
    const targetUserId = requestedUserId || currentUserId;
    const actorRole = String(user?.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'MANAGEMENT'].includes(actorRole);
    const isTeacherAccessAllowed = await canTeacherSubmitForAnotherStudent(req, actorRole);

    if (requestedUserId && requestedUserId !== currentUserId && !isPrivileged && !isTeacherAccessAllowed) {
      return ApiResponse.error('You are not allowed to submit this assessment for another student.', 403);
    }

    const assessment = await prisma.assessment316.findFirst({
      where: { id: assessmentId, status: true },
      include: {
        allowedClasses: true,
        checklist: {
          where: { status: true },
          include: { options: { where: { status: true } } },
        },
      },
    });
    if (!assessment) return ApiResponse.error('Assessment not found.', 404);

    const profile = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, student: { select: { studyingClass: true, status: true } } },
    });

    if (!isPrivileged) {
      if (!profile || String(profile.role).toUpperCase() !== 'STUDENT' || profile.student?.status === false) {
        return ApiResponse.error('Only eligible students can save this assessment.', 403);
      }
      const classValue = String(profile.student?.studyingClass || '').trim();
      const matchingClass = await prisma.class.findFirst({ where: { OR: [{ id: classValue }, { className: classValue }] }, select: { id: true } });
      if (assessment.allowedClasses.length && (!matchingClass || !assessment.allowedClasses.some((item) => item.classId === matchingClass.id))) {
        return ApiResponse.error('You are not eligible for this assessment.', 403);
      }
    }

    const selections = Array.isArray(body?.selections) ? body.selections : [];
    const selectionMap = new Map(selections.map((item) => [String(item?.checklistId || ''), String(item?.optionId || '')]));

    if (selectionMap.size !== assessment.checklist.length) {
      return ApiResponse.error('Select one option for every evaluation field.', 400);
    }

    const responseItems = assessment.checklist.map((checklist) => {
      const optionId = selectionMap.get(String(checklist.id));
      const option = checklist.options.find((item) => item.id === optionId);
      if (!option) throw new Error(`Choose an option for ${checklist.itemText}.`);
      return { checklistId: checklist.id, optionId: option.id };
    });

    const saved = await prisma.$transaction(async (tx) => {
      const response = await tx.assessment316Response.upsert({
        where: { assessmentId_userId: { assessmentId, userId: targetUserId } },
        create: { assessmentId, userId: targetUserId },
        update: { submittedAt: new Date(), status: true },
      });
      await tx.assessment316ResponseItem.deleteMany({ where: { responseId: response.id } });
      await tx.assessment316ResponseItem.createMany({
        data: responseItems.map((item) => ({ ...item, responseId: response.id })),
      });
      return tx.assessment316Response.findUnique({
        where: { id: response.id },
        include: { items: { select: { checklistId: true, optionId: true } } },
      });
    });

    return ApiResponse.success(saved, 'Assessment saved successfully.');
  } catch (error) {
    console.error('Save 3-16 assessment response error:', error);
    return ApiResponse.error(error.message || 'Unable to save assessment.', 400);
  }
}
