import { NextRequest, NextResponse, after } from "next/server";
import { scanAndStore } from "@/lib/prospecting/marketScanner";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Cron: once a day is enough. Pain-signal posts are rare — this is a slow
 * accumulator into MarketSignal, not a real-time feed, and running it more
 * often just spends more of Reddit's per-IP tolerance for the same yield.
 *
 * URL:      https://<host>/api/cron/market-scan
 * Schedule: once daily, e.g. 06:00 UTC
 * Header:   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await scanAndStore();
      console.log(
        `[cron] market-scan: scanned=${result.scanned} found=${result.found} stored=${result.stored}`,
      );
    } catch (err) {
      console.error("[cron] market-scan error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
