-- CreateEnum
CREATE TYPE "AssessmentAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateTable
CREATE TABLE "assessment_attendances" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "AssessmentAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "reason" TEXT,
    "marked_by" TEXT,
    "marked_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_attendances_assessment_id_idx" ON "assessment_attendances"("assessment_id");

-- CreateIndex
CREATE INDEX "assessment_attendances_user_id_idx" ON "assessment_attendances"("user_id");

-- CreateIndex
CREATE INDEX "assessment_attendances_status_idx" ON "assessment_attendances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attendances_assessment_id_user_id_key" ON "assessment_attendances"("assessment_id", "user_id");

-- AddForeignKey
ALTER TABLE "assessment_attendances" ADD CONSTRAINT "assessment_attendances_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attendances" ADD CONSTRAINT "assessment_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attendances" ADD CONSTRAINT "assessment_attendances_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
