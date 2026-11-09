const AUDIT_FIELDS = [
  ["name", "Name"],
  ["email", "Email"],
  ["centerId", "Center"],
  ["studyingClass", "Class"],
  ["dob", "Date of Birth"],
  ["gender", "Gender"],
  ["phone", "Phone"],
  ["address", "Address"],
  ["schoolName", "School Name"],
  ["teaGarden", "Tea Garden"],
  ["fatherName", "Father's Name"],
  ["motherName", "Mother's Name"],
  ["status", "Status"],
];

function normalizeAuditValue(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function getStudentAuditSnapshot(user, profile = user.student || {}) {
  return {
    name: user.name || "",
    email: user.email || "",
    centerId: profile.centerId || null,
    studyingClass: profile.studyingClass || null,
    dob: profile.dob || null,
    gender: profile.gender || "",
    phone: profile.phone || "",
    address: profile.address || "",
    schoolName: profile.schoolName || "",
    teaGarden: profile.teaGarden || "",
    fatherName: profile.fatherName || "",
    motherName: profile.motherName || "",
    status: Boolean(user.status),
  };
}

export function getStudentAuditChanges(before, after) {
  const changes = {};
  for (const [field, label] of AUDIT_FIELDS) {
    const oldValue = normalizeAuditValue(before?.[field]);
    const newValue = normalizeAuditValue(after?.[field]);
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[label] = { before: oldValue, after: newValue };
    }
  }
  return changes;
}

export async function createStudentAuditLog(db, {
  studentId,
  studentName,
  centerId,
  classId,
  actorId,
  actorName,
  action,
  changes,
}) {
  return db.studentAuditLog.create({
    data: {
      studentId,
      studentName,
      centerId: centerId || null,
      classId: classId || null,
      actorId: actorId || null,
      actorName: actorName || "Unknown user",
      action,
      changes,
    },
  });
}
