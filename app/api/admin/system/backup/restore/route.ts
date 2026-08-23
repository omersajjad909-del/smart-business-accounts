import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { restoreCompanyBackup, readSnapshot } from "@/lib/backup";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Platform-admin restore, used by /admin/backup-restore.
 *
 * Unlike the tenant route this is deliberately cross-company: the target
 * company is read from the SNAPSHOT RECORD, never from the admin's own session.
 * A super-admin has no tenant company of their own, so scoping by session was
 * exactly why the admin panel could not restore anyone's data.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const { backupId, confirmCompanyId } = await req.json().catch(() => ({} as any));
  if (!backupId) return NextResponse.json({ error: "Backup ID required" }, { status: 400 });

  const backup = await prisma.systemBackup.findUnique({ where: { id: backupId } });
  if (!backup) return NextResponse.json({ error: "Backup not found" }, { status: 404 });

  if (backup.status !== "COMPLETED" || !backup.metadata) {
    return NextResponse.json({ error: "Backup data is not available or incomplete" }, { status: 400 });
  }

  // The company this snapshot belongs to — the only company it may be written to.
  const companyId = backup.companyId;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });
  if (!company) {
    return NextResponse.json(
      { error: `Company ${companyId} no longer exists — nothing to restore into.` },
      { status: 404 }
    );
  }

  // The UI shows the admin which company id it is about to overwrite and echoes
  // it back, so a mis-click on a neighbouring row cannot silently wipe a tenant.
  if (confirmCompanyId && confirmCompanyId !== companyId) {
    return NextResponse.json(
      { error: "Company mismatch — this snapshot belongs to a different company. Reload and try again." },
      { status: 409 }
    );
  }

  let data: any;
  try {
    data = readSnapshot(backup.metadata);
  } catch {
    return NextResponse.json({ error: "Backup data is corrupted" }, { status: 500 });
  }

  try {
    const result = await restoreCompanyBackup(companyId, data, { createdBy: admin.id });

    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "RESTORE_BACKUP",
      targetType: "Company",
      targetId: companyId,
      targetLabel: company.name,
      companyId,
      details: {
        backupId,
        fileName: backup.fileName,
        backupCreatedAt: backup.createdAt,
        totalRows: result.totalRows,
        safetyBackupId: result.safetyBackupId,
      },
    });

    return NextResponse.json({
      success: true,
      companyId,
      companyName: company.name,
      totalRows: result.totalRows,
      restored: result.restored,
      safetyBackupId: result.safetyBackupId,
      message: `${company.name} restored — ${result.totalRows} record(s).`,
    });
  } catch (error: any) {
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "RESTORE_BACKUP_FAILED",
      targetType: "Company",
      targetId: companyId,
      targetLabel: company.name,
      companyId,
      details: { backupId, error: String(error?.message || error) },
    });

    // The restore ran in a transaction, so the tenant still holds its data.
    return NextResponse.json(
      { error: `Restore failed — no data was changed. ${error.message}` },
      { status: 500 }
    );
  }
}
