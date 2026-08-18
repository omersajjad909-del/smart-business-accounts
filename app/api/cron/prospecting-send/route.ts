import { NextRequest, NextResponse, after } from "next/server";
import { sendApprovedBatch, sendingEnabled } from "@/lib/prospecting/sending";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Cron: hourly during business hours, e.g. 04:00–13:00 UTC on weekdays
 * (09:00–18:00 PKT). Configure the schedule at cron-job.org alongside the
 * other jobs — see docs/AI-PROSPECTING.md.
 *
 * The send rate is a property of how often this runs multiplied by `limit`,
 * which is what keeps a new sending domain out of trouble. Ten per hour over
 * nine hours is 90 a day; that is a healthy ceiling for a warmed domain and
 * far too fast for a cold one, so start at 2.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!sendingEnabled()) {
    return NextResponse.json({ ok: true, skipped: "OUTREACH_SENDING_ENABLED is not true" });
  }

  const limit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("limit")) || Number(process.env.OUTREACH_PER_RUN || 5), 1),
    50,
  );

  after(async () => {
    try {
      const result = await sendApprovedBatch({ limit });
      console.log(
        `[cron] prospecting-send: sent=${result.sent} skipped=${result.skipped} failed=${result.failed}` +
          (result.blocked ? ` blocked=${result.blocked}` : ""),
      );
    } catch (err: any) {
      console.error("[cron] prospecting-send error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true, limit });
}
