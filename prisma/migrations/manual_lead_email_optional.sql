-- Lead.email becomes optional.
-- Manual, idempotent. Run in your Postgres / Supabase SQL editor. Safe to re-run.
--
-- Why: the leads worth the most arrive without an email. A trader met at a
-- market stall or an Anjuman-e-Tajiran session gives a phone number; asking for
-- an address gets a blank look. With NOT NULL on this column those people could
-- not be recorded at all, so the CRM was unusable during exactly the sales
-- activity it was built for.
--
-- This only DROPS a constraint. No data is read, written, or moved, and every
-- existing row already satisfies the looser rule — so it cannot fail on a
-- populated table and it cannot lose anything.
--
-- Contact details are still required, just not this particular one:
-- app/api/admin/leads/route.ts rejects a lead carrying neither an email nor a
-- phone number.
--
-- To undo (only possible while no row has a NULL email):
--   ALTER TABLE "Lead" ALTER COLUMN "email" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Lead'
      AND column_name = 'email'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "Lead" ALTER COLUMN "email" DROP NOT NULL;
    RAISE NOTICE 'Lead.email is now nullable.';
  ELSE
    RAISE NOTICE 'Lead.email was already nullable — nothing to do.';
  END IF;
END $$;
