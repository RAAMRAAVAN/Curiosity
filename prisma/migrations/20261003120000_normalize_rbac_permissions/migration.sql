CREATE TABLE "custom_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "custom_roles_name_key" ON "custom_roles"("name");

CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "permission_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissions_permission_key_key" ON "permissions"("permission_key");
CREATE INDEX "permissions_category_label_idx" ON "permissions"("category", "label");

CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);

CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

CREATE TABLE "user_access_assignments" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_access_assignments_pkey" PRIMARY KEY ("user_id")
);

CREATE INDEX "user_access_assignments_role_id_idx" ON "user_access_assignments"("role_id");

CREATE TABLE "user_access_assignment_centers" (
    "user_id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    CONSTRAINT "user_access_assignment_centers_pkey" PRIMARY KEY ("user_id", "center_id")
);

CREATE INDEX "user_access_assignment_centers_center_id_idx" ON "user_access_assignment_centers"("center_id");

ALTER TABLE "role_permissions"
ADD CONSTRAINT "role_permissions_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
ADD CONSTRAINT "role_permissions_permission_id_fkey"
FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_access_assignments"
ADD CONSTRAINT "user_access_assignments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_access_assignments"
ADD CONSTRAINT "user_access_assignments_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "custom_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_access_assignment_centers"
ADD CONSTRAINT "user_access_assignment_centers_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user_access_assignments"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_access_assignment_centers"
ADD CONSTRAINT "user_access_assignment_centers_center_id_fkey"
FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH legacy_roles AS (
    SELECT role.value AS data
    FROM "AppSetting" setting
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(setting."value"::jsonb) = 'array' THEN setting."value"::jsonb
            ELSE '[]'::jsonb
        END
    ) AS role(value)
    WHERE setting."key" = 'rbac.roles.v1'
)
INSERT INTO "custom_roles" ("id", "name", "description", "status", "createdAt", "updatedAt")
SELECT
    data->>'id',
    data->>'name',
    COALESCE(data->>'description', ''),
    COALESCE((data->>'status')::boolean, true),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM legacy_roles
WHERE NULLIF(data->>'id', '') IS NOT NULL
  AND NULLIF(data->>'name', '') IS NOT NULL
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "status" = EXCLUDED."status",
    "updatedAt" = CURRENT_TIMESTAMP;

WITH legacy_permissions AS (
    SELECT DISTINCT BTRIM(permission.value) AS permission_key
    FROM "AppSetting" setting
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(setting."value"::jsonb) = 'array' THEN setting."value"::jsonb
            ELSE '[]'::jsonb
        END
    ) AS role(value)
    CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE
            WHEN jsonb_typeof(role.value->'permissions') = 'array' THEN role.value->'permissions'
            ELSE '[]'::jsonb
        END
    ) AS permission(value)
    WHERE setting."key" = 'rbac.roles.v1'
      AND BTRIM(permission.value) <> ''
)
INSERT INTO "permissions" ("id", "permission_key", "label", "category", "status", "createdAt", "updatedAt")
SELECT
    'perm_' || MD5(permission_key),
    permission_key,
    INITCAP(REPLACE(REPLACE(permission_key, '.', ' '), '_', ' ')),
    CASE SPLIT_PART(permission_key, '.', 1)
        WHEN 'assessments316' THEN 'Assessment (3-16 years)'
        WHEN 'results' THEN 'Assessment Results'
        WHEN 'navigation' THEN 'Admin Navigation'
        WHEN 'class_content' THEN 'Classes'
        ELSE INITCAP(SPLIT_PART(permission_key, '.', 1))
    END,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM legacy_permissions
ON CONFLICT ("permission_key") DO NOTHING;

WITH legacy_role_permissions AS (
    SELECT
        role.value->>'id' AS role_id,
        BTRIM(permission.value) AS permission_key
    FROM "AppSetting" setting
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(setting."value"::jsonb) = 'array' THEN setting."value"::jsonb
            ELSE '[]'::jsonb
        END
    ) AS role(value)
    CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE
            WHEN jsonb_typeof(role.value->'permissions') = 'array' THEN role.value->'permissions'
            ELSE '[]'::jsonb
        END
    ) AS permission(value)
    WHERE setting."key" = 'rbac.roles.v1'
)
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT legacy.role_id, permission.id
FROM legacy_role_permissions legacy
JOIN "custom_roles" role ON role."id" = legacy.role_id
JOIN "permissions" permission ON permission."permission_key" = legacy.permission_key
ON CONFLICT DO NOTHING;

WITH legacy_assignments AS (
    SELECT
        SUBSTRING(setting."key" FROM LENGTH('rbac.userAccess.') + 1 FOR LENGTH(setting."key") - LENGTH('rbac.userAccess.') - LENGTH('.v1')) AS user_id,
        setting."value"::jsonb AS data
    FROM "AppSetting" setting
    WHERE setting."key" LIKE 'rbac.userAccess.%.v1'
)
INSERT INTO "user_access_assignments" ("user_id", "role_id", "createdAt", "updatedAt")
SELECT
    legacy.user_id,
    CASE WHEN role."id" IS NOT NULL THEN legacy.data->>'roleId' ELSE NULL END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM legacy_assignments legacy
JOIN "User" user_record ON user_record."id" = legacy.user_id
LEFT JOIN "custom_roles" role ON role."id" = legacy.data->>'roleId'
ON CONFLICT ("user_id") DO UPDATE SET
    "role_id" = EXCLUDED."role_id",
    "updatedAt" = CURRENT_TIMESTAMP;

WITH legacy_assignment_centers AS (
    SELECT
        SUBSTRING(setting."key" FROM LENGTH('rbac.userAccess.') + 1 FOR LENGTH(setting."key") - LENGTH('rbac.userAccess.') - LENGTH('.v1')) AS user_id,
        BTRIM(center.value) AS center_id
    FROM "AppSetting" setting
    CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE
            WHEN jsonb_typeof(setting."value"::jsonb->'centerIds') = 'array' THEN setting."value"::jsonb->'centerIds'
            ELSE '[]'::jsonb
        END
    ) AS center(value)
    WHERE setting."key" LIKE 'rbac.userAccess.%.v1'
)
INSERT INTO "user_access_assignment_centers" ("user_id", "center_id")
SELECT legacy.user_id, legacy.center_id
FROM legacy_assignment_centers legacy
JOIN "user_access_assignments" assignment ON assignment."user_id" = legacy.user_id
JOIN "Center" center ON center."id" = legacy.center_id
WHERE legacy.center_id <> ''
ON CONFLICT DO NOTHING;

INSERT INTO "UserClassAccess" ("id", "user_id", "class_id", "status", "createdAt")
SELECT
    'teacherclass_' || MD5(teacher."user_id" || ':' || subject."class_id"),
    teacher."user_id",
    subject."class_id",
    true,
    CURRENT_TIMESTAMP
FROM "TeacherSubject" teacher_subject
JOIN "Teacher" teacher ON teacher."id" = teacher_subject."teacher_id"
JOIN "Subject" subject ON subject."id" = teacher_subject."subject_id"
WHERE teacher_subject."status" = true
ON CONFLICT ("user_id", "class_id") DO NOTHING;

DELETE FROM "AppSetting"
WHERE "key" = 'rbac.roles.v1'
   OR "key" LIKE 'rbac.userAccess.%.v1';