import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { createCompanyBackup, getBackupTargetCompanies } from "@/lib/backup";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Backup history across the whole platform, for /admin/backup-restore. */
export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const backups = await prisma.systemBackup.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      companyId: true,
      fileName: true,
      fileSize: true,
      backupType: true,
      status: true,
      createdAt: true,
      createdBy: true,
      // metadata deliberately excluded — it holds the whole snapshot
    },
  });

  const companyIds = Array.from(new Set(backups.map((b) => b.companyId)));
  const companies = companyIds.length
    ? await prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(companies.map((c) => [c.id, c.name]));

  const totals = await prisma.systemBackup
    .aggregate({ _sum: { fileSize: true }, _count: { _all: true } })
    .catch(() => null);

  return NextResponse.json({
    backups: backups.map((b) => ({ ...b, companyName: nameById.get(b.companyId) || null })),
    totalCount: totals?._count?._all ?? backups.length,
    totalBytes: totals?._sum?.fileSize ?? 0,
  });
}

/** "Run Backup Now" — snapshots every live company. */
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
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
      // "unchanged" means the data matched the existing snapshot, so nothing new
      // was stored — that is a successful check, not a skipped company.
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
