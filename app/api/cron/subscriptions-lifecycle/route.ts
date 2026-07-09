import { NextRequest, NextResponse, after } from "next/server";
import { processRenewals } from "@/lib/subscriptionLifecycle";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: daily at 05:00 UTC. Fire-and-forget so response returns immediately
// (under cron-job.org's 30s timeout) while renewal processing continues in
// the background up to maxDuration.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await processRenewals();
      console.log("[cron] subscriptions-lifecycle complete:", result);
    } catch (err: any) {
      console.error("[cron] subscriptions-lifecycle error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
