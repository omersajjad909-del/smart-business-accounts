-- AlterTable
ALTER TABLE "EducationApplication" ADD COLUMN     "applyClassId" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "previousSchool" TEXT;

-- AddForeignKey
ALTER TABLE "EducationApplication" ADD CONSTRAINT "EducationApplication_applyClassId_fkey" FOREIGN KEY ("applyClassId") REFERENCES "SchoolClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

