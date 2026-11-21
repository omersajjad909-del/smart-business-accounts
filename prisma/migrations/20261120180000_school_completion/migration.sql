CREATE TABLE IF NOT EXISTS "AcademicSession" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startsOn" DATE NOT NULL,
  "endsOn" DATE NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EducationDepartment" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationDepartment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EducationProgram" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "departmentId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "duration" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EducationCourse" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "programId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "creditHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EducationApplication" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "studentId" TEXT,
  "programId" TEXT,
  "applicationNo" TEXT NOT NULL,
  "applicantName" TEXT NOT NULL,
  "phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EducationEnrollment" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "programId" TEXT,
  "semester" TEXT,
  "rollNo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EducationCourseRegistration" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REGISTERED',
  "marks" DOUBLE PRECISION,
  "grade" TEXT,
  "gradePoints" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationCourseRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolGuardianAccess" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "relation" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolGuardianAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolAnnouncement" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "classId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'ALL',
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibraryBook" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "accessionNo" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "author" TEXT,
  "category" TEXT,
  "totalCopies" INTEGER NOT NULL DEFAULT 1,
  "availableCopies" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibraryLoan" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" DATE NOT NULL,
  "returnedAt" TIMESTAMP(3),
  "renewalCount" INTEGER NOT NULL DEFAULT 0,
  "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "finePaid" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibraryLoan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolAssignment" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT,
  "dueDate" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolAssignmentSubmission" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "detail" TEXT,
  "attachmentUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "marks" DOUBLE PRECISION,
  "feedback" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "gradedAt" TIMESTAMP(3),
  CONSTRAINT "SchoolAssignmentSubmission_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LibraryLoan" ADD COLUMN IF NOT EXISTS "renewalCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LibraryLoan" ADD COLUMN IF NOT EXISTS "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "LibraryLoan" ADD COLUMN IF NOT EXISTS "finePaid" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "AcademicSession_companyId_name_key" ON "AcademicSession"("companyId", "name");
CREATE INDEX IF NOT EXISTS "AcademicSession_companyId_active_idx" ON "AcademicSession"("companyId", "active");
CREATE UNIQUE INDEX IF NOT EXISTS "EducationDepartment_companyId_name_key" ON "EducationDepartment"("companyId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "EducationProgram_companyId_name_key" ON "EducationProgram"("companyId", "name");
CREATE INDEX IF NOT EXISTS "EducationProgram_companyId_departmentId_idx" ON "EducationProgram"("companyId", "departmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "EducationCourse_companyId_name_key" ON "EducationCourse"("companyId", "name");
CREATE INDEX IF NOT EXISTS "EducationCourse_companyId_programId_idx" ON "EducationCourse"("companyId", "programId");
CREATE UNIQUE INDEX IF NOT EXISTS "EducationApplication_companyId_applicationNo_key" ON "EducationApplication"("companyId", "applicationNo");
CREATE INDEX IF NOT EXISTS "EducationApplication_companyId_status_idx" ON "EducationApplication"("companyId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "EducationEnrollment_studentId_sessionId_key" ON "EducationEnrollment"("studentId", "sessionId");
CREATE INDEX IF NOT EXISTS "EducationEnrollment_companyId_programId_sessionId_idx" ON "EducationEnrollment"("companyId", "programId", "sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "EducationCourseRegistration_enrollmentId_courseId_key" ON "EducationCourseRegistration"("enrollmentId", "courseId");
CREATE INDEX IF NOT EXISTS "EducationCourseRegistration_companyId_enrollmentId_idx" ON "EducationCourseRegistration"("companyId", "enrollmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolGuardianAccess_studentId_userId_key" ON "SchoolGuardianAccess"("studentId", "userId");
CREATE INDEX IF NOT EXISTS "SchoolGuardianAccess_companyId_userId_active_idx" ON "SchoolGuardianAccess"("companyId", "userId", "active");
CREATE INDEX IF NOT EXISTS "SchoolAnnouncement_companyId_published_createdAt_idx" ON "SchoolAnnouncement"("companyId", "published", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "LibraryBook_companyId_accessionNo_key" ON "LibraryBook"("companyId", "accessionNo");
CREATE INDEX IF NOT EXISTS "LibraryBook_companyId_title_idx" ON "LibraryBook"("companyId", "title");
CREATE INDEX IF NOT EXISTS "LibraryLoan_companyId_returnedAt_dueDate_idx" ON "LibraryLoan"("companyId", "returnedAt", "dueDate");
CREATE INDEX IF NOT EXISTS "LibraryLoan_studentId_returnedAt_idx" ON "LibraryLoan"("studentId", "returnedAt");
CREATE INDEX IF NOT EXISTS "SchoolAssignment_companyId_classId_dueDate_idx" ON "SchoolAssignment"("companyId", "classId", "dueDate");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolAssignmentSubmission_assignmentId_studentId_key" ON "SchoolAssignmentSubmission"("assignmentId", "studentId");
CREATE INDEX IF NOT EXISTS "SchoolAssignmentSubmission_companyId_assignmentId_idx" ON "SchoolAssignmentSubmission"("companyId", "assignmentId");
CREATE INDEX IF NOT EXISTS "SchoolAssignmentSubmission_studentId_idx" ON "SchoolAssignmentSubmission"("studentId");
