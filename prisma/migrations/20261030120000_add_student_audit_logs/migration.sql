CREATE TABLE "student_audit_logs" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "center_id" TEXT,
    "class_id" TEXT,
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_audit_logs_student_id_created_at_idx" ON "student_audit_logs"("student_id", "created_at");
CREATE INDEX "student_audit_logs_center_id_created_at_idx" ON "student_audit_logs"("center_id", "created_at");
CREATE INDEX "student_audit_logs_created_at_idx" ON "student_audit_logs"("created_at");
