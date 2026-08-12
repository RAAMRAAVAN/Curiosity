ALTER TABLE "assessments" ADD COLUMN "total_marks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "assessments" ADD COLUMN "grade_bands" TEXT;
ALTER TABLE "assessment_questions" ADD COLUMN "marks" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "assessment_results" ADD COLUMN "total_marks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "assessment_results" ADD COLUMN "percentage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "assessment_results" ADD COLUMN "grade" TEXT;
