ALTER TYPE "AssetLifecycle" ADD VALUE IF NOT EXISTS 'IN_USE';

ALTER TABLE "asset_list"
ADD COLUMN IF NOT EXISTS "manufacturer" TEXT,
ADD COLUMN IF NOT EXISTS "model_number" TEXT,
ADD COLUMN IF NOT EXISTS "assigned_employee_id" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'asset_list_assigned_employee_id_fkey'
          AND conrelid = '"asset_list"'::regclass
    ) THEN
        ALTER TABLE "asset_list"
        ADD CONSTRAINT "asset_list_assigned_employee_id_fkey"
        FOREIGN KEY ("assigned_employee_id") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "asset_list_assigned_employee_id_idx" ON "asset_list"("assigned_employee_id");
