-- CreateEnum
CREATE TYPE "AssessmentReattemptStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "assessment_reattempt_requests" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "AssessmentReattemptStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_reattempt_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_reattempt_requests_assessment_id_idx" ON "assessment_reattempt_requests"("assessment_id");

-- CreateIndex
CREATE INDEX "assessment_reattempt_requests_user_id_idx" ON "assessment_reattempt_requests"("user_id");

-- CreateIndex
CREATE INDEX "assessment_reattempt_requests_status_idx" ON "assessment_reattempt_requests"("status");

-- AddForeignKey
ALTER TABLE "assessment_reattempt_requests" ADD CONSTRAINT "assessment_reattempt_requests_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_reattempt_requests" ADD CONSTRAINT "assessment_reattempt_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
