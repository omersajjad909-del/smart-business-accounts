-- Add companyNo: unique human-readable integer ID per company, starting at 100001
CREATE SEQUENCE IF NOT EXISTS "Company_companyNo_seq" START WITH 100001 INCREMENT BY 1;

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "companyNo" INTEGER NOT NULL DEFAULT nextval('"Company_companyNo_seq"');

-- Assign sequential numbers to all existing companies (oldest first)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn FROM "Company"
)
UPDATE "Company" c
SET "companyNo" = 100000 + o.rn
FROM ordered o
WHERE c.id = o.id;

-- Advance the sequence past the backfilled values so new companies get the next number
SELECT setval('"Company_companyNo_seq"', COALESCE((SELECT MAX("companyNo") FROM "Company"), 100000));

-- Unique constraint
ALTER TABLE "Company"
  ADD CONSTRAINT "Company_companyNo_key" UNIQUE ("companyNo");
