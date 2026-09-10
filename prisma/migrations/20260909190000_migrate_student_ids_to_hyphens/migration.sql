CREATE TEMP TABLE "StudentIdMigration" ON COMMIT DROP AS
SELECT
  u.id AS old_id,
  'THF-' || split_part(u.id, '/', 2) || '-' || split_part(u.id, '/', 3) AS new_id
FROM "User" u
JOIN "Student" s ON s.user_id = u.id
WHERE u.role = 'STUDENT'
  AND u.id ~ '^THF/[A-Za-z]{3}/[0-9]{4}$';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "StudentIdMigration"
    GROUP BY new_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Student enrollment ID migration has duplicate target IDs';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "StudentIdMigration" m
    JOIN "User" u ON u.id = m.new_id
  ) THEN
    RAISE EXCEPTION 'Student enrollment ID migration would overwrite an existing User.id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "StudentIdMigration" m
    JOIN "AppSetting" a ON a.key = 'rbac.userAccess.' || m.new_id || '.v1'
  ) THEN
    RAISE EXCEPTION 'Student enrollment ID migration would overwrite an existing RBAC setting';
  END IF;
END $$;

UPDATE "AppSetting" a
SET key = 'rbac.userAccess.' || m.new_id || '.v1'
FROM "StudentIdMigration" m
WHERE a.key = 'rbac.userAccess.' || m.old_id || '.v1';

UPDATE "assessment_reattempt_requests" r
SET reviewed_by = m.new_id
FROM "StudentIdMigration" m
WHERE r.reviewed_by = m.old_id;

UPDATE "User" u
SET id = m.new_id
FROM "StudentIdMigration" m
WHERE u.id = m.old_id;
