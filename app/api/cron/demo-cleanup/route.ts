import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prewarmSandboxes, sweepExpiredSandboxes } from "@/lib/demoSandbox";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: every 10 minutes.
 *
 * Most visitors close the tab instead of pressing "End demo", so nothing else
 * ever cleans those sandboxes up. This is the sweep that actually keeps the
 * database from filling with abandoned demo companies.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { swept, failed } = await sweepExpiredSandboxes(50);

  // Bookings whose sandbox is gone should not stay ACTIVE forever, or their
  // slot never frees up.
  let bookingsClosed = 0;
  try {
    const result = await (prisma as any).demoBooking.updateMany({
      where: {
        status: { in: ["PENDING", "ACTIVE"] },
        slotEnd: { lt: new Date(Date.now() - 10 * 60_000) },
      },
      data: { status: "EXPIRED", cleanedUp: true, endedAt: new Date() },
    });
    bookingsClosed = result?.count ?? 0;
  } catch {
    // DemoBooking is optional in older deployments — sweeping sandboxes is the
    // part that matters.
  }

  // Rebuild the shelf of ready-to-claim sandboxes so the next visitor walks
  // straight in instead of waiting on a seed.
  const prewarm = await prewarmSandboxes().catch(() => ({ built: 0, failed: 0 }));

  const [remaining, idle] = await Promise.all([
    prisma.company.count({ where: { isDemo: true } }),
    prisma.company.count({ where: { isDemo: true, demoExpiresAt: null } }),
  ]);

  // A shelf that refuses to fill is reported as a number and nothing else, so
  // the one person who could fix it is left reading "failed: 16". The reasons
  // are logged now (see recordDemoFailure) and this endpoint already sits
  // behind CRON_SECRET, so it is the right place to hand them back.
  const failures =
    prewarm.failed > 0
      ? (
          await prisma.activityLog.findMany({
            where: { action: "DEMO_SANDBOX_FAILED" },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { details: true },
          })
        ).map((row) => row.details)
      : [];

  return NextResponse.json({ swept, failed, bookingsClosed, prewarm, failures, remaining, idle });
}
