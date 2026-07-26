-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('YOUTUBE', 'ON_SITE');

-- CreateTable
CREATE TABLE "chapter_videos" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "title" TEXT,
    "video_type" "VideoType" NOT NULL DEFAULT 'YOUTUBE',
    "video_link" TEXT,
    "video_path" TEXT,
    "thumbnail" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 1,
    "duration" INTEGER,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapter_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_pdfs" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 1,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "modified_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapter_pdfs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_ppts" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 1,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "modified_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapter_ppts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_previous_papers" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 1,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "modified_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapter_previous_papers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "chapter_videos" ADD CONSTRAINT "chapter_videos_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_pdfs" ADD CONSTRAINT "chapter_pdfs_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_ppts" ADD CONSTRAINT "chapter_ppts_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_previous_papers" ADD CONSTRAINT "chapter_previous_papers_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
