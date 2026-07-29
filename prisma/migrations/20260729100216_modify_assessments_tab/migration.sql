-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "chapter_id" TEXT,
ALTER COLUMN "subject_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "assessments_chapter_id_idx" ON "assessments"("chapter_id");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
