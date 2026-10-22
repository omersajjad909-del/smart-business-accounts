import { NextRequest, NextResponse, after } from "next/server";
import { sendFounderBrief } from "@/lib/founderBrief";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: safe to call more than once a day — sendFounderBrief only sends once
// per Asia/Karachi local day (tracked via ActivityLog), so a retried or
// duplicate tick is a no-op.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const r = await sendFounderBrief();
      console.log(`[cron] founder-brief: ${r.skipped ? `skipped (${r.skipped})` : r.ok ? "sent" : `failed (${r.error})`}`);
    } catch (err) {
      console.error("[cron] founder-brief error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
