import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BUSINESS_HOURS_START = 9;
const BUSINESS_HOURS_END = 18;
const SLOT_MINUTES = 30;

function buildSlots(dateStr: string): { start: Date; end: Date; label: string }[] {
  const [y, m, d] = dateStr.split("-").map(Number);
  const slots: { start: Date; end: Date; label: string }[] = [];
  for (let hour = BUSINESS_HOURS_START; hour < BUSINESS_HOURS_END; hour++) {
    for (let mins = 0; mins < 60; mins += SLOT_MINUTES) {
      const start = new Date(y, m - 1, d, hour, mins, 0, 0);
      const end = new Date(start.getTime() + SLOT_MINUTES * 60000);
      const pad = (n: number) => n.toString().padStart(2, "0");
      const label = `${pad(hour)}:${pad(mins)} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
      slots.push({ start, end, label });
    }
  }
  return slots;
}

export async function GET(req: NextRequest) {
  const businessType = req.nextUrl.searchParams.get("businessType");
  const dateStr = req.nextUrl.searchParams.get("date");

  if (!businessType || !dateStr) {
    return NextResponse.json({ error: "businessType and date required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const slots = buildSlots(dateStr);
  const dayStart = new Date(slots[0].start);
  const dayEnd = new Date(slots[slots.length - 1].end);

  const booked = await (prisma as any).demoBooking.findMany({
    where: {
      businessType,
      slotStart: { gte: dayStart, lt: dayEnd },
      status: { in: ["PENDING", "ACTIVE"] },
    },
    select: { slotStart: true },
  });

  const bookedSet = new Set(booked.map((b: any) => new Date(b.slotStart).getTime()));
  const now = Date.now();

  const result = slots.map(s => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    label: s.label,
    available: !bookedSet.has(s.start.getTime()) && s.start.getTime() > now + 5 * 60000,
  }));

  return NextResponse.json({ slots: result });
}
