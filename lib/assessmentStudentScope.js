export const getAssessmentVisibleClassValues = (assessment, accessibleCenterIds = null, assignedClassIds = null) => {
  const allowedClasses = Array.isArray(assessment?.allowedClasses) ? assessment.allowedClasses : [];
  const classes = [
    assessment?.class || {
      id: assessment?.classId,
      className: assessment?.className,
      centerId: assessment?.classCenterId,
    },
    ...allowedClasses.map((item) => item?.class || {
      id: item?.classId,
      className: item?.className,
      centerId: item?.centerId,
    }),
  ].filter((item) => item?.id);

  const visibleClasses = classes.filter((item) => {
    if (accessibleCenterIds !== null && item.centerId
      && !accessibleCenterIds.includes(String(item.centerId).trim())) return false;
    if (assignedClassIds !== null && !assignedClassIds.includes(String(item.id))) return false;
    return true;
  });

  return Array.from(new Set(
    visibleClasses.flatMap((item) => [item.id, item.className])
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  ));
};