import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { buildAssessment316ResultSummary } from '@/lib/assessment316Results';

const getMostSelectedOption = (responses = []) => {
  const counts = new Map();

  responses.forEach((response) => {
    (response?.items || []).forEach((item) => {
      const value = item?.option?.optionText || item?.optionText || item?.optionId || 'No data';
      if (!value) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });
  });

  if (!counts.size) return 'No data';

  const [label] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return label;
};

export async function GET(req) {
  try {
    const auth = await requireAdminPermission(req, 'results.view');
    if (!auth.ok) {
      return ApiResponse.error(auth.message, auth.status);
    }

    const assessments = await prisma.assessment316.findMany({
      where: { status: true },
      include: {
        allowedClasses: {
          include: { class: { select: { id: true, className: true } } },
        },
        subjects: {
          include: { subject: { select: { id: true, subjectName: true, classId: true } } },
        },
        responses: {
          where: { status: true },
          include: {
            items: {
              include: {
                option: { select: { id: true, optionText: true } },
              },
            },
          },
        },
        attendances: {
          where: { status: 'ABSENT' },
          select: { userId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summaries = await Promise.all(
      assessments.map(async (assessment) => {
        const classNames = Array.from(
          new Set(
            (assessment.allowedClasses || [])
              .map((item) => item.class?.className)
              .filter(Boolean)
          )
        );

        const subjectNames = Array.from(
          new Set(
            (assessment.subjects || [])
              .map((item) => item.subject?.subjectName)
              .filter(Boolean)
          )
        );

        const eligibleStudents = await prisma.user.findMany({
          where: {
            role: 'STUDENT',
            status: true,
            student: {
              OR: [
                ...(classNames.length ? [{ studyingClass: { in: classNames } }] : []),
                ...(assessment.allowedClasses.length
                  ? [{ studyingClass: { in: assessment.allowedClasses.map((item) => String(item.classId)) } }]
                  : []),
              ],
            },
          },
          select: { id: true },
        });

        const attemptedUserIds = new Set(
          assessment.responses.map((response) => response.userId).filter(Boolean)
        );

        const absentUserIds = new Set(
          (assessment.attendances || []).map((attendance) => attendance.userId).filter(Boolean)
        );

        const pendingCount = eligibleStudents.filter(
          (student) => !attemptedUserIds.has(student.id) && !absentUserIds.has(student.id)
        ).length;

        const appearedCount = Array.from(attemptedUserIds).filter(
          (userId) => !absentUserIds.has(userId)
        ).length;

        const firstResponseSummary = assessment.responses?.[0]
          ? buildAssessment316ResultSummary(
              assessment.responses[0].items || [],
              new Map((assessment.responses[0].items || []).map((item) => [String(item?.checklistId || ''), item?.checklist?.itemText || 'Field'])),
              new Map((assessment.responses[0].items || []).map((item) => [String(item?.optionId || ''), item?.option?.optionText || 'No value']))
            )
          : 'No data';

        return {
          id: assessment.id,
          title: assessment.title || 'Untitled assessment',
          className: classNames.join(', ') || 'N/A',
          subjectName: subjectNames.join(', ') || 'N/A',
          appearedCount,
          pendingCount,
          absentCount: (assessment.attendances || []).length,
          result: getMostSelectedOption(assessment.responses) || firstResponseSummary,
        };
      })
    );

    return ApiResponse.success(summaries, 'Assessment results loaded successfully.');
  } catch (error) {
    console.error('Load 3-16 assessment results error:', error);
    return ApiResponse.error('Unable to load assessment results.', 500, error);
  }
}
