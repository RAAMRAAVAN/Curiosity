import { createHash } from 'node:crypto';

const normalizeIdentityPart = (value) => String(value || '')
  .normalize('NFKC')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('en');

export function createStudentIdentityKey({ name, fatherName, motherName }) {
  const normalizedIdentity = [name, fatherName, motherName].map(normalizeIdentityPart);
  return createHash('sha256').update(JSON.stringify(normalizedIdentity)).digest('hex');
}

export async function isStudentIdentityTaken(db, identityKey, excludeUserId = null) {
  const duplicate = await db.student.findFirst({
    where: {
      identityKey,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true },
  });
  return Boolean(duplicate);
}
