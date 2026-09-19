import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

const buildAssessmentMaps = (checklist = []) => {
  const checklistMap = new Map();
  const optionMap = new Map();

  (checklist || []).forEach((item) => {
    if (item?.id) {
      checklistMap.set(String(item.id), item.itemText || 'Field');
    }

    (item?.options || []).forEach((option) => {
      if (option?.id) {
        optionMap.set(String(option.id), option.optionText || 'No value');
      }
    });
  });

  return { checklistMap, optionMap };
};

export async function GET(req, { params }) {
  try {
    const auth = await requireAdminPermission(req, 'results.view');
    if (!auth.ok) {
      return ApiResponse.error(auth.message, auth.status);
    }

    const { id: assessmentId } = await params;
    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    const assessment = await prisma.assessment316.findUnique({
      where: { id: assessmentId, status: true },
      select: {
        id: true,
        title: true,
        subjects: {
          include: { subject: { select: { id: true, subjectName: true } } },
        },
        checklist: {
          where: { status: true },
          orderBy: { displayOrder: 'asc' },
          include: { options: { where: { status: true }, orderBy: { displayOrder: 'asc' } } },
        },
      },
    });

    if (!assessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    const responses = await prisma.assessment316Response.findMany({
      where: { assessmentId, status: true },
      orderBy: { submittedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            student: {
              select: {
                studyingClass: true,
                center: { select: { id: true, name: true } },
              },
            },
          },
        },
        items: {
          include: {
            checklist: { select: { id: true, itemText: true } },
            option: { select: { id: true, optionText: true } },
          },
        },
      },
    });

    const subjectName = assessment.subjects?.[0]?.subject?.subjectName || 'N/A';
    const { checklistMap, optionMap } = buildAssessmentMaps(assessment?.checklist || []);

    const classIds = Array.from(
      new Set(
        responses
          .map((response) => response.user?.student?.studyingClass)
          .filter((value) => typeof value === 'string' && value.trim())
      )
    );

    const classRecords = classIds.length
      ? await prisma.class.findMany({
          where: { id: { in: classIds } },
          select: { id: true, className: true },
        })
      : [];

    const classMap = classRecords.reduce((acc, item) => {
      acc[item.id] = item.className;
      return acc;
    }, {});

    const mappedResults = responses.map((response) => {
      const selectedValues = (response.items || [])
        .map((item) => {
          const checklistId = String(item?.checklistId || '');
          const optionId = String(item?.optionId || '');
          const optionLabel = item?.option?.optionText || optionMap.get(optionId) || item?.optionId || 'No value';
          const checklistLabel = item?.checklist?.itemText || checklistMap.get(checklistId) || 'Field';
          return `${checklistLabel}: ${optionLabel}`;
        })
        .filter((value) => typeof value === 'string' && value.trim());

      const rawClassId = response.user?.student?.studyingClass;
      const resultSummary = selectedValues.length
        ? selectedValues.length === 1
          ? selectedValues[0].replace(/^[^:]+:\s*/, '')
          : selectedValues.join(' | ')
        : 'No data';

      const percentageValues = (response.items || [])
        .map((item) => {
          const checklist = assessment.checklist.find((entry) => String(entry.id) === String(item.checklistId));
          const options = checklist?.options || [];
          const totalOptions = options.length || 1;
          const selectedIndex = options.findIndex((option) => String(option.id) === String(item.optionId));
          if (selectedIndex === -1) return 0;
          return ((selectedIndex + 1) / totalOptions) * 100;
        })
        .filter((value) => Number.isFinite(value));

      const percentage = percentageValues.length
        ? Math.round((percentageValues.reduce((sum, value) => sum + value, 0) / percentageValues.length) * 100) / 100
        : 0;

      return {
        id: response.id,
        assessmentId: response.assessmentId,
        userId: response.userId,
        user: response.user
          ? {
              id: response.user.id,
              name: response.user.name,
              email: response.user.email,
            }
          : null,
        studentClassName: classMap[rawClassId] || rawClassId || 'N/A',
        studentCenterName: response.user?.student?.center?.name || 'N/A',
        subjectName,
        submittedAt: response.submittedAt,
        resultSummary,
        score: percentage,
        percentage,
      };
    });

    return ApiResponse.success(mappedResults, 'Assessment results loaded successfully.');
  } catch (error) {
    console.error('Load 3-16 assessment result rows error:', error);
    return ApiResponse.error('Unable to load assessment results.', 500, error);
  }
}
