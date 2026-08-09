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
      select: { id: true },
    });

    if (!assessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    const appearedResults = await prisma.assessmentResult.findMany({
      where: {
        assessmentId,
        status: true,
      },
      select: {
        userId: true,
      },
    });

    const appearedUserIds = new Set(appearedResults.map((result) => result.userId));

    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        status: true,
        id: { in: Array.from(appearedUserIds) },
      },
      select: {
        id: true,
        name: true,
        email: true,
        studyingClass: true,
      },
      orderBy: [{ studyingClass: 'asc' }, { name: 'asc' }],
    });

    const groupedStudents = students.reduce((acc, student) => {
      const classLabel = student.studyingClass?.trim() || 'Unassigned';
      const existingGroup = acc.find((group) => group.className === classLabel);

      if (existingGroup) {
        existingGroup.students.push(student);
      } else {
        acc.push({ className: classLabel, students: [student] });
      }

      return acc;
    }, []);

    return ApiResponse.success(groupedStudents);
  } catch (error) {
    console.error('Appeared students error:', error);
    return ApiResponse.error('Unable to load appeared students', 500, error);
  }
}
