export const buildAssessment316StatusGroups = ({ students = [], attemptedUserIds = new Set(), absentUserIds = new Set() }) => {
  const pending = [];
  const appeared = [];
  const absent = [];

  for (const student of students) {
    if (!student || !student.id) continue;

    if (attemptedUserIds.has(student.id)) {
      appeared.push(student);
      continue;
    }

    if (absentUserIds.has(student.id)) {
      absent.push(student);
      continue;
    }

    pending.push(student);
  }

  return { pending, appeared, absent };
};
