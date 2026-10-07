ALTER TABLE "Student"
ADD COLUMN "mother_name" TEXT,
ADD COLUMN "identity_key" TEXT;

CREATE UNIQUE INDEX "Student_identity_key_key" ON "Student"("identity_key");
