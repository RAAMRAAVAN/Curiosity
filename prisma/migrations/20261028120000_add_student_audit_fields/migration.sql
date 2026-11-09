ALTER TABLE "Student"
ADD COLUMN IF NOT EXISTS "added_by" TEXT,
ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'Student_added_by_fkey'
			AND conrelid = '"Student"'::regclass
	) THEN
		ALTER TABLE "Student"
		ADD CONSTRAINT "Student_added_by_fkey"
		FOREIGN KEY ("added_by") REFERENCES "User"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'Student_modified_by_fkey'
			AND conrelid = '"Student"'::regclass
	) THEN
		ALTER TABLE "Student"
		ADD CONSTRAINT "Student_modified_by_fkey"
		FOREIGN KEY ("modified_by") REFERENCES "User"("id")
		ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END $$;