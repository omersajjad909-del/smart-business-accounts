-- AlterTable
ALTER TABLE "SchoolStudent" ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "bFormNo" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "guardianCnic" TEXT,
ADD COLUMN     "guardianOccupation" TEXT,
ADD COLUMN     "guardianRelation" TEXT,
ADD COLUMN     "medicalNotes" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "previousClass" TEXT,
ADD COLUMN     "previousSchool" TEXT,
ADD COLUMN     "religion" TEXT;

