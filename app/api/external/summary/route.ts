/**
 * GET /api/external/summary            — financial snapshot (P&L + key metrics)
 *
 * Auth: x-api-key or Authorization: Bearer <key>
 *
 * Query params:
 *   from    YYYY-MM-DD   (default: start of current month)
 *   to      YYYY-MM-DD   (default: today)
 *
 * Returns:
 *   revenue, expenses, grossProfit, overdueReceivables,
 *   totalInvoices, unpaidInvoices, lowStockCount, period
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiSession, unauthResponse, enforceApiPlan } from "../_auth";

export async function GET(req: NextRequest) {
  const session = await resolveApiSession(req);
  if (!session) return unauthResponse();

  const blocked = enforceApiPlan(session, "GET");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);

  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : defaultFrom;
  const to   = searchParams.get("to")   ? new Date(searchParams.get("to")!)   : now;

  const cid = session.companyId;
  const dateRange = { date: { gte: from, lte: to } };

  const [salesAgg, purchaseAgg, allInvoices, items, stockAgg] = await Promise.all([
    // Total revenue in period
    prisma.salesInvoice.aggregate({
      where: { companyId: cid, deletedAt: null, ...dateRange },
      _sum: { total: true },
      _count: { _all: true },
    }),

    // Total purchases/expenses in period
    prisma.purchaseInvoice.aggregate({
      where: { companyId: cid, deletedAt: null, ...dateRange },
      _sum: { total: true },
    }),

    // All invoices to calculate overdue
    prisma.salesInvoice.findMany({
      where: { companyId: cid, deletedAt: null },
      select: {
        total: true,
        date: true,
        customer: { select: { creditDays: true } },
      },
    }),

    // Items for low stock check
    prisma.itemNew.findMany({
      where: { companyId: cid, deletedAt: null },
      select: { id: true, minStock: true },
    }),

    // Current stock quantities
    prisma.inventoryTxn.groupBy({
      by: ["itemId"],
      where: { companyId: cid },
      _sum: { qty: true },
    }),
  ]);

  // Overdue receivables
  const qtyMap = new Map<string, number>();
  stockAgg.forEach((r: any) => qtyMap.set(r.itemId, Number(r._sum.qty ?? 0)));

  let overdueAmount = 0;
  let overdueCount  = 0;
  allInvoices.forEach((inv: any) => {
    const creditDays = inv.customer?.creditDays ?? 30;
    const due = new Date(inv.date);
    due.setDate(due.getDate() + creditDays);
    if (due < now) {
      overdueAmount += Number(inv.total ?? 0);
      overdueCount++;
    }
  });

  // Low stock count
  let lowStockCount = 0;
  items.forEach((item: any) => {
    const qty = qtyMap.get(item.id) ?? 0;
    if (qty < Number(item.minStock ?? 0)) lowStockCount++;
  });

  const revenue  = Number(salesAgg._sum.total ?? 0);
  const expenses = Number(purchaseAgg._sum.total ?? 0);

  return NextResponse.json({
    period: {
      from: from.toISOString().slice(0, 10),
      to:   to.toISOString().slice(0, 10),
    },
    revenue,
    expenses,
    grossProfit: revenue - expenses,
    profitMargin: revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 10000) / 100 : 0,
    invoices: {
      total:   salesAgg._count._all,
      overdue: overdueCount,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
    },
    inventory: {
      lowStockCount,
    },
    generatedAt: new Date().toISOString(),
  });
}
