/*
  Warnings:

  - Made the column `title` on table `chapter_contents` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `file_name` to the `chapter_pdfs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_name` to the `chapter_ppts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_name` to the `chapter_previous_papers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentType" ADD VALUE 'ASSIGNMENT';
ALTER TYPE "ContentType" ADD VALUE 'QUIZ';
ALTER TYPE "ContentType" ADD VALUE 'LIVE_CLASS';
ALTER TYPE "ContentType" ADD VALUE 'AUDIO';
ALTER TYPE "ContentType" ADD VALUE 'EXTERNAL_LINK';

-- AlterTable
ALTER TABLE "chapter_contents" ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_free" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "title" SET NOT NULL;

-- AlterTable
ALTER TABLE "chapter_pdfs" ADD COLUMN     "file_name" TEXT NOT NULL,
ADD COLUMN     "file_size" INTEGER;

-- AlterTable
ALTER TABLE "chapter_ppts" ADD COLUMN     "file_name" TEXT NOT NULL,
ADD COLUMN     "file_size" INTEGER;

-- AlterTable
ALTER TABLE "chapter_previous_papers" ADD COLUMN     "file_name" TEXT NOT NULL,
ADD COLUMN     "file_size" INTEGER;

-- CreateIndex
CREATE INDEX "chapter_contents_chapter_id_idx" ON "chapter_contents"("chapter_id");

-- CreateIndex
CREATE INDEX "chapter_contents_chapter_id_display_order_idx" ON "chapter_contents"("chapter_id", "display_order");
