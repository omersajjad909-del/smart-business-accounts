/**
 * Proves the dedupe fix on a THROWAWAY company. Simulates the user's report:
 * pressing "Run Backup Now" three times in a row.
 */
import { prisma } from "@/lib/prisma";
import { createCompanyBackup, readSnapshot } from "@/lib/backup";
import { BACKUP_TABLES } from "@/lib/backupTables";

const TAG = "ZZ_DEDUPE_SELFTEST";
let companyId = "";

async function snapshotRows() {
  return prisma.systemBackup.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    select: { id: true, fileSize: true, contentHash: true, verifiedAt: true, createdAt: true },
  });
}

async function report(label: string) {
  const rows = await snapshotRows();
  const total = rows.reduce((a, r) => a + (r.fileSize || 0), 0);
  console.log(
    `  ${label.padEnd(30)} ${rows.length} snapshot(s), ${(total / 1024).toFixed(1)} KB stored` +
      `  [hashes: ${new Set(rows.map((r) => r.contentHash)).size} distinct]`
  );
  return rows;
}

try {
  const company = await prisma.company.create({
    data: { name: `${TAG} (safe to delete)`, isInternalTest: true, isActive: false },
  });
  companyId = company.id;

  const parent = await prisma.account.create({
    data: { companyId, code: "1000", name: "Assets", type: "ASSET" },
  });
  await prisma.account.create({
    data: { companyId, code: "1001", name: "Cash", type: "ASSET", parentId: parent.id },
  });
  for (let i = 0; i < 40; i++) {
    await prisma.itemNew.create({
      data: { companyId, code: `IT-${i}`, name: `Widget ${i}`, unit: "PCS", rate: 100 + i },
    });
  }

  console.log(`\nThrowaway company ${companyId}\n`);

  // ── three clicks of "Run Backup Now", data unchanged ─────────────────────
  for (let click = 1; click <= 3; click++) {
    const r = await createCompanyBackup(companyId, { backupType: "MANUAL", keepLast: 10 });
    console.log(`  click ${click}: ${r.deduped ? "deduped (reused existing)" : "new snapshot stored"}`);
  }
  const afterClicks = await report("after 3 identical clicks");

  if (afterClicks.length !== 1) {
    console.log(`  FAIL — expected 1 snapshot, got ${afterClicks.length}`);
    process.exitCode = 1;
  } else if (!afterClicks[0].verifiedAt) {
    console.log("  FAIL — verifiedAt was not stamped");
    process.exitCode = 1;
  } else {
    console.log("  PASS — three clicks left exactly one snapshot, verifiedAt refreshed\n");
  }

  // ── data actually changes → a real new snapshot must appear ──────────────
  await prisma.itemNew.create({
    data: { companyId, code: "IT-NEW", name: "Brand new widget", unit: "PCS", rate: 999 },
  });
  const changed = await createCompanyBackup(companyId, { backupType: "MANUAL", keepLast: 10 });
  const afterChange = await report("after real data change");
  console.log(
    afterChange.length === 2 && !changed.deduped
      ? "  PASS — a genuine change still produces a new snapshot\n"
      : "  FAIL — data changed but no new snapshot was created\n"
  );
  if (afterChange.length !== 2 || changed.deduped) process.exitCode = 1;

  // ── the stored (compressed) payload must still restore-parse cleanly ─────
  const stored = await prisma.systemBackup.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: { metadata: true, fileSize: true },
  });
  const parsed = readSnapshot(stored!.metadata!);
  const rawSize = Buffer.byteLength(JSON.stringify(parsed), "utf8");
  console.log(
    `  compression: ${(rawSize / 1024).toFixed(1)} KB raw -> ${((stored!.fileSize || 0) / 1024).toFixed(1)} KB stored ` +
      `(${(rawSize / (stored!.fileSize || 1)).toFixed(1)}x)`
  );
  const ok = parsed.items?.length === 41 && parsed.accounts?.length === 2;
  console.log(`  ${ok ? "PASS" : "FAIL"} — compressed snapshot decodes back to the right data ` +
    `(accounts=${parsed.accounts?.length}, items=${parsed.items?.length})`);
  if (!ok) process.exitCode = 1;
} finally {
  if (companyId) {
    for (const t of [...BACKUP_TABLES].reverse()) {
      const model = (prisma as any)[t.model];
      if (model) await model.deleteMany({ where: t.where(companyId) }).catch(() => {});
    }
    await prisma.systemBackup.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.company.delete({ where: { id: companyId } }).catch(() => {});
    console.log(`\n  cleaned up throwaway company ${companyId}`);
  }
  await prisma.$disconnect();
}
