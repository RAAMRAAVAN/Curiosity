-- CreateTable
CREATE TABLE "assessment_3_16_classes" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_3_16_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_3_16_subjects" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_3_16_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_3_16_classes_assessment_id_class_id_key" ON "assessment_3_16_classes"("assessment_id", "class_id");
CREATE INDEX "assessment_3_16_classes_class_id_idx" ON "assessment_3_16_classes"("class_id");
CREATE UNIQUE INDEX "assessment_3_16_subjects_assessment_id_subject_id_key" ON "assessment_3_16_subjects"("assessment_id", "subject_id");
CREATE INDEX "assessment_3_16_subjects_subject_id_idx" ON "assessment_3_16_subjects"("subject_id");

-- AddForeignKey
ALTER TABLE "assessment_3_16_classes" ADD CONSTRAINT "assessment_3_16_classes_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments_3_16"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_3_16_classes" ADD CONSTRAINT "assessment_3_16_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_3_16_subjects" ADD CONSTRAINT "assessment_3_16_subjects_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments_3_16"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_3_16_subjects" ADD CONSTRAINT "assessment_3_16_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
