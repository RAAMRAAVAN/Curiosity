import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

const normalizeStudentCenter = (studentRecord) => {
  if (!studentRecord || !studentRecord.student) return studentRecord;

  const center = studentRecord.student.center
    ? {
        ...studentRecord.student.center,
        centerName: studentRecord.student.center.name || null,
      }
    : null;

  return {
    ...studentRecord,
    student: {
      ...studentRecord.student,
      center,
    },
  };
};

const groupPendingStudentsByClass = async (students = []) => {
  const classIds = Array.from(
    new Set(
      students
        .map((student) => student?.student?.studyingClass)
        .filter((value) => typeof value === 'string' && value.trim())
    )
  );

  const classRecords = classIds.length
    ? await prisma.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, className: true },
      })
    : [];

  const classNameMap = classRecords.reduce((acc, item) => {
    acc[item.id] = item.className;
    return acc;
  }, {});

  return students.reduce((acc, student) => {
    const studyingClassId = student?.student?.studyingClass?.trim();
    const classLabel = studyingClassId ? classNameMap[studyingClassId] || studyingClassId : 'Unassigned';
    const existingGroup = acc.find((group) => group.className === classLabel);

    if (existingGroup) {
      existingGroup.students.push(student);
    } else {
      acc.push({ className: classLabel, students: [student] });
    }

    return acc;
  }, []);
};

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

        const studentClassIds = allowedVisibleClassIds;

        const [eligibleStudents, attemptedResults, absentResults] = await Promise.all([
          prisma.user.findMany({
            where: {
              role: 'STUDENT',
              status: true,
              student: {
                studyingClass: { in: studentClassIds },
                centerId: scopedCenterId,
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
              student: { select: { studyingClass: true, centerId: true, center: { select: { id: true, name: true } } } },
            },
            orderBy: [{ student: { studyingClass: 'asc' } }, { name: 'asc' }],
          }),
          prisma.assessmentResult.findMany({
            where: {
              assessmentId,
              status: true,
              user: {
                student: { centerId: scopedCenterId },
              },
            },
            select: { userId: true },
          }),
          prisma.assessmentAttendance.findMany({
            where: {
              assessmentId,
              status: 'ABSENT',
            },
            select: { userId: true },
          }),
        ]);

        const attemptedUserIds = new Set(attemptedResults.map((result) => result.userId));
        const absentUserIds = new Set(absentResults.map((result) => result.userId));
        const pendingStudents = eligibleStudents
          .map(normalizeStudentCenter)
          .filter((student) => !attemptedUserIds.has(student.id) && !absentUserIds.has(student.id));
        const groupedStudents = await groupPendingStudentsByClass(pendingStudents);

        return ApiResponse.success(groupedStudents);
      }

      if (!auth.actor.isTeacher && managementAccessibleCenters.length > 0) {
        const accessibleVisibleClassIds = visibleClasses
          .filter((item) => !item.centerId || managementAccessibleCenters.includes(String(item.centerId).trim()))
          .map((item) => item.id)
          .filter(Boolean);

        if (!accessibleVisibleClassIds.length) {
          return ApiResponse.error('You are not authorized to perform this operation.', 403);
        }

        const [eligibleStudents, attemptedResults, absentResults] = await Promise.all([
          prisma.user.findMany({
            where: {
              role: 'STUDENT',
              status: true,
              student: {
                studyingClass: { in: accessibleVisibleClassIds },
                centerId: { in: managementAccessibleCenters },
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
              student: { select: { studyingClass: true, centerId: true, center: { select: { id: true, name: true } } } },
            },
            orderBy: [{ student: { studyingClass: 'asc' } }, { name: 'asc' }],
          }),
          prisma.assessmentResult.findMany({
            where: {
              assessmentId,
              status: true,
              user: {
                student: {
                  centerId: { in: managementAccessibleCenters },
                },
              },
            },
            select: { userId: true },
          }),
          prisma.assessmentAttendance.findMany({
            where: {
              assessmentId,
              status: 'ABSENT',
            },
            select: { userId: true },
          }),
        ]);

        const attemptedUserIds = new Set(attemptedResults.map((result) => result.userId));
        const absentUserIds = new Set(absentResults.map((result) => result.userId));
        const pendingStudents = eligibleStudents
          .map(normalizeStudentCenter)
          .filter((student) => !attemptedUserIds.has(student.id) && !absentUserIds.has(student.id));
        const groupedStudents = await groupPendingStudentsByClass(pendingStudents);

        return ApiResponse.success(groupedStudents);
      }

      if (!auth.actor.isTeacher && managementAccessibleCenters.length === 0) {
        return ApiResponse.error('You are not authorized to perform this operation.', 403);
      }
    }

    const [eligibleStudents, attemptedResults, absentResults] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: 'STUDENT',
          status: true,
          student: {
            studyingClass: { in: visibleClassIds },
            ...(scopedCenterId ? { centerId: scopedCenterId } : {}),
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          student: { select: { studyingClass: true, centerId: true, center: { select: { id: true, name: true } } } },
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
      prisma.assessmentAttendance.findMany({
        where: {
          assessmentId,
          status: 'ABSENT',
        },
        select: { userId: true },
      }),
    ]);

    const attemptedUserIds = new Set(attemptedResults.map((result) => result.userId));
    const absentUserIds = new Set(absentResults.map((result) => result.userId));
    const pendingStudents = eligibleStudents
      .map((student) => ({
        ...student,
        student: student.student
          ? {
              ...student.student,
              center: student.student.center
                ? {
                    ...student.student.center,
                    centerName: student.student.center.name || null,
                  }
                : null,
            }
          : null,
      }))
      .filter((student) => !attemptedUserIds.has(student.id) && !absentUserIds.has(student.id));
    const groupedStudents = await groupPendingStudentsByClass(pendingStudents);

    return ApiResponse.success(groupedStudents);
  } catch (error) {
    console.error('Pending students error:', error);
    return ApiResponse.error('Unable to load pending students', 500, error);
  }
}
