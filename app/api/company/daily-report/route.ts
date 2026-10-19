import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { getDailyReportSettings, saveDailyReportSettings } from "@/lib/dailyReportSettings";
import { buildDailyReport, formatReportText, runDailyReportForCompany } from "@/lib/dailyReport";

export const runtime = "nodejs";
export const maxDuration = 60;

function isTenantAdmin(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  return String(payload?.role || "").toUpperCase() === "ADMIN";
}

async function guard(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return { error: NextResponse.json({ error: "Company required" }, { status: 400 }) };
  if (!isTenantAdmin(req)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { companyId };
}

// GET → settings. GET ?preview=1 → settings + today's report text (no sending).
export async function GET(req: NextRequest) {
  try {
    const g = await guard(req);
    if (g.error) return g.error;
    const settings = await getDailyReportSettings(g.companyId!);
    if (req.nextUrl.searchParams.get("preview")) {
      const report = await buildDailyReport(g.companyId!, settings.timezone);
      return NextResponse.json({ settings, report, text: formatReportText(report) });
    }
    return NextResponse.json({ settings });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

// POST { settings } → save. POST { action: "test" } → send a report right now.
export async function POST(req: NextRequest) {
  try {
    const g = await guard(req);
    if (g.error) return g.error;
    const body = await req.json().catch(() => ({}));

    if (body.action === "test") {
      const r = await runDailyReportForCompany(g.companyId!, { force: true });
      if ("skipped" in r) {
        return NextResponse.json(
          { error: "Pehle kam az kam ek phone number ya email add karke save karein." },
          { status: 400 },
        );
      }
      return NextResponse.json({ ok: r.okCount > 0, results: r.results });
    }

    const saved = await saveDailyReportSettings(g.companyId!, body.settings || {});
    return NextResponse.json({ settings: saved });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
