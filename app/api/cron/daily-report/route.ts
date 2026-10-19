import { NextRequest, NextResponse, after } from "next/server";
import { listEnabledCompanyIds } from "@/lib/dailyReportSettings";
import { runDailyReportForCompany } from "@/lib/dailyReport";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: safe to call as often as hourly (or once a day). Each company has its
// own send time + timezone; a company is only processed once its local clock
// has passed that time, and only once per local day (lastSentDate), so extra
// invocations never double-send and a missed tick is caught up on the next.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const ids = await listEnabledCompanyIds();
      let sent = 0;
      for (const id of ids) {
        try {
          const r = await runDailyReportForCompany(id);
          if ("okCount" in r && r.okCount > 0) sent++;
        } catch (e) {
          console.error("[cron] daily-report company failed:", id, e);
        }
      }
      console.log(`[cron] daily-report complete: ${ids.length} enabled, ${sent} sent`);
    } catch (err) {
      console.error("[cron] daily-report error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
