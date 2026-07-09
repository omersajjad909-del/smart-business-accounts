import { NextRequest, NextResponse, after } from "next/server";
import { processDunningQueue } from "@/lib/dunning";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: daily at 09:00 UTC. Fire-and-forget so the HTTP response returns
// immediately (well under cron-job.org's 30s timeout) while dunning queue
// processing continues in the background up to maxDuration.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await processDunningQueue();
      console.log("[cron] dunning complete:", result);
    } catch (err: any) {
      console.error("[cron] dunning error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
