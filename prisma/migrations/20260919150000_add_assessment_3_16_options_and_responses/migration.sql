-- CreateTable
CREATE TABLE "assessment_3_16_checklist_options" (
    "id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 1,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_3_16_checklist_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_3_16_responses" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_3_16_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_3_16_response_items" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_3_16_response_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_3_16_checklist_options_checklist_id_idx" ON "assessment_3_16_checklist_options"("checklist_id");
CREATE UNIQUE INDEX "assessment_3_16_responses_assessment_id_user_id_key" ON "assessment_3_16_responses"("assessment_id", "user_id");
CREATE INDEX "assessment_3_16_responses_user_id_idx" ON "assessment_3_16_responses"("user_id");
CREATE UNIQUE INDEX "assessment_3_16_response_items_response_id_checklist_id_key" ON "assessment_3_16_response_items"("response_id", "checklist_id");
CREATE INDEX "assessment_3_16_response_items_option_id_idx" ON "assessment_3_16_response_items"("option_id");

-- AddForeignKey
ALTER TABLE "assessment_3_16_checklist_options" ADD CONSTRAINT "assessment_3_16_checklist_options_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "assessment_3_16_checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_3_16_responses" ADD CONSTRAINT "assessment_3_16_responses_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments_3_16"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_3_16_responses" ADD CONSTRAINT "assessment_3_16_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_3_16_response_items" ADD CONSTRAINT "assessment_3_16_response_items_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "assessment_3_16_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_3_16_response_items" ADD CONSTRAINT "assessment_3_16_response_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "assessment_3_16_checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_3_16_response_items" ADD CONSTRAINT "assessment_3_16_response_items_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "assessment_3_16_checklist_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
