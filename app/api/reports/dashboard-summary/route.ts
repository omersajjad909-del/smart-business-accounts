import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const [salesAgg, purchaseAgg, customers] = await Promise.all([
      prisma.salesInvoice.aggregate({
        where: { companyId, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.purchaseInvoice.aggregate({
        where: { companyId, deletedAt: null },
        _sum: { total: true },
      }),
      prisma.account.count({
        where: { companyId, deletedAt: null },
      }),
    ]);

    const totalSales = Number(salesAgg._sum.total || 0);
    const totalPurchases = Number(purchaseAgg._sum.total || 0);

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null },
      select: {
        total: true,
        date: true,
        customer: { select: { creditDays: true } },
      },
    });

    const now = new Date();
    let overdueReceivables = 0;
    let overdueReceivablesCount = 0;

    invoices.forEach((inv) => {
      const creditDays = inv.customer?.creditDays ?? 30;
      const dueDate = new Date(inv.date);
      dueDate.setDate(dueDate.getDate() + creditDays);
      if (dueDate < now) {
        overdueReceivables += Number(inv.total || 0);
        overdueReceivablesCount += 1;
      }
    });

    const items = await prisma.itemNew.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, minStock: true },
    });

    const stockAgg = await prisma.inventoryTxn.groupBy({
      by: ["itemId"],
      where: { companyId },
      _sum: { qty: true },
    });

    const qtyMap = new Map<string, number>();
    stockAgg.forEach((row) => {
      qtyMap.set(row.itemId, Number(row._sum.qty || 0));
    });

    let lowStockCount = 0;
    items.forEach((item) => {
      const qty = qtyMap.get(item.id) ?? 0;
      if (qty < Number(item.minStock || 0)) {
        lowStockCount += 1;
      }
    });

    return NextResponse.json({
      sales: totalSales,
      purchases: totalPurchases,
      profit: totalSales - totalPurchases,
      customers,
      overdueReceivables: Math.round(overdueReceivables),
      overdueReceivablesCount,
      lowStockCount,
    });
  } catch (e: Any) {
    console.error("DASHBOARD SUMMARY ERROR:", e);
    return NextResponse.json(
      { error: e.message || "Dashboard summary failed" },
      { status: 500 }
    );
  }
}
