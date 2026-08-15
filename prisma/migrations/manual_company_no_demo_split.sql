-- Keep customer-facing company numbers clean and gap-free.
--
-- `companyNo` was one autoincrement sequence shared by real customers and demo
-- sandboxes. lib/demoSandbox.ts keeps a shelf of pre-warmed sandboxes (2 per
-- business type) and rebuilds them constantly, so every few minutes it burned
-- another number. The result: three real customers numbered #100001, #100002
-- and #100017, with the next real signup heading for ~#100104.
--
-- Demo sandboxes now draw from their own sequence in the 900000s. The original
-- sequence stays the column default and becomes the customer-only sequence, so
-- real signups continue #100004, #100005, …
--
-- Idempotent: safe to run more than once.

CREATE SEQUENCE IF NOT EXISTS "Company_companyNo_demo_seq" START WITH 900001 INCREMENT BY 1;

-- Park every row in a negative range first. `companyNo` is UNIQUE, so assigning
-- the final numbers directly would collide with rows that still hold them.
UPDATE "Company" SET "companyNo" = -"companyNo" WHERE "companyNo" > 0;

-- Demo sandboxes → 900001+, oldest first.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "Company"
  WHERE "isDemo" = true
)
UPDATE "Company" c
SET "companyNo" = 900000 + o.rn
FROM ordered o
WHERE c.id = o.id;

-- Real customers → 100001+, oldest first.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "Company"
  WHERE "isDemo" = false
)
UPDATE "Company" c
SET "companyNo" = 100000 + o.rn
FROM ordered o
WHERE c.id = o.id;

-- Point each sequence at its own high-water mark. COALESCE covers an empty
-- table: setval() rejects a value below the sequence minimum.
SELECT setval(
  '"Company_companyNo_seq"',
  COALESCE((SELECT MAX("companyNo") FROM "Company" WHERE "isDemo" = false), 100000)
);

SELECT setval(
  '"Company_companyNo_demo_seq"',
  COALESCE((SELECT MAX("companyNo") FROM "Company" WHERE "isDemo" = true), 900000)
);
