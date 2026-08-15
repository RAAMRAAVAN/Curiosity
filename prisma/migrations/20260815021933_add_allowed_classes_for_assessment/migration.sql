-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "last_modified_time" TIMESTAMP(3),
ADD COLUMN     "last_modified_user" TEXT;

-- CreateTable
CREATE TABLE "allowed_classes_for_assessment" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_modified_user" TEXT,
    "last_modified_time" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allowed_classes_for_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "allowed_classes_for_assessment_assessment_id_idx" ON "allowed_classes_for_assessment"("assessment_id");

-- CreateIndex
CREATE INDEX "allowed_classes_for_assessment_class_id_idx" ON "allowed_classes_for_assessment"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "allowed_classes_for_assessment_assessment_id_class_id_key" ON "allowed_classes_for_assessment"("assessment_id", "class_id");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_last_modified_user_fkey" FOREIGN KEY ("last_modified_user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowed_classes_for_assessment" ADD CONSTRAINT "allowed_classes_for_assessment_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowed_classes_for_assessment" ADD CONSTRAINT "allowed_classes_for_assessment_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowed_classes_for_assessment" ADD CONSTRAINT "allowed_classes_for_assessment_last_modified_user_fkey" FOREIGN KEY ("last_modified_user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
