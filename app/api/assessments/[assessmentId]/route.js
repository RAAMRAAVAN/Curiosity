import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { getAssessmentMetadata } from '@/lib/assessmentCompatibility';

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
