-- Star rating on dashboard feedback, and the link to a published testimonial.
-- Both columns are nullable and additive: existing rows and queries are
-- unaffected. "rating" is only populated for feedback of type "feedback";
-- complaints, bugs and suggestions leave it NULL.

ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "rating" INTEGER;
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "testimonialId" TEXT;
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "publishConsent" BOOLEAN NOT NULL DEFAULT false;

-- A rating is only ever valid as 1-5 stars.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Feedback_rating_range'
  ) THEN
    ALTER TABLE "Feedback"
      ADD CONSTRAINT "Feedback_rating_range"
      CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));
  END IF;
END $$;
