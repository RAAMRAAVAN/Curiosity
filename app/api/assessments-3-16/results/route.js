import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { buildAssessment316ResultSummary } from '@/lib/assessment316Results';
import {
  canTeacherAccessAssessment316,
  getAssessment316AccessibleCenterIds,
  getAssessment316TeacherAssignments,
  getAssessment316TeacherVisibleClasses,
} from '@/lib/assessment316Access';

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

    const accessibleCenterIds = getAssessment316AccessibleCenterIds(auth.actor);
    const teacherAssignments = await getAssessment316TeacherAssignments(prisma, auth.actor);
    const studentCenterFilter = accessibleCenterIds === null
      ? {}
      : { centerId: { in: accessibleCenterIds } };
    const resultCenterFilter = accessibleCenterIds === null
      ? {}
      : { user: { student: studentCenterFilter } };

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
          where: { status: true, ...resultCenterFilter },
          include: {
            user: { select: { student: { select: { studyingClass: true, centerId: true } } } },
            items: {
              include: {
                option: { select: { id: true, optionText: true } },
              },
            },
          },
        },
        attendances: {
          where: { status: 'ABSENT', ...resultCenterFilter },
          select: {
            userId: true,
            user: { select: { student: { select: { studyingClass: true, centerId: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const visibleAssessments = assessments.filter((assessment) =>
      canTeacherAccessAssessment316(assessment, teacherAssignments)
    );
    const summaries = (await Promise.all(
      visibleAssessments.map(async (assessment) => {
        const visibleClasses = getAssessment316TeacherVisibleClasses(assessment, teacherAssignments);
        const visibleClassIds = new Set(visibleClasses.map((item) => String(item.classId)));
        const visibleClassValues = new Set(
          visibleClasses.flatMap((item) => [item.classId, item.class?.className]).filter(Boolean).map(String)
        );
        const visibleClassValueList = Array.from(visibleClassValues);
        const visibleSubjectIds = teacherAssignments
          ? new Set(teacherAssignments.subjectMappings
              .filter((mapping) => visibleClassIds.has(mapping.classId))
              .map((mapping) => mapping.subjectId))
          : null;
        const visibleResponses = assessment.responses.filter((response) => {
          if (!teacherAssignments) return true;
          const student = response.user?.student;
          return student
            && visibleClassValues.has(String(student.studyingClass || ''))
            && accessibleCenterIds.includes(String(student.centerId || ''));
        });
        const visibleAttendances = (assessment.attendances || []).filter((attendance) => {
          if (!teacherAssignments) return true;
          const student = attendance.user?.student;
          return student
            && visibleClassValues.has(String(student.studyingClass || ''))
            && accessibleCenterIds.includes(String(student.centerId || ''));
        });
        const classNames = Array.from(
          new Set(
            visibleClasses
              .map((item) => item.class?.className)
              .filter(Boolean)
          )
        );

        const subjectNames = Array.from(
          new Set(
            (assessment.subjects || []).filter((item) => !visibleSubjectIds || visibleSubjectIds.has(item.subjectId))
              .map((item) => item.subject?.subjectName)
              .filter(Boolean)
          )
        );

        const eligibleStudents = await prisma.user.findMany({
          where: {
            role: 'STUDENT',
            status: true,
            student: {
              studyingClass: { in: visibleClassValueList },
              ...studentCenterFilter,
            },
          },
          select: { id: true },
        });

        const attemptedUserIds = new Set(
          visibleResponses.map((response) => response.userId).filter(Boolean)
        );

        const absentUserIds = new Set(
          visibleAttendances.map((attendance) => attendance.userId).filter(Boolean)
        );

        const pendingCount = eligibleStudents.filter(
          (student) => !attemptedUserIds.has(student.id) && !absentUserIds.has(student.id)
        ).length;

        const appearedCount = attemptedUserIds.size;

        const firstResponseSummary = visibleResponses[0]
          ? buildAssessment316ResultSummary(
              visibleResponses[0].items || [],
              new Map((visibleResponses[0].items || []).map((item) => [String(item?.checklistId || ''), item?.checklist?.itemText || 'Field'])),
              new Map((visibleResponses[0].items || []).map((item) => [String(item?.optionId || ''), item?.option?.optionText || 'No value']))
            )
          : 'No data';

        return {
          id: assessment.id,
          title: assessment.title || 'Untitled assessment',
          className: classNames.join(', ') || 'N/A',
          subjectName: subjectNames.join(', ') || 'N/A',
          appearedCount,
          pendingCount,
          absentCount: visibleAttendances.length,
          result: getMostSelectedOption(visibleResponses) || firstResponseSummary,
        };
      })
    )).filter(Boolean);

    return ApiResponse.success(summaries, 'Assessment results loaded successfully.');
  } catch (error) {
    console.error('Load 3-16 assessment results error:', error);
    return ApiResponse.error('Unable to load assessment results.', 500, error);
  }
}
