import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';

export async function GET(req, { params }) {
  try {
    const { id, assessmentId } = await params;

    if (!id || !assessmentId) {
      return ApiResponse.error('Subject and assessment IDs are required', 400);
    }

    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        subjectId: id,
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

    return ApiResponse.success(assessment);
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to load assessment', 500, error);
  }
}
