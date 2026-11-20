CREATE TABLE "EducationCourseRegistration" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "enrollmentId" TEXT NOT NULL, "courseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REGISTERED', "marks" DOUBLE PRECISION, "grade" TEXT, "gradePoints" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EducationCourseRegistration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EducationCourseRegistration_enrollmentId_courseId_key" ON "EducationCourseRegistration"("enrollmentId", "courseId");
CREATE INDEX "EducationCourseRegistration_companyId_enrollmentId_idx" ON "EducationCourseRegistration"("companyId", "enrollmentId");
ALTER TABLE "EducationCourseRegistration" ADD CONSTRAINT "EducationCourseRegistration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationCourseRegistration" ADD CONSTRAINT "EducationCourseRegistration_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "EducationEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationCourseRegistration" ADD CONSTRAINT "EducationCourseRegistration_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EducationCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
