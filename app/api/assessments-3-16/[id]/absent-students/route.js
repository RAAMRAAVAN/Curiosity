import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

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

const groupStudentsByClass = async (students = []) => {
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
    const classId = student?.student?.studyingClass?.trim();
    const classLabel = classId ? classNameMap[classId] || classId : 'Unassigned';
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
    const auth = await requireAdminPermission(req, 'assessments316.absent.view');
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

    const visibleClassIds = Array.from(
      new Set(assessment.allowedClasses.map((item) => String(item.classId)).filter(Boolean))
    );
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

    const absentRecords = await prisma.assessment316Attendance.findMany({
      where: {
        assessmentId,
        status: 'ABSENT',
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            student: { select: { studyingClass: true, centerId: true, center: { select: { id: true, name: true } } } },
          },
        },
        reason: true,
        markedAt: true,
      },
      orderBy: [{ user: { name: 'asc' } }],
    });

    const absentStudents = absentRecords
      .map((record) => {
        const student = {
          id: record.user.id,
          name: record.user.name,
          email: record.user.email,
          student: record.user.student,
          reason: record.reason,
          markedAt: record.markedAt,
        };
        return normalizeStudentCenter(student);
      })
      .filter((student) => {
        if (!student?.student?.studyingClass) return false;
        const classValue = String(student.student.studyingClass).trim();
        const classMatches = visibleClassIds.includes(classValue) || allowedClassNames.includes(classValue);
        return classMatches && (!scopedCenterId || String(student.student.centerId || '').trim() === String(scopedCenterId).trim());
      });

    return ApiResponse.success(await groupStudentsByClass(absentStudents));
  } catch (error) {
    console.error('Absent 3-16 students error:', error);
    return ApiResponse.error('Unable to load absent students', 500, error);
  }
}
