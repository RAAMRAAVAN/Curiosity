export async function teacherCanAccessAssessment(prisma, assessmentId, actor) {
  if (!actor?.isTeacher) return true;
  if (!assessmentId) return false;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: actor.userId },
    select: { id: true },
  });
  if (!teacher) return false;

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      status: true,
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
    where: { teacherId: teacher.id, subjectId, status: true },
    select: { id: true },
  });

  return Boolean(mapping);
}
