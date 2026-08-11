-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "center_id" TEXT;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "center_id" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "center_id" TEXT;

-- CreateTable
CREATE TABLE "Center" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Center_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Center_name_key" ON "Center"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Center_slug_key" ON "Center"("slug");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Management" ADD CONSTRAINT "Management_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;
