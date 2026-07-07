import { NextRequest, NextResponse } from "next/server";
import { autoTriggerEnrollments } from "@/lib/customerLifecycle";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel cron: daily at 08:00 UTC
// Replaces: /api/automation/lifecycle?action=auto_trigger
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await autoTriggerEnrollments();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[cron] automation-lifecycle-trigger error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
