-- CreateTable
CREATE TABLE "UserClassAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserClassAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubjectAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSubjectAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTeacherSubjectAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teacherSubjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTeacherSubjectAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserClassAccess_userId_classId_key" ON "UserClassAccess"("userId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubjectAccess_userId_subjectId_key" ON "UserSubjectAccess"("userId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTeacherSubjectAccess_userId_teacherSubjectId_key" ON "UserTeacherSubjectAccess"("userId", "teacherSubjectId");

-- AddForeignKey
ALTER TABLE "UserClassAccess" ADD CONSTRAINT "UserClassAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClassAccess" ADD CONSTRAINT "UserClassAccess_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubjectAccess" ADD CONSTRAINT "UserSubjectAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubjectAccess" ADD CONSTRAINT "UserSubjectAccess_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTeacherSubjectAccess" ADD CONSTRAINT "UserTeacherSubjectAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTeacherSubjectAccess" ADD CONSTRAINT "UserTeacherSubjectAccess_teacherSubjectId_fkey" FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
