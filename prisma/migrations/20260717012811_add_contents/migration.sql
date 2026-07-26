/*
  Warnings:

  - You are about to drop the column `chapter_id` on the `chapter_notes` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `chapter_notes` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `chapter_notes` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `chapter_notes` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `chapter_notes` table. All the data in the column will be lost.
  - You are about to drop the column `chapter_id` on the `chapter_pdfs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `chapter_pdfs` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `chapter_pdfs` table. All the data in the column will be lost.
  - You are about to drop the column `display_order` on the `chapter_pdfs` table. All the data in the column will be lost.
  - You are about to drop the column `modified_by` on the `chapter_pdfs` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `chapter_pdfs` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `chapter_pdfs` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `chapter_pdfs` table. All the data in the column will be lost.
  - You are about to drop the column `chapter_id` on the `chapter_ppts` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `chapter_ppts` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `chapter_ppts` table. All the data in the column will be lost.
  - You are about to drop the column `display_order` on the `chapter_ppts` table. All the data in the column will be lost.
  - You are about to drop the column `modified_by` on the `chapter_ppts` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `chapter_ppts` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `chapter_ppts` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `chapter_ppts` table. All the data in the column will be lost.
  - You are about to drop the column `chapter_id` on the `chapter_previous_papers` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `chapter_previous_papers` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `chapter_previous_papers` table. All the data in the column will be lost.
  - You are about to drop the column `display_order` on the `chapter_previous_papers` table. All the data in the column will be lost.
  - You are about to drop the column `modified_by` on the `chapter_previous_papers` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `chapter_previous_papers` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `chapter_previous_papers` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `chapter_previous_papers` table. All the data in the column will be lost.
  - You are about to drop the column `chapter_id` on the `chapter_videos` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `chapter_videos` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `chapter_videos` table. All the data in the column will be lost.
  - You are about to drop the column `display_order` on the `chapter_videos` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `chapter_videos` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `chapter_videos` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `chapter_videos` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[content_id]` on the table `chapter_notes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[content_id]` on the table `chapter_pdfs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[content_id]` on the table `chapter_ppts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[content_id]` on the table `chapter_previous_papers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[content_id]` on the table `chapter_videos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `content_id` to the `chapter_notes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content_id` to the `chapter_pdfs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content_id` to the `chapter_ppts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content_id` to the `chapter_previous_papers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content_id` to the `chapter_videos` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('NOTE', 'VIDEO', 'PDF', 'PPT', 'PREVIOUS_PAPER');

-- DropForeignKey
ALTER TABLE "chapter_notes" DROP CONSTRAINT "chapter_notes_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "chapter_pdfs" DROP CONSTRAINT "chapter_pdfs_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "chapter_ppts" DROP CONSTRAINT "chapter_ppts_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "chapter_previous_papers" DROP CONSTRAINT "chapter_previous_papers_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "chapter_videos" DROP CONSTRAINT "chapter_videos_chapter_id_fkey";

-- AlterTable
ALTER TABLE "chapter_notes" DROP COLUMN "chapter_id",
DROP COLUMN "createdAt",
DROP COLUMN "created_by",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "content_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "chapter_pdfs" DROP COLUMN "chapter_id",
DROP COLUMN "createdAt",
DROP COLUMN "created_by",
DROP COLUMN "display_order",
DROP COLUMN "modified_by",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "updatedAt",
ADD COLUMN     "content_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "chapter_ppts" DROP COLUMN "chapter_id",
DROP COLUMN "createdAt",
DROP COLUMN "created_by",
DROP COLUMN "display_order",
DROP COLUMN "modified_by",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "updatedAt",
ADD COLUMN     "content_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "chapter_previous_papers" DROP COLUMN "chapter_id",
DROP COLUMN "createdAt",
DROP COLUMN "created_by",
DROP COLUMN "display_order",
DROP COLUMN "modified_by",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "updatedAt",
ADD COLUMN     "content_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "chapter_videos" DROP COLUMN "chapter_id",
DROP COLUMN "createdAt",
DROP COLUMN "created_by",
DROP COLUMN "display_order",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "updatedAt",
ADD COLUMN     "content_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "chapter_contents" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 1,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "modified_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapter_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chapter_notes_content_id_key" ON "chapter_notes"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_pdfs_content_id_key" ON "chapter_pdfs"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_ppts_content_id_key" ON "chapter_ppts"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_previous_papers_content_id_key" ON "chapter_previous_papers"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_videos_content_id_key" ON "chapter_videos"("content_id");

-- AddForeignKey
ALTER TABLE "chapter_contents" ADD CONSTRAINT "chapter_contents_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_notes" ADD CONSTRAINT "chapter_notes_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "chapter_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_videos" ADD CONSTRAINT "chapter_videos_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "chapter_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_pdfs" ADD CONSTRAINT "chapter_pdfs_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "chapter_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_ppts" ADD CONSTRAINT "chapter_ppts_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "chapter_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_previous_papers" ADD CONSTRAINT "chapter_previous_papers_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "chapter_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
