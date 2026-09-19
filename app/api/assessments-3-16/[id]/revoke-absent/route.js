import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

export async function PATCH(req, { params }) {
  try {
    const auth = await requireAdminPermission(req, 'assessments316.absent.revoke');
    if (!auth.ok) {
      return ApiResponse.error(auth.message, auth.status);
    }

    const { id: assessmentId } = await params;
    const body = await req.json();
    const userIds = Array.isArray(body?.userIds) ? body.userIds : [];

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    if (!userIds.length) {
      return ApiResponse.error('User IDs array is required and must not be empty', 400);
    }

    const assessment = await prisma.assessment316.findUnique({
      where: { id: assessmentId, status: true },
      select: {
        id: true,
        allowedClasses: {
          select: {
            classId: true,
            class: { select: { id: true, className: true } },
          },
        },
      },
    });

    if (!assessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    const visibleClassIds = assessment.allowedClasses.map((item) => String(item.classId));
    const allowedClassNames = Array.from(
      new Set(
        assessment.allowedClasses
          .map((item) => item.class?.className)
          .filter((value) => typeof value === 'string' && value.trim())
      )
    );
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

    const students = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        role: 'STUDENT',
        status: true,
        student: {
          OR: [
            { studyingClass: { in: visibleClassIds } },
            ...(allowedClassNames.length ? [{ studyingClass: { in: allowedClassNames } }] : []),
          ],
          ...(scopedCenterId ? { centerId: scopedCenterId } : {}),
        },
      },
      select: { id: true },
    });

    if (!students.length) {
      return ApiResponse.error('No valid students found', 400);
    }

    const deletedRecords = await prisma.assessment316Attendance.deleteMany({
      where: {
        assessmentId,
        userId: { in: students.map((student) => student.id) },
        status: 'ABSENT',
      },
    });

    return ApiResponse.success({ revokedCount: deletedRecords.count }, `Successfully revoked absent status for ${deletedRecords.count} student(s)`);
  } catch (error) {
    console.error('Revoke 3-16 absent error:', error);
    return ApiResponse.error(error.message || 'Unable to revoke absent status', 500);
  }
}
