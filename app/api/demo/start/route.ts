import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDemoSandbox, isDemoBusinessType } from "@/lib/demoSandbox";

export const runtime = "nodejs";
export const maxDuration = 60;

const GRACE_MINUTES_BEFORE = 5;
const GRACE_MINUTES_AFTER = 5;

/**
 * Starts a *booked* demo from its access token.
 *
 * Same sandbox as the instant demo — a private company seeded with the golden
 * dataset — but the session is capped at the end of the booked slot.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const accessToken = String(body?.accessToken || "").trim();
    if (!accessToken) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 });
    }

    const booking = await (prisma as any).demoBooking.findUnique({ where: { accessToken } });
    if (!booking) {
      return NextResponse.json({ error: "Invalid booking token" }, { status: 404 });
    }
    if (booking.status === "COMPLETED" || booking.status === "EXPIRED") {
      return NextResponse.json({ error: "This demo booking has already ended" }, { status: 410 });
    }

    const now = Date.now();
    const slotStartMs = new Date(booking.slotStart).getTime();
    const slotEndMs = new Date(booking.slotEnd).getTime();

    if (now < slotStartMs - GRACE_MINUTES_BEFORE * 60000) {
      return NextResponse.json(
        {
          error: "Your demo has not started yet",
          slotStart: booking.slotStart,
          startsInSeconds: Math.round((slotStartMs - now) / 1000),
        },
        { status: 425 },
      );
    }
    if (now > slotEndMs + GRACE_MINUTES_AFTER * 60000) {
      await (prisma as any).demoBooking.update({
        where: { id: booking.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "Your demo slot has expired" }, { status: 410 });
    }

    // Rejoining an in-progress booking must land back in the same sandbox,
    // otherwise a refresh would silently throw away everything they entered.
    if (booking.demoCompanyId) {
      const existing = await prisma.company.findUnique({
        where: { id: booking.demoCompanyId },
        select: { id: true, isDemo: true },
      });
      if (existing?.isDemo) {
        return NextResponse.json(
          { error: "This demo is already running in another tab. Close it and try again." },
          { status: 409 },
        );
      }
    }

    const businessType = booking.businessType === "export_company" ? "import_company" : booking.businessType;
    if (!isDemoBusinessType(businessType)) {
      return NextResponse.json({ error: "This business demo is not available yet" }, { status: 400 });
    }

    const minutes = Math.max(5, Math.round((slotEndMs - now) / 60000));
    const sandbox = await createDemoSandbox(businessType, { minutes });
    const endsAt = sandbox.expiresAt.getTime();

    await (prisma as any).demoBooking.update({
      where: { id: booking.id },
      data: {
        status: "ACTIVE",
        startedAt: booking.startedAt || new Date(),
        demoCompanyId: sandbox.companyId,
      },
    });

    const maxAge = Math.max(60, Math.round((endsAt - now) / 1000));
    const res = NextResponse.json({
      success: true,
      companyId: sandbox.companyId,
      businessType: sandbox.businessType,
      sessionEndsAt: endsAt,
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    const cookieOpts = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge,
    };
    res.cookies.set("sb_auth", sandbox.token, { ...cookieOpts, httpOnly: true });
    res.cookies.set(
      "finova_demo",
      JSON.stringify({ bookingId: booking.id, companyId: sandbox.companyId, endsAt }),
      { ...cookieOpts, httpOnly: false },
    );

    return res;
  } catch (e: any) {
    console.error("DEMO START ERROR:", e);
    return NextResponse.json({ error: e?.message || "Failed to start demo" }, { status: 500 });
  }
}
