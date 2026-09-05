import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { scanAndStore } from "@/lib/prospecting/marketScanner";

export const runtime = "nodejs";
export const maxDuration = 180;

const db = prisma as any;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const tier = req.nextUrl.searchParams.get("tier");
  const status = req.nextUrl.searchParams.get("status");

  const signals = await db.marketSignal.findMany({
    where: {
      ...(tier ? { tier } : {}),
      ...(status ? { status } : { status: { not: "ignored" } }),
    },
    orderBy: [{ tier: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const counts = await db.marketSignal.groupBy({
    by: ["tier", "status"],
    _count: true,
  });

  return NextResponse.json({ signals, counts });
}

/**
 * Manually trigger a scan — the cron does this daily, this is for "run it now".
 *
 * A full pass over ten subreddits, each paced to stay under Reddit's per-IP
 * rate limit, runs 2-3 minutes — longer than a browser request or the
 * platform's proxy will wait for a response (a synchronous version of this
 * handler 504'd in practice). So this returns immediately and finishes the
 * scan in the background, same as the cron route; the admin page tells the
 * operator to check back rather than blocking on a spinner that would time out.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  after(async () => {
    try {
      const result = await scanAndStore();
      await logAdminAction({
        adminId: admin.id,
        adminEmail: admin.email,
        action: "MARKET_SCAN_RUN",
        targetType: "MarketSignal",
        details: result,
      });
      console.log(`[admin] market-scan: scanned=${result.scanned} found=${result.found} stored=${result.stored}`);
    } catch (error) {
      console.error("[admin] market-scan error:", error);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}

/** Marks a signal reviewed/replied/ignored — the human decision this table exists for. */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const { id, status } = body as { id?: string; status?: string };

  if (!id || !["new", "reviewed", "replied", "ignored"].includes(status || "")) {
    return NextResponse.json({ error: "id and a valid status are required." }, { status: 400 });
  }

  const signal = await db.marketSignal.update({ where: { id }, data: { status } });
  await logAdminAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "MARKET_SIGNAL_STATUS",
    targetType: "MarketSignal",
    targetId: id,
    details: { status },
  });
  return NextResponse.json({ ok: true, signal });
}
