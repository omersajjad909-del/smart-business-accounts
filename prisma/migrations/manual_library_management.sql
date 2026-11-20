CREATE TABLE "LibraryBook" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "accessionNo" TEXT NOT NULL, "title" TEXT NOT NULL,
  "author" TEXT, "category" TEXT, "totalCopies" INTEGER NOT NULL DEFAULT 1, "availableCopies" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LibraryLoan" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "bookId" TEXT NOT NULL, "studentId" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "dueDate" DATE NOT NULL, "returnedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibraryLoan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LibraryBook_companyId_accessionNo_key" ON "LibraryBook"("companyId", "accessionNo");
CREATE INDEX "LibraryBook_companyId_title_idx" ON "LibraryBook"("companyId", "title");
CREATE INDEX "LibraryLoan_companyId_returnedAt_dueDate_idx" ON "LibraryLoan"("companyId", "returnedAt", "dueDate");
CREATE INDEX "LibraryLoan_studentId_returnedAt_idx" ON "LibraryLoan"("studentId", "returnedAt");
ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SchoolStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
