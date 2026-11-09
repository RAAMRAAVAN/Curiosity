export function getMonthlyAttendanceDates(year, month) {
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from(
    { length: dayCount },
    (_, index) => new Date(Date.UTC(year, month - 1, index + 1))
  );
}

export function getMonthlyAttendanceDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthlyAttendanceRange(year, month) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    endExclusive: new Date(Date.UTC(year, month, 1)),
  };
}