export async function nextStudentId(tx, centerSlug, className, registrationDate = new Date()) {
  const prefix = String(centerSlug || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(prefix)) {
    throw new Error("A valid 3-letter center slug is required to generate an enrollment ID.");
  }

  const year = String(registrationDate.getFullYear()).slice(-2);
  const idPrefix = `THF-${prefix}-${year}-`;

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idPrefix}))`;

  const existingIds = await tx.user.findMany({
    where: {
      role: "STUDENT",
      id: { startsWith: idPrefix },
    },
    select: { id: true },
  });

  const highestNumber = existingIds.reduce((highest, user) => {
    const number = Number(user.id.slice(idPrefix.length));
    return Number.isInteger(number) && number > highest ? number : highest;
  }, 0);

  return `${idPrefix}${String(highestNumber + 1).padStart(4, "0")}`;
}