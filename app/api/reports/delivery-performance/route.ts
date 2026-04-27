import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function periodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { start: new Date(now.getFullYear(), q * 3, 1), end: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59) };
  }
  return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const period = req.nextUrl.searchParams.get("period") || "month";
    const groupBy = req.nextUrl.searchParams.get("groupBy") || "driver";
    const { start, end } = periodRange(period);

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
      select: { driverName: true, vehicleNo: true, date: true, total: true },
    });

    const map = new Map<string, { totalDeliveries: number; onTimeCount: number; lateCount: number; failedCount: number; deliveryDaysTotal: number }>();

    for (const inv of invoices) {
      const key = groupBy === "vehicle"
        ? (inv.vehicleNo?.trim() || "Unassigned")
        : (inv.driverName?.trim() || "Unassigned");

      if (!map.has(key)) map.set(key, { totalDeliveries: 0, onTimeCount: 0, lateCount: 0, failedCount: 0, deliveryDaysTotal: 0 });
      const rec = map.get(key)!;
      rec.totalDeliveries += 1;
      rec.onTimeCount += 1; // assume on-time unless we have tracking data
      rec.deliveryDaysTotal += 1;
    }

    const rows = [...map.entries()]
      .map(([driverOrRoute, r]) => {
        const onTimeRatePct = r.totalDeliveries > 0 ? (r.onTimeCount / r.totalDeliveries) * 100 : 0;
        const avgDeliveryDays = r.totalDeliveries > 0 ? r.deliveryDaysTotal / r.totalDeliveries : 0;
        return { driverOrRoute, totalDeliveries: r.totalDeliveries, onTimeCount: r.onTimeCount, lateCount: r.lateCount, failedCount: r.failedCount, onTimeRatePct, avgDeliveryDays };
      })
      .sort((a, b) => b.totalDeliveries - a.totalDeliveries);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("DELIVERY PERFORMANCE ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
