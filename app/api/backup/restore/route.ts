import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { restoreCompanyBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Restore one of THIS company's own snapshots.
 *
 * The heavy lifting (safety snapshot → transactional wipe → re-insert) lives in
 * restoreCompanyBackup so the tenant route, the file-upload route and the
 * platform-admin route all behave identically.
 */
export async function POST(req: NextRequest) {
  const userRole = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { backupId } = await req.json().catch(() => ({} as any));
  if (!backupId) return NextResponse.json({ error: "Backup ID required" }, { status: 400 });

  const backup = await prisma.systemBackup.findFirst({
    where: { id: backupId, companyId },
  });

  if (!backup) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  if (backup.status !== "COMPLETED" || !backup.metadata) {
    return NextResponse.json({ error: "Backup data is not available or incomplete" }, { status: 400 });
  }

  let data: any;
  try {
    data = JSON.parse(backup.metadata);
  } catch {
    return NextResponse.json({ error: "Backup data is corrupted" }, { status: 500 });
  }

  if (data.companyId && data.companyId !== companyId) {
    return NextResponse.json({ error: "Backup belongs to a different company" }, { status: 403 });
  }

  try {
    const result = await restoreCompanyBackup(companyId, data, { createdBy: userId });
    return NextResponse.json({
      success: true,
      message: `Data restored successfully — ${result.totalRows} record(s).`,
      restored: result.restored,
      totalRows: result.totalRows,
      safetyBackupId: result.safetyBackupId,
    });
  } catch (error: any) {
    // The transaction rolled back, so the company still holds its pre-restore data.
    return NextResponse.json(
      { error: `Restore failed — no data was changed. ${error.message}` },
      { status: 500 }
    );
  }
}
