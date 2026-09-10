CREATE TEMP TABLE "CenterSlugMigration" ON COMMIT DROP AS
SELECT
  id,
  slug AS old_slug,
  left(upper(regexp_replace(slug, '[^A-Za-z]', '', 'g')), 3) AS new_slug
FROM "Center";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CenterSlugMigration"
    WHERE new_slug !~ '^[A-Z]{3}$'
  ) THEN
    RAISE EXCEPTION 'Every center must have a slug containing at least 3 letters';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CenterSlugMigration"
    GROUP BY new_slug
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Center slug migration would create duplicate slugs';
  END IF;
END $$;

UPDATE "Center" c
SET slug = m.new_slug
FROM "CenterSlugMigration" m
WHERE c.id = m.id;

CREATE TEMP TABLE "StudentSlugIdMigration" ON COMMIT DROP AS
SELECT
  u.id AS old_id,
  'THF-' || c.slug || '-' || enrollment_match.parts[1] || '-' || enrollment_match.parts[2] || '-' || enrollment_match.parts[3] AS new_id
FROM "User" u
JOIN "Student" s ON s.user_id = u.id
JOIN "Center" c ON c.id = s.center_id
CROSS JOIN LATERAL regexp_match(
  u.id,
  '^THF-[A-Za-z]{3}-([0-9]{2})-([A-Za-z0-9]+)-([0-9]{4})$'
) AS enrollment_match(parts)
WHERE u.role = 'STUDENT';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "StudentSlugIdMigration"
    GROUP BY new_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Student enrollment ID migration has duplicate target IDs';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "StudentSlugIdMigration" m
    JOIN "User" u ON u.id = m.new_id
    WHERE u.id <> m.old_id
  ) THEN
    RAISE EXCEPTION 'Student enrollment ID migration would overwrite an existing User.id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "StudentSlugIdMigration" m
    JOIN "AppSetting" old_setting ON old_setting.key = 'rbac.userAccess.' || m.old_id || '.v1'
    JOIN "AppSetting" new_setting ON new_setting.key = 'rbac.userAccess.' || m.new_id || '.v1'
    WHERE m.old_id <> m.new_id
  ) THEN
    RAISE EXCEPTION 'Student enrollment ID migration would overwrite an existing RBAC setting';
  END IF;
END $$;

UPDATE "AppSetting" a
SET key = 'rbac.userAccess.' || m.new_id || '.v1'
FROM "StudentSlugIdMigration" m
WHERE a.key = 'rbac.userAccess.' || m.old_id || '.v1'
  AND m.old_id <> m.new_id;

UPDATE "assessment_reattempt_requests" r
SET reviewed_by = m.new_id
FROM "StudentSlugIdMigration" m
WHERE r.reviewed_by = m.old_id
  AND m.old_id <> m.new_id;

UPDATE "User" u
SET id = m.new_id
FROM "StudentSlugIdMigration" m
WHERE u.id = m.old_id
  AND m.old_id <> m.new_id;

ALTER TABLE "Center"
ADD CONSTRAINT "Center_slug_format_check"
CHECK ("slug" ~ '^[A-Z]{3}$');
