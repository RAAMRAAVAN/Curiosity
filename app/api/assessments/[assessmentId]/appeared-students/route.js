import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getTeacherAssignedClassValues, teacherCanAccessAssessment } from '@/lib/teacherAssessmentAccess';

const normalizeStudentCenter = (studentRecord) => {
  if (!studentRecord || !studentRecord.student) return studentRecord;

  const center = studentRecord.student.center
    ? {
        ...studentRecord.student.center,
        centerName: studentRecord.student.center.name || studentRecord.student.center.centerName || 'N/A',
      }
    : null;

  return {
    ...studentRecord,
    centerName: center?.centerName || studentRecord.centerName || 'N/A',
    student: {
      ...studentRecord.student,
      center,
    },
  };
};

export async function GET(req, { params }) {
  try {
    const auth = await requireAdminPermission(req, 'assessments.appeared.view');
    if (!auth.ok) {
      return ApiResponse.error(auth.message, auth.status);
    }

    const { assessmentId } = await params;

    let scopedCenterId = null;
    let teacherAssignedClassValues = [];
    if (auth.actor.isTeacher) {
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: auth.actor.userId },
        select: { id: true, centerId: true },
      });

      if (!teacherProfile?.centerId) {
        return ApiResponse.error('Teacher account is not mapped to any center.', 400);
      }

      scopedCenterId = teacherProfile.centerId;
  teacherAssignedClassValues = await getTeacherAssignedClassValues(prisma, teacherProfile.id);
    }

    const accessibleCenterIds = auth.actor.isAdmin
      ? null
      : Array.from(new Set(
          (scopedCenterId
            ? [scopedCenterId]
            : Array.isArray(auth.actor.assignedCenterIds) ? auth.actor.assignedCenterIds : [])
            .map((centerId) => String(centerId).trim())
            .filter(Boolean)
        ));
    if (accessibleCenterIds && accessibleCenterIds.length === 0) {
      return ApiResponse.error('You are not authorized to perform this operation.', 403);
    }

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    if (!(await teacherCanAccessAssessment(prisma, assessmentId, auth.actor))) {
      return ApiResponse.error('You are not authorized to view this assessment.', 403);
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId, status: true },
      select: {
        id: true,
        class: { select: { id: true, className: true, centerId: true } },
        allowedClasses: {
          where: { active: true },
          select: { classId: true, class: { select: { id: true, className: true, centerId: true } } },
        },
      },
    });

    if (!assessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    const visibleClasses = [assessment.class, ...assessment.allowedClasses.map((item) => item.class)].filter(Boolean);
    const assignedVisibleClasses = auth.actor.isTeacher
      ? visibleClasses.filter((item) =>
          (!item.centerId || item.centerId === scopedCenterId)
          && teacherAssignedClassValues.includes(String(item.id))
        )
      : auth.actor.isAdmin
        ? visibleClasses
        : visibleClasses.filter((item) =>
            !item.centerId || accessibleCenterIds.includes(String(item.centerId).trim())
          );
    const visibleClassValues = Array.from(new Set(
      assignedVisibleClasses.flatMap((item) => [item.id, item.className]).filter(Boolean)
    ));
    if (!visibleClassValues.length) {
      return ApiResponse.error('You are not authorized to view students in this assessment.', 403);
    }

    if (!auth.actor.isAdmin && assessment.class?.centerId
      && !accessibleCenterIds.includes(String(assessment.class.centerId).trim())) {
      return ApiResponse.error('Forbidden', 403);
    }

    const resultStudentFilter = {
      ...(accessibleCenterIds === null ? {} : { centerId: { in: accessibleCenterIds } }),
      studyingClass: { in: visibleClassValues },
    };
    const resultCenterFilter = { user: { student: resultStudentFilter } };

    const appearedResults = await prisma.assessmentResult.findMany({
      where: {
        assessmentId,
        status: true,
        ...resultCenterFilter,
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
        ...(Object.keys(resultStudentFilter).length ? { student: resultStudentFilter } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        student: { select: { studyingClass: true, centerId: true, center: { select: { id: true, name: true } } } },
      },
      orderBy: [{ name: 'asc' }],
    });

    const studyingClassValues = Array.from(
      new Set(
        students
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

    const normalizedStudents = students.map(normalizeStudentCenter);

    const groupedStudents = normalizedStudents.reduce((acc, student) => {
      const studyingClassId = student.student?.studyingClass?.trim();
      const classLabel = studyingClassId
        ? classNameMap[studyingClassId] || studyingClassId
        : 'Unassigned';
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
