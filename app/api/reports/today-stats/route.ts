import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const branchId = await resolveBranchId(req, companyId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const branchClause = branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty;

    // Today's sales amount (currency-aware)
    const [salesRow] = await prisma.$queryRaw<[{ total: number; count: bigint }]>`
      SELECT
        COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total,
        COUNT(si."id") AS count
      FROM "SalesInvoice" si
      LEFT JOIN "CurrencyTransaction" ct
        ON ct."transactionId" = si."id" AND ct."transactionType" = 'INVOICE'
      WHERE si."companyId" = ${companyId}
        AND si."deletedAt" IS NULL
        AND si."date" >= ${todayStart}
        AND si."date" <  ${todayEnd}
        ${branchClause}
    `;

    // Pending / overdue invoices count (all time)
    const overdueRows = await prisma.$queryRaw<{ date: Date; creditDays: number | null }[]>`
      SELECT si."date", a."creditDays"
      FROM "SalesInvoice" si
      LEFT JOIN "Account" a ON a."id" = si."customerId"
      WHERE si."companyId" = ${companyId}
        AND si."deletedAt" IS NULL
        ${branchClause}
    `;
    let pendingCount = 0;
    overdueRows.forEach(inv => {
      const credit = inv.creditDays ?? 30;
      const due = new Date(inv.date);
      due.setDate(due.getDate() + credit);
      if (due < now) pendingCount++;
    });

    // Low stock items: current qty < minStock (and minStock > 0)
    const items = await prisma.itemNew.findMany({
      where: { companyId, deletedAt: null, minStock: { gt: 0 } },
      select: { id: true, minStock: true },
    });

    let lowStockCount = 0;
    if (items.length > 0) {
      const stockAgg = await prisma.inventoryTxn.groupBy({
        by: ["itemId"],
        where: { companyId, itemId: { in: items.map(i => i.id) } },
        _sum: { qty: true },
      });
      // qty in InventoryTxn: PURCHASE/SALE_RETURN are positive, SALE is negative
      // (stored as signed already — SALE txns have negative qty)
      const qtyMap = new Map(stockAgg.map(r => [r.itemId, Number(r._sum.qty ?? 0)]));
      for (const item of items) {
        const currentQty = qtyMap.get(item.id) ?? 0;
        if (currentQty < item.minStock) lowStockCount++;
      }
    }

    return NextResponse.json({
      todaySales:   Number(salesRow.total  || 0),
      todayOrders:  Number(salesRow.count  || 0),
      pendingCount,
      lowStockCount,
    });
  } catch (e: any) {
    console.error("TODAY STATS ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
