// Returns the class IDs a teacher is explicitly mapped to, or null when the teacher has no mapping
// (meaning no class-based restriction should be applied, keeping existing center-wide visibility).
export async function getTeacherAssignedClassIds(prisma, userId) {
  if (!userId) return null;

  const accesses = await prisma.userClassAccess.findMany({
    where: { userId, status: true },
    select: { classId: true },
  });

  if (!accesses.length) return null;
  return accesses.map((access) => access.classId);
}
