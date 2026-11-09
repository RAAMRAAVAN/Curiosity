import { randomUUID } from "node:crypto";

export async function createStudentAttendanceAuditLog(db, {
  studentId,
  studentName,
  attendanceDate,
  centerId,
  centerName,
  classId,
  className,
  actorId,
  actorName,
  beforeStatus,
  afterStatus,
}) {
  const action = afterStatus ? (beforeStatus ? "UPDATED" : "MARKED") : "REVERTED";
  return db.$executeRaw`
    INSERT INTO "student_attendance_audit_logs" (
      "id", "student_id", "student_name", "attendance_date", "center_id", "center_name",
      "class_id", "class_name", "actor_id", "actor_name", "action",
      "before_status", "after_status"
    )
    VALUES (
      ${randomUUID()}, ${studentId}, ${studentName}, ${attendanceDate.toISOString().slice(0, 10)}::date,
      ${centerId || null}, ${centerName || null},
      ${classId || null}, ${className || null}, ${actorId || null}, ${actorName || "Unknown user"},
      ${action}, ${beforeStatus || null}, ${afterStatus || null}
    )
  `;
}
