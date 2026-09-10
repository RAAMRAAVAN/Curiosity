CREATE TYPE "StudentAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

CREATE TABLE "student_attendances" (
    "id" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL,
    "student_id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "status" "StudentAttendanceStatus" NOT NULL,
    "marked_by" TEXT,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_attendances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_attendances_attendance_date_student_id_key"
ON "student_attendances"("attendance_date", "student_id");

CREATE INDEX "student_attendances_attendance_date_center_id_class_id_idx"
ON "student_attendances"("attendance_date", "center_id", "class_id");

CREATE INDEX "student_attendances_student_id_idx"
ON "student_attendances"("student_id");

ALTER TABLE "student_attendances"
ADD CONSTRAINT "student_attendances_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_attendances"
ADD CONSTRAINT "student_attendances_center_id_fkey"
FOREIGN KEY ("center_id") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_attendances"
ADD CONSTRAINT "student_attendances_class_id_fkey"
FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_attendances"
ADD CONSTRAINT "student_attendances_marked_by_fkey"
FOREIGN KEY ("marked_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
