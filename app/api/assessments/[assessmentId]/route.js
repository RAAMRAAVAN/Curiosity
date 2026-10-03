import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { getAssessmentMetadata } from '@/lib/assessmentCompatibility';
import { requireAdminPermission } from '@/lib/adminRbac';
import { teacherCanAccessAssessment } from '@/lib/teacherAssessmentAccess';

export async function GET(req, { params }) {
  try {
    const { assessmentId } = await params;

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        status: true,
      },
      include: {
        questions: {
          where: { status: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            options: {
              where: { status: true },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!assessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    const metadata = await getAssessmentMetadata(prisma, assessment.id);
    const derivedTotalMarks = (assessment.questions || []).reduce((sum, question) => sum + (Number(question?.marks) || 0), 0);

    return ApiResponse.success({
      ...assessment,
      totalMarks: Number(metadata.totalMarks || assessment.totalMarks || derivedTotalMarks || 0),
      gradeBands: metadata.gradeBands || assessment.gradeBands || null,
    });
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to load assessment', 500, error);
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'assessments.delete');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { assessmentId } = await params;
    if (!assessmentId) return ApiResponse.error('Assessment ID is required', 400);

    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, status: true },
      select: { id: true },
    });
    if (!assessment) return ApiResponse.error('Assessment not found', 404);

    if (!(await teacherCanAccessAssessment(prisma, assessmentId, auth.actor))) {
      return ApiResponse.error('You are not authorized to delete this assessment.', 403);
    }

    const deletedResultCount = await prisma.$transaction(async (tx) => {
      const deletedResults = await tx.assessmentResult.deleteMany({ where: { assessmentId } });
      await tx.assessment.update({
        where: { id: assessmentId },
        data: { status: false },
      });
      return deletedResults.count;
    });

    return ApiResponse.success(
      { id: assessmentId, deletedResultCount },
      'Assessment and its results deleted successfully.'
    );
  } catch (error) {
    console.error('Delete assessment error:', error);
    return ApiResponse.error('Unable to delete assessment.', 500, error);
  }
}
