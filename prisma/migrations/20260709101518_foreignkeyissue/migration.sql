/*
  Warnings:

  - You are about to drop the column `subjectId` on the `TeacherSubject` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `TeacherSubject` table. All the data in the column will be lost.
  - You are about to drop the column `ProfilePic` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `UserClassAccess` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserClassAccess` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `UserSubjectAccess` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserSubjectAccess` table. All the data in the column will be lost.
  - You are about to drop the column `teacherSubjectId` on the `UserTeacherSubjectAccess` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserTeacherSubjectAccess` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teacher_id,subject_id]` on the table `TeacherSubject` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,class_id]` on the table `UserClassAccess` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,subject_id]` on the table `UserSubjectAccess` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,teacher_subject_id]` on the table `UserTeacherSubjectAccess` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_id` to the `TeacherSubject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacher_id` to the `TeacherSubject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `class_id` to the `UserClassAccess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `UserClassAccess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_id` to the `UserSubjectAccess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `UserSubjectAccess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacher_subject_id` to the `UserTeacherSubjectAccess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `UserTeacherSubjectAccess` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TeacherSubject" DROP CONSTRAINT "TeacherSubject_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherSubject" DROP CONSTRAINT "TeacherSubject_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "UserClassAccess" DROP CONSTRAINT "UserClassAccess_classId_fkey";

-- DropForeignKey
ALTER TABLE "UserClassAccess" DROP CONSTRAINT "UserClassAccess_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserSubjectAccess" DROP CONSTRAINT "UserSubjectAccess_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "UserSubjectAccess" DROP CONSTRAINT "UserSubjectAccess_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserTeacherSubjectAccess" DROP CONSTRAINT "UserTeacherSubjectAccess_teacherSubjectId_fkey";

-- DropForeignKey
ALTER TABLE "UserTeacherSubjectAccess" DROP CONSTRAINT "UserTeacherSubjectAccess_userId_fkey";

-- DropIndex
DROP INDEX "TeacherSubject_teacherId_subjectId_key";

-- DropIndex
DROP INDEX "UserClassAccess_userId_classId_key";

-- DropIndex
DROP INDEX "UserSubjectAccess_userId_subjectId_key";

-- DropIndex
DROP INDEX "UserTeacherSubjectAccess_userId_teacherSubjectId_key";

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TeacherSubject" DROP COLUMN "subjectId",
DROP COLUMN "teacherId",
ADD COLUMN     "subject_id" TEXT NOT NULL,
ADD COLUMN     "teacher_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "ProfilePic",
ADD COLUMN     "profilePic" TEXT;

-- AlterTable
ALTER TABLE "UserClassAccess" DROP COLUMN "classId",
DROP COLUMN "userId",
ADD COLUMN     "class_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserSubjectAccess" DROP COLUMN "subjectId",
DROP COLUMN "userId",
ADD COLUMN     "subject_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserTeacherSubjectAccess" DROP COLUMN "teacherSubjectId",
DROP COLUMN "userId",
ADD COLUMN     "teacher_subject_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_user_id_key" ON "Teacher"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubject_teacher_id_subject_id_key" ON "TeacherSubject"("teacher_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserClassAccess_user_id_class_id_key" ON "UserClassAccess"("user_id", "class_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubjectAccess_user_id_subject_id_key" ON "UserSubjectAccess"("user_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserTeacherSubjectAccess_user_id_teacher_subject_id_key" ON "UserTeacherSubjectAccess"("user_id", "teacher_subject_id");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClassAccess" ADD CONSTRAINT "UserClassAccess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClassAccess" ADD CONSTRAINT "UserClassAccess_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubjectAccess" ADD CONSTRAINT "UserSubjectAccess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubjectAccess" ADD CONSTRAINT "UserSubjectAccess_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTeacherSubjectAccess" ADD CONSTRAINT "UserTeacherSubjectAccess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTeacherSubjectAccess" ADD CONSTRAINT "UserTeacherSubjectAccess_teacher_subject_id_fkey" FOREIGN KEY ("teacher_subject_id") REFERENCES "TeacherSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
