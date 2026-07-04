import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingReminder } from "@/lib/demoBookingEmails";

// Runs periodically. Finds PENDING bookings whose slot starts in the next
// ~30 minutes and hasn't yet had a reminder email sent, and sends one.
export async function GET(req: NextRequest) {
  // Simple shared-secret auth for Vercel Cron (or manual triggers).
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  const providedSecret = authHeader.replace(/^Bearer\s+/i, "").trim()
    || req.nextUrl.searchParams.get("secret")
    || "";
  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vercel Hobby allows only daily crons. This runs at 08:00 each day and
  // catches all bookings scheduled for the rest of today (from now until end
  // of day) that haven't received a reminder yet.
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const dueBookings = await (prisma as any).demoBooking.findMany({
    where: {
      status: "PENDING",
      slotStart: { gte: now, lte: endOfDay },
      reminderSentAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      businessType: true,
      slotStart: true,
      slotEnd: true,
      accessToken: true,
    },
    take: 100,
  });

  let sent = 0;
  const failures: Array<{ id: string; error: string }> = [];
  for (const b of dueBookings) {
    try {
      const result = await sendBookingReminder({
        name: b.name,
        email: b.email,
        businessType: b.businessType,
        slotStart: new Date(b.slotStart),
        slotEnd: new Date(b.slotEnd),
        accessToken: b.accessToken,
      });

      if (result?.success !== false) {
        await (prisma as any).demoBooking.update({
          where: { id: b.id },
          data: { reminderSentAt: new Date() },
        });
        sent++;
      } else {
        failures.push({ id: b.id, error: result?.error || "unknown" });
      }
    } catch (err: any) {
      failures.push({ id: b.id, error: err?.message || String(err) });
    }
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    candidates: dueBookings.length,
    sent,
    failures,
  });
}
