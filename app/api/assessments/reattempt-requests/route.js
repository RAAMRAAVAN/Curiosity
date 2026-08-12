import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { getUserFromRequest } from '@/server/auth';
import { requireAdminPermission } from '@/lib/adminRbac';

export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    const userId = user?.userId || user?.id;
    if (!userId) {
      return ApiResponse.error('Authentication required', 401);
    }

    const requests = await prisma.assessmentReattemptRequest.findMany({
      where: user?.role === 'TEACHER' ? {} : { userId },
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
    return ApiResponse.error('Unable to load reattempt requests', 500, error);
  }
}

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    const userId = user?.userId || user?.id;
    if (!userId) {
      return ApiResponse.error('Authentication required', 401);
    }

    const body = await req.json();
    const { assessmentId, reason, userId: suppliedUserId } = body;

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    const effectiveUserId = userId || suppliedUserId;
    if (!effectiveUserId) {
      return ApiResponse.error('User is required', 400);
    }

    const existing = await prisma.assessmentReattemptRequest.findFirst({
      where: { assessmentId, userId: effectiveUserId, status: 'PENDING' },
    });

    if (existing) {
      return ApiResponse.error('A reattempt request is already pending', 400);
    }

    const request = await prisma.assessmentReattemptRequest.create({
      data: {
        assessmentId,
        userId: effectiveUserId,
        reason: reason?.trim() || null,
      },
    });

    return ApiResponse.success(request, 'Reattempt request submitted');
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to submit reattempt request', 500, error);
  }
}

export async function PATCH(req) {
  try {
    const auth = await requireAdminPermission(req, 'assessments.appeared.reappear');
    if (!auth.ok) {
      return ApiResponse.error(auth.message, auth.status);
    }

    const body = await req.json();
    const { requestId, status } = body;

    if (!requestId || !status) {
      return ApiResponse.error('Request ID and status are required', 400);
    }

    const request = await prisma.assessmentReattemptRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: auth.actor.userId,
      },
    });

    return ApiResponse.success(request, 'Reattempt request updated');
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to update reattempt request', 500, error);
  }
}
