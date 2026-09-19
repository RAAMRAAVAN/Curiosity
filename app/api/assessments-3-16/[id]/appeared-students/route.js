import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

const normalizeStudent = (student) => {
  if (!student || !student.student) return student;
  return {
    ...student,
    student: {
      ...student.student,
      center: student.student.center
        ? {
            ...student.student.center,
            centerName: student.student.center.name || student.student.center.centerName || 'N/A',
          }
        : null,
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

  return students.reduce((acc, rawStudent) => {
    const student = normalizeStudent(rawStudent);
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
    const auth = await requireAdminPermission(req, 'assessments316.appeared.view');
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

    const appearedUserIds = await prisma.assessment316Response.findMany({
      where: { assessmentId, status: true },
      select: { userId: true },
    });

    const appearedStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        status: true,
        id: { in: appearedUserIds.map((item) => item.userId) },
        student: {
          OR: [
            { studyingClass: { in: visibleClassIds } },
            ...(allowedClassNames.length ? [{ studyingClass: { in: allowedClassNames } }] : []),
          ],
          ...(scopedCenterId ? { centerId: scopedCenterId } : {}),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        student: { select: { studyingClass: true, centerId: true, center: { select: { id: true, name: true } } } },
      },
      orderBy: [{ name: 'asc' }],
    });

    return ApiResponse.success(await groupStudentsByClass(appearedStudents));
  } catch (error) {
    console.error('Appeared 3-16 students error:', error);
    return ApiResponse.error('Unable to load appeared students', 500, error);
  }
}
