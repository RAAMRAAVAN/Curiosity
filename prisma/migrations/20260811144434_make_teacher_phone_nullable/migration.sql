-- DropIndex
DROP INDEX IF EXISTS "Teacher_phone_key";

-- AlterTable
ALTER TABLE "Teacher" ALTER COLUMN "phone" DROP NOT NULL;
