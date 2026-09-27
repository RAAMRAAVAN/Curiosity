CREATE TABLE "teacher_attendances" (
    "id" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL,
    "teacher_id" TEXT NOT NULL,
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
    CONSTRAINT "teacher_attendances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teacher_attendances_attendance_date_teacher_id_key"
ON "teacher_attendances"("attendance_date", "teacher_id");

CREATE INDEX "teacher_attendances_attendance_date_center_id_idx"
ON "teacher_attendances"("attendance_date", "center_id");

ALTER TABLE "teacher_attendances"
ADD CONSTRAINT "teacher_attendances_teacher_id_fkey"
FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "teacher_attendances"
ADD CONSTRAINT "teacher_attendances_center_id_fkey"
FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;