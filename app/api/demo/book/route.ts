import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/demoBookingEmails";

const SLOT_MINUTES = 30;

const ALLOWED_TYPES = new Set([
  "trading",
  "wholesale",
  "distribution",
  "import_company",
  "export_company",
  "travel",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessType, slotStart, name, email, phone, company } = body || {};

    if (!businessType || !ALLOWED_TYPES.has(businessType)) {
      return NextResponse.json({ error: "Invalid or unsupported business type" }, { status: 400 });
    }
    if (!slotStart || !name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Slot, name and email are required" }, { status: 400 });
    }

    const emailNormalized = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const start = new Date(slotStart);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid slot time" }, { status: 400 });
    }
    if (start.getTime() <= Date.now() + 5 * 60000) {
      return NextResponse.json({ error: "Slot must be at least 5 minutes in the future" }, { status: 400 });
    }
    const end = new Date(start.getTime() + SLOT_MINUTES * 60000);

    // Reject if same email already has a pending/active booking
    const existing = await (prisma as any).demoBooking.findFirst({
      where: {
        email: emailNormalized,
        status: { in: ["PENDING", "ACTIVE"] },
        slotEnd: { gt: new Date() },
      },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: "You already have an upcoming demo booking. Please complete or cancel it first.",
          existingBooking: {
            id: existing.id,
            slotStart: existing.slotStart,
            businessType: existing.businessType,
          },
        },
        { status: 409 }
      );
    }

    try {
      const booking = await (prisma as any).demoBooking.create({
        data: {
          businessType,
          slotStart: start,
          slotEnd: end,
          name: String(name).trim(),
          email: emailNormalized,
          phone: phone ? String(phone).trim() : null,
          company: company ? String(company).trim() : null,
        },
        select: {
          id: true,
          accessToken: true,
          slotStart: true,
          slotEnd: true,
          businessType: true,
          name: true,
          email: true,
        },
      });

      // Fire-and-forget confirmation email — don't block the response on it
      sendBookingConfirmation({
        id: booking.id,
        name: booking.name,
        email: booking.email,
        businessType: booking.businessType,
        slotStart: new Date(booking.slotStart),
        slotEnd: new Date(booking.slotEnd),
        accessToken: booking.accessToken,
      }).catch(err => {
        console.error("Booking confirmation email failed:", err?.message || err);
      });

      return NextResponse.json({ booking });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return NextResponse.json(
          { error: "This slot has just been taken. Please pick a different one." },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Booking failed" }, { status: 500 });
  }
}
