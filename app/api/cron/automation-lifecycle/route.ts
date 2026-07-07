import { NextRequest, NextResponse } from "next/server";
import { processLifecycleQueue } from "@/lib/customerLifecycle";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel cron: daily at 07:00 UTC
// Replaces: /api/automation/lifecycle?action=process
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processLifecycleQueue();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[cron] automation-lifecycle error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
