import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { getUserFromRequest } from '@/server/auth';
import { canAccessAdminArea } from '@/lib/roleAccess';

export async function GET(req, { params }) {
  try {
    const authUser = getUserFromRequest(req);

    if (!authUser || !canAccessAdminArea(authUser)) {
      return ApiResponse.error('Unauthorized', 401);
    }

    const { assessmentId } = await params;

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId, status: true },
      select: {
        id: true,
        classId: true,
      },
    });

    if (!assessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    const [eligibleStudents, attemptedResults] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: 'STUDENT',
          status: true,
          studyingClass: assessment.classId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          studyingClass: true,
        },
        orderBy: [{ studyingClass: 'asc' }, { name: 'asc' }],
      }),
      prisma.assessmentResult.findMany({
        where: {
          assessmentId,
          status: true,
        },
        select: {
          userId: true,
        },
      }),
    ]);

    const attemptedUserIds = new Set(attemptedResults.map((result) => result.userId));
    const pendingStudents = eligibleStudents.filter((student) => !attemptedUserIds.has(student.id));

    const groupedStudents = pendingStudents.reduce((acc, student) => {
      const classLabel = student.studyingClass?.trim() || 'Unassigned';
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
