import { NextRequest, NextResponse, after } from "next/server";
import { processLifecycleQueue } from "@/lib/customerLifecycle";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: daily at 07:00 UTC. Fire-and-forget: response returns immediately
// while lifecycle queue processing continues in background.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await processLifecycleQueue();
      console.log("[cron] automation-lifecycle complete:", result);
    } catch (err: any) {
      console.error("[cron] automation-lifecycle error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
