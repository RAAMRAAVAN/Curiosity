-- Make teacher phone optional again and drop the old unique index
ALTER TABLE "Teacher" ALTER COLUMN "phone" DROP NOT NULL;
DROP INDEX IF EXISTS "Teacher_phone_key";
