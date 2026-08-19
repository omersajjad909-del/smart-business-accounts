import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCompanyBackup, getBackupTargetCompanies } from "@/lib/backup";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: daily at 02:00 UTC. Fire-and-forget: response returns immediately
// while backup snapshots are created in the background.
//
// Snapshots live in the database only — no notification email is sent. Backups
// are pulled on demand from Dashboard → Backup & Restore.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    await runBackups();
  });

  return NextResponse.json({ ok: true, started: true });
}

async function runBackups() {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const dayOfMonth = today.getUTCDate();

  const schedules = await prisma.backupSchedule.findMany({
    where: { isActive: true },
  });
  const scheduledCompanyIds = new Set(schedules.map((s) => s.companyId));

  // Companies due today per their own schedule…
  const dueCompanyIds = new Set(
    schedules
      .filter(
        (s) =>
          s.frequency === "DAILY" ||
          (s.frequency === "WEEKLY" && s.dayOfWeek === dayOfWeek) ||
          (s.frequency === "MONTHLY" && s.dayOfMonth === dayOfMonth)
      )
      .map((s) => s.companyId)
  );

  // …plus every live company that never configured one. Without this fallback
  // the cron backed up nothing at all (no tenant has a BackupSchedule row), so
  // the admin dashboard reported "Backup: UNKNOWN" forever.
  const allCompanies = await getBackupTargetCompanies();
  for (const c of allCompanies) {
    if (!scheduledCompanyIds.has(c.id)) dueCompanyIds.add(c.id);
  }

  const results: { companyId: string; status: string; error?: string }[] = [];

  for (const companyId of dueCompanyIds) {
    try {
      await createCompanyBackup(companyId, {
        backupType: "SCHEDULED",
        createdBy: "CRON",
        keepLast: 30,
      });

      if (scheduledCompanyIds.has(companyId)) {
        await prisma.backupSchedule
          .update({ where: { companyId }, data: { lastRunAt: today } })
          .catch(() => {});
      }

      results.push({ companyId, status: "success" });
    } catch (err: any) {
      console.error(`Backup failed for ${companyId}:`, err);
      results.push({ companyId, status: "failed", error: err.message });
    }
  }

  console.log(`[cron] backup complete: ${results.length} runs`, results);
}
