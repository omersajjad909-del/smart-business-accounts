import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET() {
  try {
    // 1. کل سیلز (Sales)
    const sales = await prisma.salesInvoice.aggregate({
      _sum: { total: true },
    });

    // 2. کل خریداری (Purchases)
    const purchases = await prisma.purchaseInvoice.aggregate({
      _sum: { total: true },
    });

    // 3. ایکٹو کسٹمرز کی تعداد
    const customersCount = await prisma.account.count({
      where: { partyType: "CUSTOMER" },
    });

    const totalSales = Number(sales._sum.total || 0);
    const totalPurchases = Number(purchases._sum.total || 0);

    return NextResponse.json({
      sales: totalSales,
      purchases: totalPurchases,
      profit: totalSales - totalPurchases, // سادہ منافع کا فارمولا
      customers: customersCount,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}