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

    const period = req.nextUrl.searchParams.get("period") || "year";
    const { start, end } = periodRange(period);

    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
      include: {
        supplier: { select: { id: true, name: true } },
        po: { select: { date: true } },
        items: { select: { qty: true, rate: true, amount: true } },
      },
    });

    const map = new Map<string, {
      name: string;
      totalOrders: number;
      totalPurchased: number;
      onTimeCount: number;
      leadDaysTotal: number;
    }>();

    for (const inv of purchaseInvoices) {
      const sid = inv.supplierId;
      if (!map.has(sid)) map.set(sid, { name: inv.supplier.name, totalOrders: 0, totalPurchased: 0, onTimeCount: 0, leadDaysTotal: 0 });
      const rec = map.get(sid)!;
      rec.totalOrders += 1;
      rec.totalPurchased += inv.total;

      // Lead time = days from PO date to invoice date
      if (inv.po?.date) {
        const leadDays = Math.max(0, Math.floor((inv.date.getTime() - inv.po.date.getTime()) / (1000 * 60 * 60 * 24)));
        rec.leadDaysTotal += leadDays;
        if (leadDays <= 7) rec.onTimeCount += 1;
      } else {
        rec.onTimeCount += 1;
      }
    }

    const rows = [...map.entries()]
      .map(([id, r]) => {
        const onTimePct = r.totalOrders > 0 ? (r.onTimeCount / r.totalOrders) * 100 : 0;
        const avgLeadDays = r.totalOrders > 0 ? r.leadDaysTotal / r.totalOrders : 0;
        const rating = onTimePct >= 90 ? 5 : onTimePct >= 70 ? 4 : onTimePct >= 50 ? 3 : onTimePct >= 30 ? 2 : 1;
        return {
          id,
          supplierName: r.name,
          totalOrders: r.totalOrders,
          onTimeDelivery: r.onTimeCount,
          onTimePct,
          qualityRejectCount: 0,
          rejectRatePct: 0,
          avgLeadDays,
          totalPurchased: r.totalPurchased,
          rating,
        };
      })
      .sort((a, b) => b.totalPurchased - a.totalPurchased);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("SUPPLIER PERFORMANCE ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
