import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sweepExpiredSandboxes } from "@/lib/demoSandbox";

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

  const remaining = await prisma.company.count({ where: { isDemo: true } });

  return NextResponse.json({ swept, failed, bookingsClosed, remaining });
}
