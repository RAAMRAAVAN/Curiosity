import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { getUserFromRequest } from '@/server/auth';

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    const userId = user?.userId || user?.id;
    if (!userId) {
      return ApiResponse.error('Authentication required', 401);
    }

    const teacher = await prisma.teacher.findFirst({ where: { userId } });
    if (!teacher) {
      return ApiResponse.error('Teacher account not found', 404);
    }

    const requests = await prisma.assessmentReattemptRequest.findMany({
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            subject: { select: { subjectName: true } },
            class: { select: { className: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return ApiResponse.success(requests);
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to load teacher assessment requests', 500, error);
  }
}
