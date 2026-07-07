import { NextRequest, NextResponse } from "next/server";
import { processRenewals } from "@/lib/subscriptionLifecycle";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel cron: daily at 05:00 UTC
// Replaces: /api/subscriptions/lifecycle?action=process
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processRenewals();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[cron] subscriptions-lifecycle error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
