export function normalizeRole(role) {
  return typeof role === "string" ? role.toUpperCase() : "";
}

export function hasAnyRole(user, allowedRoles = []) {
  const role = normalizeRole(user?.role);

  return allowedRoles.some((candidate) => normalizeRole(candidate) === role);
}

export function isTeacher(user) {
  return hasAnyRole(user, ["TEACHER"]);
}

export function canManageAdminData(user) {
  return hasAnyRole(user, ["ADMIN", "MANAGEMENT"]);
}

export function canAccessAdminArea(user) {
  return hasAnyRole(user, ["ADMIN", "MANAGEMENT", "TEACHER"]);
}
