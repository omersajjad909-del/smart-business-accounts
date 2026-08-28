import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { resolveCompanyId } from "@/lib/tenant";
import { dayStart } from "@/lib/biometric";
import { finalizeDay, processPunches, resolveUnmappedPunches } from "@/lib/attendanceProcessing";

const MAX_ROWS = 500;

/**
 * The raw scan log, plus the controls that rebuild daily attendance from it.
 * Punches are never edited here — a wrong day is fixed by changing the rules
 * and replaying, which is why the log is worth keeping.
 */

// GET: the log. ?deviceId= &employeeId= &from= &to= &unmappedOnly=1
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const q = new URL(req.url).searchParams;
    const from = q.get("from");
    const to = q.get("to");

    const where: any = { companyId };
    if (q.get("deviceId")) where.deviceId = q.get("deviceId");
    if (q.get("employeeId")) where.employeeId = q.get("employeeId");
    if (q.get("unmappedOnly") === "1") where.employeeId = null;
    if (from || to) {
      where.punchTime = {};
      if (from) where.punchTime.gte = dayStart(from);
      if (to) {
        const end = dayStart(to);
        end.setHours(23, 59, 59, 999);
        where.punchTime.lte = end;
      }
    }

    const [rows, total] = await Promise.all([
      prisma.attendancePunch.findMany({
        where,
        select: {
          id: true,
          biometricId: true,
          punchTime: true,
          direction: true,
          verifyMode: true,
          source: true,
          processed: true,
          device: { select: { id: true, name: true } },
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { punchTime: "desc" },
        take: MAX_ROWS,
      }),
      prisma.attendancePunch.count({ where }),
    ]);

    return NextResponse.json({ rows, total, capped: total > MAX_ROWS });
  } catch (error) {
    console.error("Error fetching punches:", error);
    return NextResponse.json({ error: "Failed to fetch punches" }, { status: 500 });
  }
}

/**
 * POST: run one of the jobs.
 *   { action: "reprocess", from, to }  — rebuild daily rows from raw punches
 *   { action: "relink" }               — adopt punches a new mapping unlocked
 *   { action: "finalize", date }       — mark the no-shows ABSENT
 */
export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const action = String(body?.action || "reprocess");

    if (action === "relink") {
      const linked = await resolveUnmappedPunches(companyId);
      return NextResponse.json({ action, historyLinked: linked });
    }

    if (action === "finalize") {
      const date = String(body?.date || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
      }
      const settingsRow = await prisma.activityLog.findFirst({
        where: { companyId, action: "COMPANY_HOLIDAY_SETTINGS" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      });
      let weeklyOffDays = [0];
      try {
        const parsed = settingsRow?.details ? JSON.parse(settingsRow.details) : null;
        if (Array.isArray(parsed?.weeklyOffDays)) weeklyOffDays = parsed.weeklyOffDays;
      } catch {}

      const result = await finalizeDay(companyId, date, weeklyOffDays);
      return NextResponse.json({ action, ...result });
    }

    const fromRaw = String(body?.from || "");
    const toRaw = String(body?.to || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
      return NextResponse.json({ error: "from and to must be YYYY-MM-DD" }, { status: 400 });
    }

    const from = dayStart(fromRaw);
    const to = dayStart(toRaw);
    to.setHours(23, 59, 59, 999);

    const result = await processPunches(companyId, { from, to, onlyUnprocessed: false });
    return NextResponse.json({ action: "reprocess", ...result });
  } catch (error) {
    console.error("Error processing punches:", error);
    return NextResponse.json({ error: "Failed to process punches" }, { status: 500 });
  }
}
