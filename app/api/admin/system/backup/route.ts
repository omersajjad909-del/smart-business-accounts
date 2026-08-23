import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { createCompanyBackup, getBackupTargetCompanies } from "@/lib/backup";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Backup history across the whole platform, for /admin/backup-restore. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const visibleCompanies = await prisma.company.findMany({
    where: {
      isActive: true,
      isDemo: false,
      isInternalTest: false,
      NOT: { name: { startsWith: "ZZ_" } },
    },
    select: { id: true, name: true, companyNo: true },
  });

  const visibleCompanyIds = visibleCompanies.map((c) => c.id);
  const backupWhere = {
    companyId: { in: visibleCompanyIds.length ? visibleCompanyIds : ["__none__"] },
  };

  const backups = await prisma.systemBackup.findMany({
    where: backupWhere,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      companyId: true,
      fileName: true,
      fileSize: true,
      backupType: true,
      status: true,
      createdAt: true,
      createdBy: true,
      verifiedAt: true,
    },
  });

  const nameById = new Map(visibleCompanies.map((c) => [c.id, c.name]));
  // Backup rows store the company UUID; the UI shows only companyNo, so the
  // short number has to ride along with every row.
  const companyNoById = new Map(visibleCompanies.map((c) => [c.id, c.companyNo]));
  const seenCompanyIds = new Set<string>();
  const latestBackups = backups.filter((backup) => {
    if (seenCompanyIds.has(backup.companyId)) return false;
    seenCompanyIds.add(backup.companyId);
    return true;
  });

  const totals = await prisma.systemBackup
    .aggregate({
      where: backupWhere,
      _sum: { fileSize: true },
      _count: { _all: true },
    })
    .catch(() => null);

  return NextResponse.json({
    backups: latestBackups.map((b) => ({
      ...b,
      companyName: nameById.get(b.companyId) || null,
      companyNo: companyNoById.get(b.companyId) ?? null,
    })),
    history: backups.map((b) => ({
      ...b,
      companyName: nameById.get(b.companyId) || null,
      companyNo: companyNoById.get(b.companyId) ?? null,
    })),
    companyCount: visibleCompanyIds.length,
    totalCount: totals?._count?._all ?? backups.length,
    totalBytes: totals?._sum?.fileSize ?? 0,
  });
}

/** "Run Backup Now" - snapshots every live company. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const companies = await getBackupTargetCompanies();
  if (companies.length === 0) {
    return NextResponse.json({ ok: true, ran: 0, failed: 0, message: "No active companies to back up." });
  }

  const results: { companyId: string; status: string; error?: string }[] = [];
  for (const c of companies) {
    try {
      const r = await createCompanyBackup(c.id, {
        backupType: "MANUAL",
        createdBy: admin.id,
        keepLast: 10,
      });
      results.push({ companyId: c.id, status: r.deduped ? "unchanged" : "success" });
    } catch (err: any) {
      console.error(`[admin] backup failed for ${c.id}:`, err);
      results.push({ companyId: c.id, status: "failed", error: String(err?.message || err) });
    }
  }

  const failed = results.filter((r) => r.status === "failed").length;
  const unchanged = results.filter((r) => r.status === "unchanged").length;
  const created = results.filter((r) => r.status === "success").length;

  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "RUN_BACKUP",
    targetType: "System",
    details: { companies: companies.length, created, unchanged, failed },
  });

  return NextResponse.json({
    ok: failed === 0,
    ran: created + unchanged,
    created,
    unchanged,
    failed,
    results,
  });
}
