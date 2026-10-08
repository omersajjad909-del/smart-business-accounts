/**
 * Move inline (base64) avatars and company logos out of the database and onto
 * Cloudinary, leaving only the URL behind.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/migrate-media-to-cloudinary.ts          # dry run: counts only
 *   npx tsx --env-file=.env scripts/migrate-media-to-cloudinary.ts --apply  # upload and rewrite
 *
 * Safe to re-run: only rows still holding a data: URL are touched, and each row
 * is rewritten only after its upload succeeded.
 */

import { PrismaClient } from "@prisma/client";
import { isMediaConfigured, uploadMedia } from "../lib/media";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  if (apply && !isMediaConfigured()) {
    throw new Error("Cloudinary keys are not set — add CLOUDINARY_URL to the environment first.");
  }

  const users = await prisma.user.findMany({
    where: { avatar: { startsWith: "data:" } },
    select: { id: true, email: true, avatar: true },
  });
  const companies = await prisma.company.findMany({
    where: { logoUrl: { startsWith: "data:" } },
    select: { id: true, name: true, logoUrl: true },
  });

  const mb = (rows: Array<{ v: string | null }>) =>
    (rows.reduce((n, r) => n + (r.v?.length ?? 0), 0) / 1024 / 1024).toFixed(1);
  console.log(`Inline avatars: ${users.length} (${mb(users.map((u) => ({ v: u.avatar })))} MB of text)`);
  console.log(`Inline logos:   ${companies.length} (${mb(companies.map((c) => ({ v: c.logoUrl })))} MB of text)`);

  if (!apply) {
    console.log("\nDry run — nothing changed. Re-run with --apply to migrate.");
    return;
  }

  let done = 0;
  let failed = 0;

  for (const u of users) {
    try {
      const url = await uploadMedia(u.avatar!, { kind: "avatars", scope: u.id });
      await prisma.user.update({ where: { id: u.id }, data: { avatar: url } });
      done++;
    } catch (err) {
      failed++;
      console.error(`avatar ${u.email}:`, err instanceof Error ? err.message : err);
    }
  }

  for (const c of companies) {
    try {
      const url = await uploadMedia(c.logoUrl!, { kind: "logos", scope: c.id });
      await prisma.company.update({ where: { id: c.id }, data: { logoUrl: url } });
      done++;
    } catch (err) {
      failed++;
      console.error(`logo ${c.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nMigrated ${done}, failed ${failed}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
