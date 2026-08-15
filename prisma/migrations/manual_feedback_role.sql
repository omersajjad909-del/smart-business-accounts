-- Job title on a review ("CEO", "Accountant"), so a published testimonial can
-- show the reviewer's designation beside their name. The old standalone review
-- page collected this; the merged Feedback & Reviews page now does.
-- Nullable and additive: existing rows and queries are unaffected.

ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "role" TEXT;
