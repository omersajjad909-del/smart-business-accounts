ALTER TABLE "SchoolTeacher" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "SchoolTeacher_userId_key" ON "SchoolTeacher"("userId");
ALTER TABLE "SchoolTeacher" ADD CONSTRAINT "SchoolTeacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
