import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    // 1. کل سیلز (Sales)
    const sales = await prisma.salesInvoice.aggregate({
      where: { companyId },
      _sum: { total: true },
    });

    // 2. کل خریداری (Purchases)
    const purchases = await prisma.purchaseInvoice.aggregate({
      where: { companyId },
      _sum: { total: true },
    });

    // 3. ایکٹو کسٹمرز کی تعداد
    const customersCount = await prisma.account.count({
      where: { partyType: "CUSTOMER", companyId },
    });

    const totalSales = Number(sales._sum.total || 0);
    const totalPurchases = Number(purchases._sum.total || 0);

    return NextResponse.json({
      sales: totalSales,
      purchases: totalPurchases,
      profit: totalSales - totalPurchases, // سادہ منافع کا فارمولا
      customers: customersCount,
    });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

