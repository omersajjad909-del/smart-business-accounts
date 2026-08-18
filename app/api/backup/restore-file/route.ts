import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { restoreCompanyBackup } from "@/lib/backup";
import { looksLikeSnapshot } from "@/lib/backupTables";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Restore from a .json backup file the user uploads from their own machine. */
export async function POST(req: NextRequest) {
  const userRole = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  let data: any;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON file. Please upload a valid backup file." }, { status: 400 });
  }

  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Backup file is empty or invalid." }, { status: 400 });
  }

  // A companyId mismatch is intentionally allowed here: this covers restoring
  // your own export onto a new plan or workspace. restoreCompanyBackup re-stamps
  // every row onto the current company.
  if (!looksLikeSnapshot(data)) {
    return NextResponse.json({ error: "File does not appear to be a valid FinovaOS backup." }, { status: 400 });
  }

  try {
    const result = await restoreCompanyBackup(companyId, data, { createdBy: userId });
    return NextResponse.json({
      success: true,
      message: `Data restored from file — ${result.totalRows} record(s).`,
      restored: result.restored,
      totalRows: result.totalRows,
      safetyBackupId: result.safetyBackupId,
    });
  } catch (error: any) {
    // The transaction rolled back, so existing data is untouched.
    return NextResponse.json(
      { error: `Restore failed — no data was changed. ${error.message}` },
      { status: 500 }
    );
  }
}
