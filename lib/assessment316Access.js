export const getAssessment316AccessibleCenterIds = (actor) => {
  if (actor?.isAdmin) return null;

  return Array.from(new Set(
    (Array.isArray(actor?.assignedCenterIds) ? actor.assignedCenterIds : [])
      .map((id) => String(id).trim())
      .filter(Boolean)
  ));
};