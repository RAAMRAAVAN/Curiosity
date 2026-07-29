export function buildClassSlug(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "class";
}

export function getClassRouteValue(classItem) {
  if (!classItem) return "";

  return classItem.slug || buildClassSlug(classItem.className || classItem.name || "");
}

export function matchClassIdentifier(classItem, identifier) {
  if (!classItem || !identifier) return false;

  const normalizedIdentifier = String(identifier).trim();
  const className = classItem.className || classItem.name || "";
  const slug = classItem.slug || buildClassSlug(className);

  return (
    className === normalizedIdentifier ||
    slug === normalizedIdentifier ||
    buildClassSlug(className) === normalizedIdentifier
  );
}
