import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";

type SalesInvoice = Prisma.SalesInvoiceGetPayload<{ select: { date: true; total: true } }>;
type PurchaseInvoice = Prisma.PurchaseInvoiceGetPayload<{ select: { date: true; total: true } }>;
type TopCustomer = { customerId: string; _sum: { total: number | null } };

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
    const branchId = await resolveBranchId(req, companyId);

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month";

    const now = new Date();
    let startDate: Date;
    let groupBy: "day" | "month" | "year";

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = "day";
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupBy = "day";
        break;
      case "quarter":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        groupBy = "day";
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        groupBy = "month";
        break;
      case "all":
        startDate = new Date(now.getFullYear() - 5, 0, 1);
        groupBy = "month";
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupBy = "day";
    }

    const whereClause = {
      date: { gte: startDate },
      companyId,
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
    };

    const [salesInvoices, purchaseInvoices] = await Promise.all([
      prisma.salesInvoice.findMany({ where: whereClause, select: { date: true, total: true } }),
      prisma.purchaseInvoice.findMany({ where: whereClause, select: { date: true, total: true } }),
    ]);

    function getKey(date: Date): string {
      if (groupBy === "day") return date.toISOString().split("T")[0];
      if (groupBy === "month") return date.toISOString().slice(0, 7);
      return date.getFullYear().toString();
    }

    function groupInvoices(invoices: { date: Date; total: any }[]) {
      const map: Record<string, number> = {};
      invoices.forEach(inv => {
        const key = getKey(inv.date);
        map[key] = (map[key] || 0) + Number(inv.total || 0);
      });
      return map;
    }

    const salesByPeriod = groupInvoices(salesInvoices as SalesInvoice[]);
    const purchasesByPeriod = groupInvoices(purchaseInvoices as PurchaseInvoice[]);

    // Top customers
    const topCustomers = await prisma.salesInvoice.groupBy({
      by: ["customerId"],
      where: whereClause,
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    });

    const customerDetails = await Promise.all(
      (topCustomers as TopCustomer[]).map(async item => {
        const customer = await prisma.account.findFirst({
          where: { id: item.customerId, companyId },
          select: { name: true },
        });
        return { name: customer?.name || "Unknown", total: Number(item._sum.total || 0) };
      })
    );

    // Top items
    const topItems = await prisma.salesInvoiceItem.groupBy({
      by: ["itemId"],
      where: { invoice: whereClause },
      _sum: { qty: true, amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });

    const itemDetails = await Promise.all(
      topItems.map(async (item: any) => {
        const itemData = await prisma.itemNew.findFirst({
          where: { id: item.itemId, companyId },
          select: { name: true },
        });
        return {
          name: itemData?.name || "Unknown",
          qty: Number(item._sum.qty || 0),
          amount: Number(item._sum.amount || 0),
        };
      })
    );

    return NextResponse.json({
      salesTrend: Object.entries(salesByPeriod).map(([label, value]) => ({ label, value })),
      purchasesTrend: Object.entries(purchasesByPeriod).map(([label, value]) => ({ label, value })),
      topCustomers: customerDetails,
      topItems: itemDetails,
    });
  } catch (e: any) {
    console.error("❌ DASHBOARD CHARTS ERROR:", e);
    return NextResponse.json({ error: e.message || "Charts data failed" }, { status: 500 });
  }
}
