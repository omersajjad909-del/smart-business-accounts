import { prisma } from "@/lib/prisma";
import {
  BACKUP_TABLES,
  BACKUP_FORMAT_VERSION,
  normalizeSnapshot,
  type BackupTable,
} from "@/lib/backupTables";

export type BackupResult = {
  companyId: string;
  backupId: string;
  fileName: string;
  fileSize: number;
  jsonStr: string;
  counts: Record<string, number>;
};

export type RestoreResult = {
  companyId: string;
  restored: Record<string, number>;
  totalRows: number;
  safetyBackupId: string | null;
};

/** Prisma delegate for a manifest entry, or null if the model is not generated. */
function delegate(client: any, model: string) {
  const d = client?.[model];
  return d && typeof d.findMany === "function" ? d : null;
}

/**
 * Snapshot one company's data into a SystemBackup row.
 *
 * The record is created up-front as PENDING so a crash mid-collection still
 * leaves a visible trail, then flipped to COMPLETED / FAILED. Callers get the
 * raw JSON back so they can email or download it without re-reading the blob.
 *
 * Coverage is defined by BACKUP_TABLES — the same list restore writes back, so
 * the two can never drift apart again.
 */
export async function createCompanyBackup(
  companyId: string,
  opts: { backupType?: string; createdBy?: string | null; keepLast?: number } = {}
): Promise<BackupResult> {
  const backupType = opts.backupType || "FULL";
  const createdBy = opts.createdBy ?? null;
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${companyId.slice(0, 8)}-${timestamp}.json`;

  const backup = await prisma.systemBackup.create({
    data: { companyId, fileName, backupType, status: "PENDING", createdBy },
  });

  try {
    const exportData: Record<string, any> = {
      companyId,
      exportedAt: now.toISOString(),
      version: BACKUP_FORMAT_VERSION,
    };
    const counts: Record<string, number> = {};

    for (const table of BACKUP_TABLES) {
      const model = delegate(prisma as any, table.model);
      if (!model) {
        exportData[table.key] = [];
        counts[table.key] = 0;
        continue;
      }
      const rows = await model.findMany({ where: table.where(companyId) });
      exportData[table.key] = rows;
      counts[table.key] = rows.length;
    }

    const jsonStr = JSON.stringify(exportData);
    const fileSize = Buffer.byteLength(jsonStr, "utf8");

    await prisma.systemBackup.update({
      where: { id: backup.id },
      data: { status: "COMPLETED", fileSize, metadata: jsonStr },
    });

    if (opts.keepLast && opts.keepLast > 0) {
      await pruneCompanyBackups(companyId, backupType, opts.keepLast);
    }

    return { companyId, backupId: backup.id, fileName, fileSize, jsonStr, counts };
  } catch (err: any) {
    await prisma.systemBackup
      .update({
        where: { id: backup.id },
        data: { status: "FAILED", metadata: JSON.stringify({ error: String(err?.message || err) }) },
      })
      .catch(() => {});
    throw err;
  }
}

/**
 * Replace one company's data with the contents of a snapshot.
 *
 * Three things make this safe, and all three were missing before:
 *
 *  1. A safety snapshot of the CURRENT data is taken first, so even a restore
 *     of the wrong file is undoable.
 *  2. The wipe and the re-insert run inside ONE transaction. Previously the
 *     delete ran unguarded and every failed insert was swallowed with a
 *     console.warn, so a half-finished restore left the company gutted.
 *  3. Deletes walk BACKUP_TABLES in reverse and inserts walk it forward, so
 *     nothing is ever deleted that the snapshot cannot put back.
 *
 * Row ids are preserved, which is what keeps foreign keys between documents
 * (voucher → receipt, PO → invoice, reconciliation → statement) intact.
 */
export async function restoreCompanyBackup(
  companyId: string,
  raw: any,
  opts: { safetyBackup?: boolean; createdBy?: string | null; timeoutMs?: number } = {}
): Promise<RestoreResult> {
  const data = normalizeSnapshot(raw);

  // 1 ─ Safety net first. If this fails the restore does not start at all.
  let safetyBackupId: string | null = null;
  if (opts.safetyBackup !== false) {
    const safety = await createCompanyBackup(companyId, {
      backupType: "PRE_RESTORE",
      createdBy: opts.createdBy ?? null,
      keepLast: 5,
    });
    safetyBackupId = safety.backupId;
  }

  const restored: Record<string, number> = {};

  // 2 ─ Everything below is one transaction: it either all lands or none does.
  await prisma.$transaction(
    async (tx) => {
      // Wipe children before parents.
      for (const table of [...BACKUP_TABLES].reverse()) {
        const model = delegate(tx as any, table.model);
        if (!model) continue;
        await model.deleteMany({ where: table.where(companyId) });
      }

      // Re-insert parents before children.
      for (const table of BACKUP_TABLES) {
        const rows = data[table.key];
        if (!rows?.length) {
          restored[table.key] = 0;
          continue;
        }
        const model = delegate(tx as any, table.model);
        if (!model) {
          restored[table.key] = 0;
          continue;
        }
        const payload = table.hasCompanyId
          ? rows.map((r: any) => ({ ...r, companyId }))
          : rows;
        restored[table.key] = await insertRows(model, payload, table);
      }
    },
    {
      maxWait: 15_000,
      timeout: opts.timeoutMs ?? 50_000,
    }
  );

  const totalRows = Object.values(restored).reduce((a, b) => a + b, 0);
  return { companyId, restored, totalRows, safetyBackupId };
}

/** Postgres caps bind parameters per statement, so long tables go in slices. */
const INSERT_CHUNK = 500;

/**
 * Insert one table's rows.
 *
 * No retry loop here on purpose: inside a Postgres transaction the first failed
 * statement aborts the whole transaction, so a "skip and retry" pass could never
 * work. Rows are ordered correctly up-front instead, and a genuine failure is
 * allowed to propagate — that is what triggers the rollback.
 */
async function insertRows(model: any, rows: any[], table: BackupTable): Promise<number> {
  const ordered = table.selfParent ? orderBySelfParent(rows, table.selfParent) : rows;
  let inserted = 0;

  for (let i = 0; i < ordered.length; i += INSERT_CHUNK) {
    const chunk = ordered.slice(i, i + INSERT_CHUNK);
    try {
      const res = await model.createMany({ data: chunk });
      inserted += res?.count ?? chunk.length;
    } catch (err: any) {
      const detail = String(err?.message || err)
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean)
        .slice(-1)[0];
      throw new Error(`${table.label}: could not be restored — ${detail}`);
    }
  }

  return inserted;
}

/**
 * Depth-order rows whose parent lives in the same table (Account.parentId), so
 * a parent is always inserted before the children that point at it.
 */
function orderBySelfParent(rows: any[], field: string): any[] {
  const byId = new Map<string, any>(rows.map((r) => [r.id, r]));
  const out: any[] = [];
  const placed = new Set<string>();
  const onPath = new Set<string>();

  const visit = (row: any) => {
    if (!row || placed.has(row.id) || onPath.has(row.id)) return; // onPath guards cycles
    onPath.add(row.id);
    const parentId = row[field];
    if (parentId && byId.has(parentId)) visit(byId.get(parentId));
    onPath.delete(row.id);
    placed.add(row.id);
    out.push(row);
  };

  for (const row of rows) visit(row);
  return out;
}

/** Drop everything past the newest `keepLast` snapshots of one type. */
export async function pruneCompanyBackups(companyId: string, backupType: string, keepLast: number) {
  const all = await prisma.systemBackup.findMany({
    where: { companyId, backupType },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (all.length > keepLast) {
    const toDelete = all.slice(keepLast).map((b) => b.id);
    await prisma.systemBackup.deleteMany({ where: { id: { in: toDelete } } });
  }
}

/**
 * Companies a platform-wide backup should cover: live tenants only — demo
 * sandboxes and internal test workspaces are throwaway by design.
 */
export async function getBackupTargetCompanies() {
  return prisma.company.findMany({
    where: { isActive: true, isDemo: false, isInternalTest: false },
    select: { id: true, name: true },
  });
}
