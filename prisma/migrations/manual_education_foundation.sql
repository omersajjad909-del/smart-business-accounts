-- Shared academic foundation for schools, colleges and universities.
CREATE TABLE "AcademicSession" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "startsOn" DATE NOT NULL, "endsOn" DATE NOT NULL, "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EducationDepartment" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationDepartment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EducationProgram" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "departmentId" TEXT, "name" TEXT NOT NULL,
  "code" TEXT, "duration" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationProgram_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EducationCourse" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "programId" TEXT, "name" TEXT NOT NULL,
  "code" TEXT, "creditHours" DOUBLE PRECISION NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationCourse_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EducationApplication" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "studentId" TEXT, "programId" TEXT,
  "applicationNo" TEXT NOT NULL, "applicantName" TEXT NOT NULL, "phone" TEXT, "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationApplication_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EducationEnrollment" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "sessionId" TEXT NOT NULL,
  "programId" TEXT, "semester" TEXT, "rollNo" TEXT, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademicSession_companyId_name_key" ON "AcademicSession"("companyId", "name");
CREATE INDEX "AcademicSession_companyId_active_idx" ON "AcademicSession"("companyId", "active");
CREATE UNIQUE INDEX "EducationDepartment_companyId_name_key" ON "EducationDepartment"("companyId", "name");
CREATE UNIQUE INDEX "EducationProgram_companyId_name_key" ON "EducationProgram"("companyId", "name");
CREATE INDEX "EducationProgram_companyId_departmentId_idx" ON "EducationProgram"("companyId", "departmentId");
CREATE UNIQUE INDEX "EducationCourse_companyId_name_key" ON "EducationCourse"("companyId", "name");
CREATE INDEX "EducationCourse_companyId_programId_idx" ON "EducationCourse"("companyId", "programId");
CREATE UNIQUE INDEX "EducationApplication_companyId_applicationNo_key" ON "EducationApplication"("companyId", "applicationNo");
CREATE INDEX "EducationApplication_companyId_status_idx" ON "EducationApplication"("companyId", "status");
CREATE UNIQUE INDEX "EducationEnrollment_studentId_sessionId_key" ON "EducationEnrollment"("studentId", "sessionId");
CREATE INDEX "EducationEnrollment_companyId_programId_sessionId_idx" ON "EducationEnrollment"("companyId", "programId", "sessionId");
ALTER TABLE "AcademicSession" ADD CONSTRAINT "AcademicSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationDepartment" ADD CONSTRAINT "EducationDepartment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationProgram" ADD CONSTRAINT "EducationProgram_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationProgram" ADD CONSTRAINT "EducationProgram_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "EducationDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EducationCourse" ADD CONSTRAINT "EducationCourse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationCourse" ADD CONSTRAINT "EducationCourse_programId_fkey" FOREIGN KEY ("programId") REFERENCES "EducationProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EducationApplication" ADD CONSTRAINT "EducationApplication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationApplication" ADD CONSTRAINT "EducationApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SchoolStudent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EducationApplication" ADD CONSTRAINT "EducationApplication_programId_fkey" FOREIGN KEY ("programId") REFERENCES "EducationProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EducationEnrollment" ADD CONSTRAINT "EducationEnrollment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationEnrollment" ADD CONSTRAINT "EducationEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SchoolStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationEnrollment" ADD CONSTRAINT "EducationEnrollment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationEnrollment" ADD CONSTRAINT "EducationEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "EducationProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
