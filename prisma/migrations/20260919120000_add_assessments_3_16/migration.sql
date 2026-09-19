-- CreateTable
CREATE TABLE "assessments_3_16" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "center_id" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_3_16_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessments_3_16_center_id_idx" ON "assessments_3_16"("center_id");

-- AddForeignKey
ALTER TABLE "assessments_3_16" ADD CONSTRAINT "assessments_3_16_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;
