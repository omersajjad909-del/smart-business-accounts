-- Stop internal test workspaces from spending customer company numbers.
--
-- manual_company_no_demo_split.sql moved demo sandboxes onto their own sequence
-- in the 900000s, and renumbered real customers to a clean #100001, #100002, …
-- Gaps came back anyway, because that fix missed the other kind of non-customer
-- tenant: the workspaces /admin/dev-test creates. Those are full Company rows
-- with `isInternalTest = true`, hidden from the customer list and from every
-- metric — but they were still taking the next customer number each time an
-- admin launched one. That is the hole between #100004 and #100015.
--
-- Test workspaces now draw from the 800000s. The original sequence stays the
-- column default and remains customer-only, alongside the demo split. The last
-- section then renumbers real customers back to a contiguous #100001, #100002,
-- … closing the gap those workspaces left behind.
--
-- Idempotent: safe to run more than once.

CREATE SEQUENCE IF NOT EXISTS "Company_companyNo_test_seq" START WITH 800001 INCREMENT BY 1;

-- Park the rows being moved in a negative range first. `companyNo` is UNIQUE,
-- so assigning final numbers directly would collide with rows still holding
-- them. Only test workspaces are touched — customers and demos keep the numbers
-- they already have, because `companyNo` is shown to the customer in their own
-- dashboard ("Company ID: 100015") and must not change under them.
UPDATE "Company" SET "companyNo" = -"companyNo"
 WHERE "isInternalTest" = true AND "companyNo" > 0;

-- Internal test workspaces → 800001+, oldest first.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "Company"
  WHERE "isInternalTest" = true
)
UPDATE "Company" c
SET "companyNo" = 800000 + o.rn
FROM ordered o
WHERE c.id = o.id;

-- Point the customer sequence at the real high-water mark, now that test rows
-- are out of the way. COALESCE covers an empty table: setval() rejects a value
-- below the sequence minimum.
SELECT setval(
  '"Company_companyNo_seq"',
  COALESCE(
    (SELECT MAX("companyNo") FROM "Company"
      WHERE "isDemo" = false AND "isInternalTest" = false),
    100000
  )
);

SELECT setval(
  '"Company_companyNo_test_seq"',
  COALESCE((SELECT MAX("companyNo") FROM "Company" WHERE "isInternalTest" = true), 800000)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Close the gap that already exists.
--
-- Everything above stops NEW gaps. It does not close the current one: freeing
-- #100005–#100014 does not pull the later customers down into them, so the
-- numbering would stay #100004, #100015, …
--
-- This renumbers every real customer contiguously from #100001, oldest first —
-- the same thing manual_company_no_demo_split.sql did. Ordering is by
-- `createdAt`, so the result is deterministic and re-running this file produces
-- the same numbers again.
--
-- Two consequences, both accepted:
--   * A customer's visible Company ID changes. It is shown to them in their own
--     dashboard ("Company ID: 100015"), so A-H-R Trader becomes #100005.
--   * Admin links that carry an old number (/admin/companies/100015) will point
--     at a different company, or none. resolveCompanyRef still accepts UUIDs,
--     so UUID links and everything stored in other tables are unaffected —
--     nothing anywhere uses companyNo as a foreign key.

UPDATE "Company" SET "companyNo" = -"companyNo"
 WHERE "isDemo" = false AND "isInternalTest" = false AND "companyNo" > 0;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "Company"
  WHERE "isDemo" = false AND "isInternalTest" = false
)
UPDATE "Company" c
SET "companyNo" = 100000 + o.rn
FROM ordered o
WHERE c.id = o.id;

SELECT setval(
  '"Company_companyNo_seq"',
  COALESCE(
    (SELECT MAX("companyNo") FROM "Company"
      WHERE "isDemo" = false AND "isInternalTest" = false),
    100000
  )
);

-- Check the result before closing the tab.
SELECT "companyNo", name, "createdAt"
  FROM "Company"
 WHERE "isDemo" = false AND "isInternalTest" = false
 ORDER BY "companyNo";
