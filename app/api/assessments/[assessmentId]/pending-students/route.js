import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

export async function GET(req, { params }) {
  try {
    const auth = await requireAdminPermission(req, 'assessments.pending.view');
    if (!auth.ok) {
      return ApiResponse.error(auth.message, auth.status);
    }

    const { assessmentId } = await params;

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

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId, status: true },
      select: {
        id: true,
        classId: true,
        class: { select: { centerId: true } },
      },
    });

    if (!assessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    if (scopedCenterId && assessment.class?.centerId && assessment.class.centerId !== scopedCenterId) {
      return ApiResponse.error('Forbidden', 403);
    }

    // For non-teachers (management/admin), verify center access
    // If class has a center, verify the user can access it
    // If class has no center, allow access if user has permission
    if (!auth.actor.isAdmin && !scopedCenterId && assessment.class?.centerId) {
      if (!auth.actor.canAccessCenter(assessment.class.centerId)) {
        return ApiResponse.error('You are not authorized to perform this operation.', 403);
      }
    }

    const [eligibleStudents, attemptedResults] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: 'STUDENT',
          status: true,
          student: {
            studyingClass: assessment.classId,
            ...(scopedCenterId ? { centerId: scopedCenterId } : {}),
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          student: { select: { studyingClass: true } },
        },
        orderBy: [{ student: { studyingClass: 'asc' } }, { name: 'asc' }],
      }),
      prisma.assessmentResult.findMany({
        where: {
          assessmentId,
          status: true,
          ...(scopedCenterId
            ? {
                user: {
                  student: {
                    centerId: scopedCenterId,
                  },
                },
              }
            : {}),
        },
        select: {
          userId: true,
        },
      }),
    ]);

    const attemptedUserIds = new Set(attemptedResults.map((result) => result.userId));
    const pendingStudents = eligibleStudents.filter((student) => !attemptedUserIds.has(student.id));

    const studyingClassValues = Array.from(
      new Set(
        pendingStudents
          .map((student) => student.student?.studyingClass)
          .filter((value) => typeof value === 'string' && value.trim())
      )
    );

    const classRecords = studyingClassValues.length
      ? await prisma.class.findMany({
          where: {
            OR: [
              { id: { in: studyingClassValues } },
              { className: { in: studyingClassValues } },
            ],
          },
          select: {
            id: true,
            className: true,
          },
        })
      : [];

    const classNameMap = classRecords.reduce((acc, item) => {
      acc[item.id] = item.className;
      acc[item.className] = item.className;
      return acc;
    }, {});

    const groupedStudents = pendingStudents.reduce((acc, student) => {
      const studyingClass = student.student?.studyingClass?.trim();
      const classLabel = studyingClass
        ? classNameMap[studyingClass] || studyingClass
        : 'Unassigned';
      const existingGroup = acc.find((group) => group.className === classLabel);

      if (existingGroup) {
        existingGroup.students.push(student);
      } else {
        acc.push({
          className: classLabel,
          students: [student],
        });
      }

      return acc;
    }, []);

    return ApiResponse.success(groupedStudents);
  } catch (error) {
    console.error('Pending students error:', error);
    return ApiResponse.error('Unable to load pending students', 500, error);
  }
}
