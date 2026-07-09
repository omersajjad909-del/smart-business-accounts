import { NextRequest, NextResponse, after } from "next/server";
import { autoTriggerEnrollments } from "@/lib/customerLifecycle";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: daily at 08:00 UTC. Fire-and-forget: response returns immediately
// while enrollment trigger processing continues in background.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await autoTriggerEnrollments();
      console.log("[cron] automation-lifecycle-trigger complete:", result);
    } catch (err: any) {
      console.error("[cron] automation-lifecycle-trigger error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
