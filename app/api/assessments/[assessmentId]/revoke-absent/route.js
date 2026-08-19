import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { teacherCanAccessAssessment } from '@/lib/teacherAssessmentAccess';

export async function PATCH(req, { params }) {
  try {
    const auth = await requireAdminPermission(req, 'assessments.pending.appear');
    if (!auth.ok) {
      return ApiResponse.error(auth.message, auth.status);
    }

    const { assessmentId } = await params;
    const body = await req.json();
    const { userIds = [] } = body;

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    if (!(await teacherCanAccessAssessment(prisma, assessmentId, auth.actor))) {
      return ApiResponse.error('You are not authorized to manage this assessment.', 403);
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return ApiResponse.error('User IDs array is required and must not be empty', 400);
    }

    let scopedCenterId = null;
    if (auth.actor.isTeacher) {
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: auth.actor.userId },
        select: { centerId: true },
      });

      if (!teacherProfile?.centerId) {
        return ApiResponse.error('Teacher account is not mapped to any center.', 400);
      }

      scopedCenterId = teacherProfile.centerId;
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId, status: true },
      select: {
        id: true,
        classId: true,
        class: { select: { id: true, className: true, centerId: true } },
        allowedClasses: {
          where: { active: true },
          select: {
            classId: true,
            class: { select: { id: true, className: true, centerId: true } },
          },
        },
      },
    });

    if (!assessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    const visibleClasses = [
      assessment.class,
      ...assessment.allowedClasses.map((item) => item.class),
    ].filter(Boolean);

    const visibleClassIds = Array.from(new Set(visibleClasses.map((item) => item.id).filter(Boolean)));
    const visibleCenterIds = Array.from(new Set(visibleClasses.map((item) => item.centerId).filter(Boolean)));

    if (!auth.actor.isAdmin) {
      const managementAccessibleCenters = Array.isArray(auth.actor.assignedCenterIds)
        ? auth.actor.assignedCenterIds.map((centerId) => String(centerId).trim()).filter(Boolean)
        : [];

      if (auth.actor.isTeacher && scopedCenterId) {
        const allowedVisibleClassIds = visibleClasses
          .filter((item) => !item.centerId || item.centerId === scopedCenterId)
          .map((item) => item.id)
          .filter(Boolean);

        if (!allowedVisibleClassIds.length) {
          return ApiResponse.error('Forbidden', 403);
        }

        if (visibleCenterIds.length && !visibleCenterIds.includes(scopedCenterId)) {
          return ApiResponse.error('Forbidden', 403);
        }
      } else if (!auth.actor.isTeacher && managementAccessibleCenters.length > 0) {
        const accessibleVisibleClassIds = visibleClasses
          .filter((item) => !item.centerId || managementAccessibleCenters.includes(String(item.centerId).trim()))
          .map((item) => item.id)
          .filter(Boolean);

        if (!accessibleVisibleClassIds.length) {
          return ApiResponse.error('You are not authorized to perform this operation.', 403);
        }
      } else if (!auth.actor.isTeacher && managementAccessibleCenters.length === 0) {
        return ApiResponse.error('You are not authorized to perform this operation.', 403);
      }
    }

    const students = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        role: 'STUDENT',
        status: true,
        student: {
          studyingClass: { in: visibleClassIds },
          ...(scopedCenterId ? { centerId: scopedCenterId } : {}),
        },
      },
      select: { id: true },
    });

    if (students.length === 0) {
      return ApiResponse.error('No valid students found', 400);
    }

    const deletedRecords = await prisma.assessmentAttendance.deleteMany({
      where: {
        assessmentId,
        userId: { in: students.map((s) => s.id) },
        status: 'ABSENT',
      },
    });

    return ApiResponse.success(
      {
        revokedCount: deletedRecords.count,
      },
      `Successfully revoked absent status for ${deletedRecords.count} student(s)`
    );
  } catch (error) {
    console.error('Revoke absent error:', error);
    return ApiResponse.error(error.message || 'Unable to revoke absent status', 500);
  }
}
