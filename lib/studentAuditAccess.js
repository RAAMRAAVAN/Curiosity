export const STUDENT_AUDIT_ADMIN_EMAIL = "ram.ray@curiosity.com";

export function canViewStudentAudit(user) {
  return String(user?.role || "").toUpperCase() === "ADMIN"
    && String(user?.email || "").trim().toLowerCase() === STUDENT_AUDIT_ADMIN_EMAIL;
}
