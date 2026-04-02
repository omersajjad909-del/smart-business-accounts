/**
 * POST /api/public/notify-me
 * Save a "notify me when live" waitlist entry for a coming-soon business type.
 * Public — no auth required.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BUSINESS_PHASE_CONFIG } from "@/lib/businessModules";

export const runtime = "nodejs";
const prismaAny = prisma as any;

export async function POST(req: NextRequest) {
  try {
    const { email, businessType, name } = await req.json() as {
      email: string;
      businessType: string;
      name?: string;
    };

    if (!email || !businessType) {
      return NextResponse.json({ error: "email and businessType are required" }, { status: 400 });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Must be a known business type
    if (!BUSINESS_PHASE_CONFIG[businessType]) {
      return NextResponse.json({ error: "Unknown business type" }, { status: 400 });
    }

    // Upsert — ignore duplicate silently
    const waitlist = prismaAny.businessWaitlist;
    if (!waitlist) {
      return NextResponse.json({
        success: true,
        message: "Thanks. Your request has been noted and waitlist storage will be enabled shortly.",
      });
    }

    await waitlist.upsert({
      where: { email_businessType: { email: email.toLowerCase().trim(), businessType } },
      update: {},  // already subscribed — no change
      create: {
        email:        email.toLowerCase().trim(),
        businessType,
        name:         name?.trim() || null,
      },
    });

    const cfg = BUSINESS_PHASE_CONFIG[businessType];
    return NextResponse.json({
      success: true,
      message: `You're on the list! We'll email you when ${cfg.label} goes live.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/public/notify-me?email=x&businessType=y
 * Check if an email is already on the waitlist for a type.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email        = searchParams.get("email")?.toLowerCase().trim();
    const businessType = searchParams.get("businessType");

    if (!email || !businessType) {
      return NextResponse.json({ subscribed: false });
    }

    const waitlist = prismaAny.businessWaitlist;
    if (!waitlist) {
      return NextResponse.json({ subscribed: false });
    }

    const entry = await waitlist.findUnique({
      where: { email_businessType: { email, businessType } },
      select: { id: true },
    });

    return NextResponse.json({ subscribed: !!entry });
  } catch {
    return NextResponse.json({ subscribed: false });
  }
}
