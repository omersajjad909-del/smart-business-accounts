import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";

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

    const branchClause = branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty;
    const salesBucket =
      groupBy === "day"
        ? Prisma.sql`TO_CHAR(DATE_TRUNC('day', "date"), 'YYYY-MM-DD')`
        : groupBy === "month"
          ? Prisma.sql`TO_CHAR(DATE_TRUNC('month', "date"), 'YYYY-MM')`
          : Prisma.sql`TO_CHAR(DATE_TRUNC('year', "date"), 'YYYY')`;
    const purchaseBucket = salesBucket;

    const [
      salesTrend,
      purchasesTrend,
      topCustomers,
      topItems,
    ] = await Promise.all([
      prisma.$queryRaw<{ label: string; value: number }[]>`
        SELECT ${salesBucket} AS label,
               COALESCE(SUM("total"), 0)::float AS value
        FROM "SalesInvoice"
        WHERE "companyId" = ${companyId}
          AND "deletedAt" IS NULL
          AND "date" >= ${startDate}
          ${branchClause}
        GROUP BY label
        ORDER BY label ASC
      `,
      prisma.$queryRaw<{ label: string; value: number }[]>`
        SELECT ${purchaseBucket} AS label,
               COALESCE(SUM("total"), 0)::float AS value
        FROM "PurchaseInvoice"
        WHERE "companyId" = ${companyId}
          AND "deletedAt" IS NULL
          AND "date" >= ${startDate}
          ${branchClause}
        GROUP BY label
        ORDER BY label ASC
      `,
      prisma.salesInvoice.groupBy({
        by: ["customerId"],
        where: whereClause,
        _sum: { total: true },
        orderBy: { _sum: { total: "desc" } },
        take: 5,
      }),
      prisma.salesInvoiceItem.groupBy({
        by: ["itemId"],
        where: { invoice: whereClause },
        _sum: { qty: true, amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
    ]);

    const [customers, items] = await Promise.all([
      prisma.account.findMany({
        where: { id: { in: (topCustomers as TopCustomer[]).map((item) => item.customerId) }, companyId },
        select: { id: true, name: true },
      }),
      prisma.itemNew.findMany({
        where: { id: { in: topItems.map((item) => item.itemId) }, companyId },
        select: { id: true, name: true },
      }),
    ]);

    const customerNameMap = new Map(customers.map((customer) => [customer.id, customer.name]));
    const itemNameMap = new Map(items.map((item) => [item.id, item.name]));

    return NextResponse.json({
      salesTrend,
      purchasesTrend,
      topCustomers: (topCustomers as TopCustomer[]).map((item) => ({
        name: customerNameMap.get(item.customerId) || "Unknown",
        total: Number(item._sum.total || 0),
      })),
      topItems: topItems.map((item) => ({
        name: itemNameMap.get(item.itemId) || "Unknown",
        qty: Number(item._sum.qty || 0),
        amount: Number(item._sum.amount || 0),
      })),
    });
  } catch (e: any) {
    console.error("❌ DASHBOARD CHARTS ERROR:", e);
    return NextResponse.json({ error: e.message || "Charts data failed" }, { status: 500 });
  }
}
