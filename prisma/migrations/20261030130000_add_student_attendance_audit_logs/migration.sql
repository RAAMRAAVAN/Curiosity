CREATE TABLE IF NOT EXISTS "student_attendance_audit_logs" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL,
    "center_id" TEXT,
    "center_name" TEXT,
    "class_id" TEXT,
    "class_name" TEXT,
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before_status" TEXT,
    "after_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_attendance_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "student_attendance_audit_logs_student_id_attendance_date_created_at_idx"
    ON "student_attendance_audit_logs"("student_id", "attendance_date", "created_at");
CREATE INDEX IF NOT EXISTS "student_attendance_audit_logs_center_id_attendance_date_idx"
    ON "student_attendance_audit_logs"("center_id", "attendance_date");
CREATE INDEX IF NOT EXISTS "student_attendance_audit_logs_created_at_idx"
    ON "student_attendance_audit_logs"("created_at");
