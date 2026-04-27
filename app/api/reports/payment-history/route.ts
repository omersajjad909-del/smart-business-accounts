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
    const view = req.nextUrl.searchParams.get("view") || "customer";
    const { start, end } = periodRange(period);

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
      include: { customer: { select: { id: true, name: true, creditDays: true } } },
    });

    const receipts = await prisma.paymentReceipt.findMany({
      where: { companyId, deletedAt: null, date: { gte: start, lte: end } },
      select: { partyId: true, amount: true, date: true },
    });

    const paidMap = new Map<string, { total: number; lastDate: Date | null; count: number }>();
    for (const r of receipts) {
      if (!r.partyId) continue;
      if (!paidMap.has(r.partyId)) paidMap.set(r.partyId, { total: 0, lastDate: null, count: 0 });
      const rec = paidMap.get(r.partyId)!;
      rec.total += r.amount;
      rec.count += 1;
      if (!rec.lastDate || r.date > rec.lastDate) rec.lastDate = r.date;
    }

    const invoicedMap = new Map<string, { name: string; totalInvoiced: number; creditDays: number }>();
    for (const inv of invoices) {
      const key = inv.customerId;
      if (!invoicedMap.has(key)) invoicedMap.set(key, { name: inv.customer?.name || "Unknown", totalInvoiced: 0, creditDays: inv.customer?.creditDays || 30 });
      invoicedMap.get(key)!.totalInvoiced += inv.total;
    }

    const rows = [...invoicedMap.entries()]
      .map(([id, r]) => {
        const paid = paidMap.get(id);
        const totalPaid = paid?.total || 0;
        const outstanding = Math.max(0, r.totalInvoiced - totalPaid);
        const avgDaysToPay = r.creditDays;
        const onTimeCount = paid?.count || 0;
        const lateCount = 0;
        return {
          name: r.name,
          totalInvoiced: r.totalInvoiced,
          totalPaid,
          totalOutstanding: outstanding,
          avgDaysToPay,
          onTimeCount,
          lateCount,
          lastPaymentDate: paid?.lastDate || null,
        };
      })
      .sort((a, b) => b.totalInvoiced - a.totalInvoiced);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("PAYMENT HISTORY ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
