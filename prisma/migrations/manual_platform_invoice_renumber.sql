-- ONE-TIME renumber: move the per-year sequence to start at 100001.
--
-- The first backfill numbered from 000001, which advertises exact sales volume
-- on every document a customer receives ("INV-2026-000002" = the second sale
-- ever made). SEQ_START in lib/platformInvoice.ts now begins each year at
-- 100001; this brings the rows already written into that range.
--
-- Run this ONCE, and only while the numbers it rewrites have not yet reached a
-- customer. An invoice number is the document's identity: once someone holds a
-- PDF bearing it, it must never move again.
--
-- Safe to run before or after the code deploy — nextInvoiceNumber() takes
-- max(last + 1, 100001), so live payments land in the right range either way.

BEGIN;

WITH ordered AS (
  SELECT
    "id",
    EXTRACT(YEAR FROM "issuedAt")::int AS yr,
    -- Chronological within each year, so the sequence ascends with time.
    -- "createdAt" breaks ties for two charges sharing an instant.
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM "issuedAt")
      ORDER BY "issuedAt", "createdAt"
    ) AS rn
  FROM "PlatformInvoice"
  -- Only rows still in the old low range; anything already at/above 100001 was
  -- issued under the current scheme and is left untouched.
  WHERE SPLIT_PART("number", '-', 3)::bigint < 100001
)
UPDATE "PlatformInvoice" p
SET "number" = 'INV-' || o.yr || '-' || LPAD((100000 + o.rn)::text, 6, '0')
FROM ordered o
WHERE p."id" = o."id";

COMMIT;

-- Verify:
--   SELECT "number", "issuedAt", "currency", "total", "companyName"
--   FROM "PlatformInvoice" ORDER BY "number";
