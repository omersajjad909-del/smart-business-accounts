import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const exists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'AutomationAddon'
      );
    `);
    console.log("Table exists check:", JSON.stringify(exists));

    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "AutomationAddon" LIMIT 20;`);
      console.log("Rows:", JSON.stringify(rows, null, 2));
    } catch (e) {
      console.log("SELECT error:", e.message);
    }

    try {
      const ext = await prisma.$queryRawUnsafe(`SELECT extname FROM pg_extension;`);
      console.log("Extensions:", JSON.stringify(ext));
    } catch (e) {
      console.log("Extension check error:", e.message);
    }

    // Try to reproduce the exact create+insert without swallowing errors
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AutomationAddon" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "companyId" TEXT NOT NULL UNIQUE,
          "enabled" BOOLEAN NOT NULL DEFAULT true,
          "plan" TEXT NOT NULL DEFAULT 'MONTHLY',
          "pricePerMonth" DOUBLE PRECISION NOT NULL DEFAULT 79,
          "expiresAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("CREATE TABLE: OK (no error)");
    } catch (e) {
      console.log("CREATE TABLE error:", e.message);
    }

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "AutomationAddon" ("companyId", "enabled", "plan", "pricePerMonth")
        VALUES ('__test_company_id__', true, 'MONTHLY', 79)
        ON CONFLICT ("companyId") DO UPDATE SET "enabled" = true, "updatedAt" = NOW()
      `);
      console.log("TEST INSERT: OK (no error)");
      const check = await prisma.$queryRawUnsafe(`SELECT * FROM "AutomationAddon" WHERE "companyId" = '__test_company_id__'`);
      console.log("Test row:", JSON.stringify(check));
      await prisma.$executeRawUnsafe(`DELETE FROM "AutomationAddon" WHERE "companyId" = '__test_company_id__'`);
    } catch (e) {
      console.log("TEST INSERT error:", e.message);
    }
  } catch (e) {
    console.error("Fatal:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
