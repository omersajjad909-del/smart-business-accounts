ALTER TABLE "LibraryLoan"
  ADD COLUMN "renewalCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "finePaid" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "SchoolAssignmentSubmission" (
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

CREATE UNIQUE INDEX "SchoolAssignmentSubmission_assignmentId_studentId_key"
  ON "SchoolAssignmentSubmission"("assignmentId", "studentId");
CREATE INDEX "SchoolAssignmentSubmission_companyId_assignmentId_idx"
  ON "SchoolAssignmentSubmission"("companyId", "assignmentId");
CREATE INDEX "SchoolAssignmentSubmission_studentId_idx"
  ON "SchoolAssignmentSubmission"("studentId");

ALTER TABLE "SchoolAssignmentSubmission"
  ADD CONSTRAINT "SchoolAssignmentSubmission_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SchoolAssignmentSubmission_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "SchoolAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SchoolAssignmentSubmission_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "SchoolStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
