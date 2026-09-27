CREATE TABLE "management_attendances" (
    "id" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL,
    "management_id" TEXT NOT NULL,
    "center_id" TEXT,
    "check_in_at" TIMESTAMP(3),
    "check_in_latitude" DECIMAL(9,6),
    "check_in_longitude" DECIMAL(9,6),
    "check_in_accuracy_meters" DECIMAL(8,2),
    "check_out_at" TIMESTAMP(3),
    "check_out_latitude" DECIMAL(9,6),
    "check_out_longitude" DECIMAL(9,6),
    "check_out_accuracy_meters" DECIMAL(8,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "management_attendances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "management_attendances_attendance_date_management_id_key"
ON "management_attendances"("attendance_date", "management_id");

CREATE INDEX "management_attendances_attendance_date_center_id_idx"
ON "management_attendances"("attendance_date", "center_id");

ALTER TABLE "management_attendances"
ADD CONSTRAINT "management_attendances_management_id_fkey"
FOREIGN KEY ("management_id") REFERENCES "Management"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "management_attendances"
ADD CONSTRAINT "management_attendances_center_id_fkey"
FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;