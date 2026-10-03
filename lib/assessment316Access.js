export const getAssessment316AccessibleCenterIds = (actor) => {
  if (actor?.isAdmin) return null;

  return Array.from(new Set(
    (Array.isArray(actor?.assignedCenterIds) ? actor.assignedCenterIds : [])
      .map((id) => String(id).trim())
      .filter(Boolean)
  ));
};

export const getAssessment316TeacherAssignments = async (prisma, actor) => {
  if (!actor?.isTeacher) return null;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: actor.userId },
    select: { id: true },
  });
  if (!teacher) return { classIds: [], classValues: [], subjectMappings: [] };

  const classAccesses = await prisma.userClassAccess.findMany({
    where: { userId: actor.userId, status: true, class: { status: true } },
    select: { classId: true, class: { select: { className: true } } },
  });
  const classIds = Array.from(new Set(classAccesses.map((item) => item.classId)));
  const subjectMappings = classIds.length
    ? await prisma.teacherSubject.findMany({
        where: {
          teacherId: teacher.id,
          status: true,
          subject: { status: true, classId: { in: classIds } },
        },
        select: { subjectId: true, subject: { select: { classId: true } } },
      })
    : [];

  return {
    classIds,
    classValues: Array.from(new Set(
      classAccesses.flatMap(({ classId, class: classRecord }) => [classId, classRecord?.className])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )),
    subjectMappings: subjectMappings.map((item) => ({ subjectId: item.subjectId, classId: item.subject.classId })),
  };
};

export const getAssessment316TeacherVisibleClasses = (assessment, assignments) => {
  const allowedClasses = Array.isArray(assessment?.allowedClasses) ? assessment.allowedClasses : [];
  if (!assignments) return allowedClasses;

  const assessmentSubjects = Array.isArray(assessment?.subjects) ? assessment.subjects : [];
  return allowedClasses.filter((allowedClass) => {
    const classId = String(allowedClass?.classId || allowedClass?.class?.id || '');
    if (!classId || !assignments.classIds.includes(classId)) return false;

    return assignments.subjectMappings.some((mapping) =>
      mapping.classId === classId
      && assessmentSubjects.some((item) =>
        String(item.subjectId) === mapping.subjectId
        && String(item.subject?.classId || classId) === classId
      )
    );
  });
};

export const canTeacherAccessAssessment316 = (assessment, assignments) =>
  !assignments || getAssessment316TeacherVisibleClasses(assessment, assignments).length > 0;

export const getAssessment316VisibleClassValues = (assessment, assignments) => Array.from(new Set(
  getAssessment316TeacherVisibleClasses(assessment, assignments)
    .flatMap((item) => [item.classId, item.class?.id, item.class?.className])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
));