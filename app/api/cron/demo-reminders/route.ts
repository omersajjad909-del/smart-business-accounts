import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingReminder } from "@/lib/demoBookingEmails";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron: daily at 08:00 UTC. Fire-and-forget: response returns immediately
// while booking reminder emails are sent in background.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  const providedSecret = authHeader.replace(/^Bearer\s+/i, "").trim()
    || req.nextUrl.searchParams.get("secret")
    || "";
  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
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

      console.log(`[cron] demo-reminders complete: ${dueBookings.length} candidates, ${sent} sent, ${failures.length} failed`);
    } catch (err: any) {
      console.error("[cron] demo-reminders error:", err);
    }
  });

  return NextResponse.json({ ok: true, started: true });
}
