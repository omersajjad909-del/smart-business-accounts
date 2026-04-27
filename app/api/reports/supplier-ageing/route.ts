import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const today = new Date();

    const invoices = await prisma.purchaseInvoice.findMany({
      where: { companyId, deletedAt: null },
      include: { supplier: { select: { id: true, name: true } } },
    });

    // Total payments made to suppliers
    const payments = await prisma.expenseVoucher.findMany({
      where: { companyId, deletedAt: null },
      select: { expenseAccountId: true, totalAmount: true },
    });

    const paidBySupplier = new Map<string, number>();
    for (const p of payments) {
      paidBySupplier.set(p.expenseAccountId, (paidBySupplier.get(p.expenseAccountId) || 0) + p.totalAmount);
    }

    const map = new Map<string, {
      name: string;
      current: number;
      days30: number;
      days60: number;
      days90: number;
      over90: number;
    }>();

    for (const inv of invoices) {
      const sid = inv.supplierId;
      const supplierName = inv.supplier?.name || "Unknown";
      if (!map.has(sid)) map.set(sid, { name: supplierName, current: 0, days30: 0, days60: 0, days90: 0, over90: 0 });

      const daysAgo = Math.floor((today.getTime() - inv.date.getTime()) / (1000 * 60 * 60 * 24));
      const rec = map.get(sid)!;

      if (daysAgo <= 30) rec.current += inv.total;
      else if (daysAgo <= 60) rec.days30 += inv.total;
      else if (daysAgo <= 90) rec.days60 += inv.total;
      else if (daysAgo <= 120) rec.days90 += inv.total;
      else rec.over90 += inv.total;
    }

    const rows = [...map.entries()]
      .map(([id, r]) => {
        const total = r.current + r.days30 + r.days60 + r.days90 + r.over90;
        const paid = paidBySupplier.get(id) || 0;
        const outstanding = Math.max(0, total - paid);
        return {
          supplierName: r.name,
          current: r.current,
          days30: r.days30,
          days60: r.days60,
          days90: r.days90,
          over90: r.over90,
          total: outstanding,
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("SUPPLIER AGEING ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
