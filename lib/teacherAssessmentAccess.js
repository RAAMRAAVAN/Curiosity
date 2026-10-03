export async function teacherCanAccessAssessment(prisma, assessmentId, actor) {
  if (!actor?.isTeacher) return true;
  if (!assessmentId) return false;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: actor.userId },
    select: { id: true, user: { select: { classAccesses: { where: { status: true }, select: { classId: true } } } } },
  });
  if (!teacher) return false;
  const assignedClassIds = teacher.user.classAccesses.map((access) => access.classId);
  if (!assignedClassIds.length) return false;

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      status: true,
      classId: { in: assignedClassIds },
      subject: {
        teacherSubjects: {
          some: {
            teacherId: teacher.id,
            status: true,
          },
        },
      },
    },
    select: { id: true },
  });

  return Boolean(assessment);
}

export async function teacherCanAccessSubject(prisma, subjectId, actor) {
  if (!actor?.isTeacher) return true;
  if (!subjectId) return false;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: actor.userId },
    select: { id: true },
  });
  if (!teacher) return false;

  const mapping = await prisma.teacherSubject.findFirst({
    where: {
      teacherId: teacher.id,
      subjectId,
      status: true,
      subject: {
        status: true,
        class: {
          userAccesses: { some: { userId: actor.userId, status: true } },
        },
      },
    },
    select: { id: true },
  });

  return Boolean(mapping);
}

export async function getTeacherAssignedClassValues(prisma, teacherId) {
  if (!teacherId) return [];

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      userId: true,
    },
  });
  if (!teacher) return [];

  const classAccesses = await prisma.userClassAccess.findMany({
    where: { userId: teacher.userId, status: true, class: { status: true } },
    select: { classId: true, class: { select: { className: true } } },
  });

  return Array.from(new Set(
    classAccesses.flatMap(({ classId, class: classRecord }) => [classId, classRecord?.className])
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  ));
}
