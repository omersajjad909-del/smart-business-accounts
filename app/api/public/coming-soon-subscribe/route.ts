/**
 * POST /api/public/coming-soon-subscribe
 * Save a "notify me when live" entry for a Coming Soon marketing page
 * (careers, affiliate — see lib/comingSoonWaitlist.ts). Public — no auth.
 *
 * GET /api/public/coming-soon-subscribe?email=x&list=careers
 * Check whether an email is already on a given list.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMING_SOON_LISTS } from "@/lib/comingSoonWaitlist";

export const runtime = "nodejs";
const prismaAny = prisma as any;

export async function POST(req: NextRequest) {
  try {
    const { email, name, list } = await req.json() as { email?: string; name?: string; list?: string };

    if (!email || !list) {
      return NextResponse.json({ error: "email and list are required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (!COMING_SOON_LISTS[list]) {
      return NextResponse.json({ error: "Unknown list" }, { status: 400 });
    }

    const waitlist = prismaAny.businessWaitlist;
    if (!waitlist) {
      return NextResponse.json({ success: true, message: "Thanks — you're noted, we'll be in touch." });
    }

    await waitlist.upsert({
      where: { email_businessType: { email: email.toLowerCase().trim(), businessType: list } },
      update: {}, // already on the list — no change
      create: {
        email: email.toLowerCase().trim(),
        businessType: list,
        name: name?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `You're on the list! We'll email you when ${COMING_SOON_LISTS[list].label.toLowerCase()} is live.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.toLowerCase().trim();
    const list = searchParams.get("list");

    if (!email || !list) return NextResponse.json({ subscribed: false });

    const waitlist = prismaAny.businessWaitlist;
    if (!waitlist) return NextResponse.json({ subscribed: false });

    const entry = await waitlist.findUnique({
      where: { email_businessType: { email, businessType: list } },
      select: { id: true },
    });

    return NextResponse.json({ subscribed: !!entry });
  } catch {
    return NextResponse.json({ subscribed: false });
  }
}
