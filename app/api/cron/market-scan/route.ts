import { NextRequest, NextResponse, after } from "next/server";
import { scanAndStore, TARGET_SUBREDDITS, SUBREDDIT_GROUPS } from "@/lib/prospecting/marketScanner";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Cron: split across three schedules, not one daily run.
 *
 * All ten subreddits in a single pass reliably hits Reddit's per-IP rate
 * limit partway through — confirmed by hand, the run finishes but several
 * subreddits come back 429 and are silently skipped for that day. Three
 * smaller groups, each on its own schedule a few hours apart, keeps every
 * request under that limit and covers more subreddits per day overall than
 * one large burst does.
 *
 * URL:      https://<host>/api/cron/market-scan?group=1
 *           https://<host>/api/cron/market-scan?group=2
 *           https://<host>/api/cron/market-scan?group=3
 * Schedule: three separate cron-job.org jobs, a few hours apart
 *           (e.g. 07:00, 13:00, 19:00) — one group id each.
 * Header:   Authorization: Bearer <CRON_SECRET>
 *
 * `?group=` omitted (or unrecognised) runs all ten, same as before — used by
 * the admin "Run scan now" button, where a single on-demand click hitting a
 * few 429s is an acceptable trade for not having to pick a group.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = req.nextUrl.searchParams.get("group");
  const subreddits = (group && SUBREDDIT_GROUPS[group]) || TARGET_SUBREDDITS;

  after(async () => {
    try {
      const result = await scanAndStore(subreddits);
      console.log(
        `[cron] market-scan${group ? ` (group ${group})` : ""}: scanned=${result.scanned} found=${result.found} stored=${result.stored}`,
      );
    } catch (err) {
      console.error("[cron] market-scan error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true, group: group || "all", subreddits });
}
