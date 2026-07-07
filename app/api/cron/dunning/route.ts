import { NextRequest, NextResponse } from "next/server";
import { processDunningQueue } from "@/lib/dunning";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel cron: daily at 09:00 UTC
// Replaces: /api/billing/dunning?action=process
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDunningQueue();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[cron] dunning error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
