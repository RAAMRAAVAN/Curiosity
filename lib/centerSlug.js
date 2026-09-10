export function normalizeCenterSlug(value) {
  return String(value || "").trim().toUpperCase();
}

export function isValidCenterSlug(value) {
  return /^[A-Z]{3}$/.test(normalizeCenterSlug(value));
}
