import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { destroyDemoSandbox } from "@/lib/demoSandbox";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Ends a demo session and wipes its sandbox.
 *
 * Accepts either a bookingId (scheduled demo) or falls back to the companyId in
 * the finova_demo cookie (instant demo). destroyDemoSandbox refuses to delete
 * anything that is not flagged isDemo, so a forged id cannot reach real data.
 */
async function endByBooking(bookingId: string) {
  const booking = await (prisma as any).demoBooking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, reason: "not-found" };
  if (booking.cleanedUp) return { ok: true, alreadyCleaned: true };

  if (booking.demoCompanyId) await destroyDemoSandbox(booking.demoCompanyId);

  await (prisma as any).demoBooking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED", endedAt: new Date(), cleanedUp: true },
  });
  return { ok: true };
}

function clearCookies(res: NextResponse) {
  res.cookies.delete("sb_auth");
  res.cookies.delete("finova_demo");
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const bookingId = String(body?.bookingId || "").trim();

    if (bookingId) {
      return clearCookies(NextResponse.json(await endByBooking(bookingId)));
    }

    // Instant demo — the cookie carries the sandbox company directly.
    const cookie = req.cookies.get("finova_demo")?.value;
    if (cookie) {
      try {
        const parsed = JSON.parse(cookie);
        if (parsed?.bookingId) {
          return clearCookies(NextResponse.json(await endByBooking(parsed.bookingId)));
        }
        if (parsed?.companyId) {
          const ok = await destroyDemoSandbox(String(parsed.companyId));
          return clearCookies(NextResponse.json({ ok }));
        }
      } catch {
        // Malformed cookie — still clear it below.
      }
    }

    return clearCookies(NextResponse.json({ ok: false, reason: "no-session" }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "End failed" }, { status: 500 });
  }
}
