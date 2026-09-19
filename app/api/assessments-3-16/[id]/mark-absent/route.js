import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

export async function POST(req, { params }) {
  try {
    const auth = await requireAdminPermission(req, 'assessments316.absent.mark');
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
      return ApiResponse.error('No valid students found for marking absent', 400);
    }

    const markedAt = new Date();
    const markedByUserId = auth.actor.userId;

    const records = await Promise.all(
      students.map((student) =>
        prisma.assessment316Attendance.upsert({
          where: { assessmentId_userId: { assessmentId, userId: student.id } },
          update: { status: 'ABSENT', reason: body?.reason || null, markedBy: markedByUserId, markedAt },
          create: { assessmentId, userId: student.id, status: 'ABSENT', reason: body?.reason || null, markedBy: markedByUserId, markedAt },
        })
      )
    );

    return ApiResponse.success({ markedCount: records.length, attendances: records }, `Successfully marked ${records.length} student(s) as absent`);
  } catch (error) {
    console.error('Mark 3-16 absent error:', error);
    return ApiResponse.error(error.message || 'Unable to mark students absent', 500);
  }
}
