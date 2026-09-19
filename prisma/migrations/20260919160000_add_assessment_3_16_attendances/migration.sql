-- CreateEnum
CREATE TYPE "Assessment316AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateTable
CREATE TABLE "assessment_3_16_attendances" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "Assessment316AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "reason" TEXT,
    "marked_by" TEXT,
    "marked_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_3_16_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_3_16_attendances_assessment_id_user_id_key" ON "assessment_3_16_attendances"("assessment_id", "user_id");
CREATE INDEX "assessment_3_16_attendances_assessment_id_idx" ON "assessment_3_16_attendances"("assessment_id");
CREATE INDEX "assessment_3_16_attendances_user_id_idx" ON "assessment_3_16_attendances"("user_id");
CREATE INDEX "assessment_3_16_attendances_status_idx" ON "assessment_3_16_attendances"("status");

-- AddForeignKey
ALTER TABLE "assessment_3_16_attendances" ADD CONSTRAINT "assessment_3_16_attendances_assessment_id_fkey"
    FOREIGN KEY ("assessment_id") REFERENCES "assessments_3_16"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_3_16_attendances" ADD CONSTRAINT "assessment_3_16_attendances_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_3_16_attendances" ADD CONSTRAINT "assessment_3_16_attendances_marked_by_fkey"
    FOREIGN KEY ("marked_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
