import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

const normalizeAbsentStudent = (student) => {
  const studentInfo = student?.student || {};
  const centerName = studentInfo?.center?.name || studentInfo?.center?.centerName || student?.centerName || 'N/A';
  const classId = studentInfo?.studyingClass || student?.studyingClass || null;

  return {
    ...student,
    centerName,
    className: student?.className || student?.studentClassName || studentInfo?.className || 'N/A',
    student: studentInfo
      ? {
          ...studentInfo,
          center: studentInfo.center
            ? {
                ...(studentInfo.center || {}),
                centerName: studentInfo.center.name || studentInfo.center.centerName || 'N/A',
              }
            : null,
        }
      : null,
  };
};

const groupAbsentStudentsByClass = async (students = []) => {
  const classIds = Array.from(
    new Set(
      students
        .map((student) => student?.student?.studyingClass || student?.studyingClass)
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

  return students.reduce((acc, rawStudent) => {
    const student = normalizeAbsentStudent(rawStudent);
    const studyingClassId = (student?.student?.studyingClass || student?.studyingClass || '').trim();
    const classLabel = studyingClassId ? classNameMap[studyingClassId] || student?.className || studyingClassId : student?.className || 'Unassigned';
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
    const auth = await requireAdminPermission(req, 'assessments.pending.appear');
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

        const absentRecords = await prisma.assessmentAttendance.findMany({
          where: {
            assessmentId,
            status: 'ABSENT',
            user: {
              student: {
                studyingClass: { in: allowedVisibleClassIds },
                centerId: scopedCenterId,
              },
            },
          },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                student: {
                  select: {
                    studyingClass: true,
                    centerId: true,
                    center: { select: { id: true, name: true } },
                  },
                },
              },
            },
            status: true,
            reason: true,
            markedAt: true,
          },
          orderBy: [{ user: { name: 'asc' } }],
        });

        const absentStudents = absentRecords.map((record) => ({
          id: record.user.id,
          name: record.user.name,
          email: record.user.email,
          student: record.user.student,
          attendanceId: record.id,
          reason: record.reason,
          markedAt: record.markedAt,
        }));

        const groupedStudents = await groupAbsentStudentsByClass(
          absentStudents.map((s) => ({ ...s, student: s.student }))
        );

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

        const absentRecords = await prisma.assessmentAttendance.findMany({
          where: {
            assessmentId,
            status: 'ABSENT',
            user: {
              student: {
                studyingClass: { in: accessibleVisibleClassIds },
                centerId: { in: managementAccessibleCenters },
              },
            },
          },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                student: {
                  select: {
                    studyingClass: true,
                    centerId: true,
                    center: { select: { id: true, name: true } },
                  },
                },
              },
            },
            status: true,
            reason: true,
            markedAt: true,
          },
          orderBy: [{ user: { name: 'asc' } }],
        });

        const absentStudents = absentRecords.map((record) => ({
          id: record.user.id,
          name: record.user.name,
          email: record.user.email,
          student: record.user.student,
          attendanceId: record.id,
          reason: record.reason,
          markedAt: record.markedAt,
        }));

        const groupedStudents = await groupAbsentStudentsByClass(
          absentStudents.map((s) => ({ ...s, student: s.student }))
        );

        return ApiResponse.success(groupedStudents);
      }

      if (!auth.actor.isTeacher && managementAccessibleCenters.length === 0) {
        return ApiResponse.error('You are not authorized to perform this operation.', 403);
      }
    }

    const absentRecords = await prisma.assessmentAttendance.findMany({
      where: {
        assessmentId,
        status: 'ABSENT',
        user: {
          student: {
            studyingClass: { in: visibleClassIds },
            ...(scopedCenterId ? { centerId: scopedCenterId } : {}),
          },
        },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            student: {
              select: {
                studyingClass: true,
                centerId: true,
                center: { select: { id: true, name: true } },
              },
            },
          },
        },
        status: true,
        reason: true,
        markedAt: true,
      },
      orderBy: [{ user: { name: 'asc' } }],
    });

    const absentStudents = absentRecords.map((record) => ({
      id: record.user.id,
      name: record.user.name,
      email: record.user.email,
      student: record.user.student
        ? {
            ...record.user.student,
            center: record.user.student.center
              ? {
                  ...record.user.student.center,
                  centerName: record.user.student.center.name || null,
                }
              : null,
          }
        : null,
      attendanceId: record.id,
      reason: record.reason,
      markedAt: record.markedAt,
    }));

    const groupedStudents = await groupAbsentStudentsByClass(
      absentStudents.map((s) => ({ ...s, student: s.student }))
    );

    return ApiResponse.success(groupedStudents);
  } catch (error) {
    console.error('Absent students error:', error);
    return ApiResponse.error('Unable to load absent students', 500, error);
  }
}
