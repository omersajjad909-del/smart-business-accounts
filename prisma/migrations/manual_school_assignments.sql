CREATE TABLE "SchoolAssignment" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "classId" TEXT NOT NULL, "subjectId" TEXT NOT NULL, "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL, "detail" TEXT, "dueDate" DATE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SchoolAssignment_companyId_classId_dueDate_idx" ON "SchoolAssignment"("companyId", "classId", "dueDate");
ALTER TABLE "SchoolAssignment" ADD CONSTRAINT "SchoolAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolAssignment" ADD CONSTRAINT "SchoolAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolAssignment" ADD CONSTRAINT "SchoolAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "SchoolSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolAssignment" ADD CONSTRAINT "SchoolAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "SchoolTeacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
