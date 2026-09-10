CREATE TEMP TABLE "StudentEnrollmentIdMigration" ON COMMIT DROP AS
WITH normalized AS (
  SELECT
    u.id AS old_id,
    u."createdAt" AS created_at,
    rpad(
      left(upper(regexp_replace(coalesce(c.name, ''), '[^A-Za-z]', '', 'g')), 3),
      3,
      'X'
    ) AS center_code,
    to_char(u."createdAt", 'YY') AS registration_year,
    upper(regexp_replace(trim(coalesce(cl.class_name, '')), '[^A-Za-z0-9]', '', 'g')) AS class_token
  FROM "User" u
  JOIN "Student" s ON s.user_id = u.id
  LEFT JOIN "Center" c ON c.id = s.center_id
  LEFT JOIN "Class" cl ON cl.id = s."studyingClass"
  WHERE u.role = 'STUDENT'
    AND u.id ~ '^THF-[A-Za-z]{3}-[0-9]{4}$'
), ranked AS (
  SELECT
    old_id,
    center_code,
    registration_year,
    class_token,
    'THF-' || center_code || '-' || registration_year || '-' || class_token || '-' ||
      lpad(
        row_number() OVER (
          PARTITION BY center_code, registration_year, class_token
          ORDER BY created_at, old_id
        )::text,
        4,
        '0'
      ) AS new_id
  FROM normalized
)
SELECT old_id, new_id
FROM ranked;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "StudentEnrollmentIdMigration"
    WHERE new_id LIKE 'THF-XXX-%'
       OR new_id LIKE 'THF---%'
       OR new_id LIKE 'THF-%--%'
  ) THEN
    RAISE EXCEPTION 'Student enrollment ID migration found a student without a valid center or class';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "StudentEnrollmentIdMigration"
    GROUP BY new_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Student enrollment ID migration has duplicate target IDs';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "StudentEnrollmentIdMigration" m
    JOIN "User" u ON u.id = m.new_id
  ) THEN
    RAISE EXCEPTION 'Student enrollment ID migration would overwrite an existing User.id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "StudentEnrollmentIdMigration" m
    JOIN "AppSetting" a ON a.key = 'rbac.userAccess.' || m.old_id || '.v1'
    JOIN "AppSetting" target ON target.key = 'rbac.userAccess.' || m.new_id || '.v1'
  ) THEN
    RAISE EXCEPTION 'Student enrollment ID migration would overwrite an existing RBAC setting';
  END IF;
END $$;

UPDATE "AppSetting" a
SET key = 'rbac.userAccess.' || m.new_id || '.v1'
FROM "StudentEnrollmentIdMigration" m
WHERE a.key = 'rbac.userAccess.' || m.old_id || '.v1';

UPDATE "assessment_reattempt_requests" r
SET reviewed_by = m.new_id
FROM "StudentEnrollmentIdMigration" m
WHERE r.reviewed_by = m.old_id;

UPDATE "User" u
SET id = m.new_id
FROM "StudentEnrollmentIdMigration" m
WHERE u.id = m.old_id;
