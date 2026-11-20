CREATE TABLE "SchoolGuardianAccess" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "relation" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolGuardianAccess_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SchoolGuardianAccess_studentId_userId_key" ON "SchoolGuardianAccess"("studentId", "userId");
CREATE INDEX "SchoolGuardianAccess_companyId_userId_active_idx" ON "SchoolGuardianAccess"("companyId", "userId", "active");
ALTER TABLE "SchoolGuardianAccess" ADD CONSTRAINT "SchoolGuardianAccess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolGuardianAccess" ADD CONSTRAINT "SchoolGuardianAccess_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SchoolStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolGuardianAccess" ADD CONSTRAINT "SchoolGuardianAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
