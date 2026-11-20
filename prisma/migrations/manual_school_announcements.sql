CREATE TABLE "SchoolAnnouncement" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "classId" TEXT, "title" TEXT NOT NULL, "body" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'ALL', "published" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolAnnouncement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SchoolAnnouncement_companyId_published_createdAt_idx" ON "SchoolAnnouncement"("companyId", "published", "createdAt");
ALTER TABLE "SchoolAnnouncement" ADD CONSTRAINT "SchoolAnnouncement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolAnnouncement" ADD CONSTRAINT "SchoolAnnouncement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
