-- CreateTable
CREATE TABLE "assessment_3_16_checklist_items" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "item_text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 1,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_3_16_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_3_16_checklist_items_assessment_id_idx" ON "assessment_3_16_checklist_items"("assessment_id");

-- AddForeignKey
ALTER TABLE "assessment_3_16_checklist_items" ADD CONSTRAINT "assessment_3_16_checklist_items_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments_3_16"("id") ON DELETE CASCADE ON UPDATE CASCADE;