import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";

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

    const period = req.nextUrl.searchParams.get("period") || "month";
    const now = new Date();
    let startDate: Date;
    if (period === "quarter") {
      const q = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), q * 3, 1);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const periodMs = now.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodMs);
    const branchFilter = branchId ? { branchId } : {};

    // Core KPIs — run in parallel
    const [revenueAgg, expensesAgg, prevRevenueAgg, receivablesAgg, payablesAgg, bankAgg] =
      await Promise.all([
        prisma.salesInvoice.aggregate({
          where: { companyId, deletedAt: null, ...branchFilter, date: { gte: startDate, lte: now } },
          _sum: { total: true },
        }),
        prisma.purchaseInvoice.aggregate({
          where: { companyId, deletedAt: null, ...branchFilter, date: { gte: startDate, lte: now } },
          _sum: { total: true },
        }),
        prisma.salesInvoice.aggregate({
          where: { companyId, deletedAt: null, ...branchFilter, date: { gte: prevStart, lt: startDate } },
          _sum: { total: true },
        }),
        prisma.salesInvoice.aggregate({
          where: { companyId, deletedAt: null, ...branchFilter },
          _sum: { total: true },
        }),
        prisma.purchaseInvoice.aggregate({
          where: { companyId, deletedAt: null, ...branchFilter },
          _sum: { total: true },
        }),
        prisma.bankAccount.aggregate({
          where: { companyId },
          _sum: { balance: true },
        }),
      ]);

    const revenue = Number(revenueAgg._sum.total || 0);
    const expenses = Number(expensesAgg._sum.total || 0);
    const prevRevenue = Number(prevRevenueAgg._sum.total || 0);
    const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const receivables = Number(receivablesAgg._sum.total || 0);
    const payables = Number(payablesAgg._sum.total || 0);
    const cashBalance = Number(bankAgg._sum.balance || 0);

    // Overdue invoices (creditDays-based)
    const allInvoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, ...branchFilter },
      select: { total: true, date: true, customer: { select: { creditDays: true } } },
    });
    let overdueAmount = 0;
    let invoicesPending = 0;
    allInvoices.forEach((inv) => {
      const creditDays = inv.customer?.creditDays ?? 30;
      const dueDate = new Date(inv.date);
      dueDate.setDate(dueDate.getDate() + creditDays);
      if (dueDate < now) {
        overdueAmount += Number(inv.total || 0);
        invoicesPending++;
      }
    });

    // Monthly sparkline — last 12 months
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const [monthlySales, monthlyExp] = await Promise.all([
      prisma.$queryRaw<{ month: Date; total: number }[]>`
        SELECT DATE_TRUNC('month', date) AS month, SUM(total)::float AS total
        FROM "SalesInvoice"
        WHERE "companyId" = ${companyId}
          AND "deletedAt" IS NULL
          AND date >= ${twelveMonthsAgo}
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month ASC
      `,
      prisma.$queryRaw<{ month: Date; total: number }[]>`
        SELECT DATE_TRUNC('month', date) AS month, SUM(total)::float AS total
        FROM "PurchaseInvoice"
        WHERE "companyId" = ${companyId}
          AND "deletedAt" IS NULL
          AND date >= ${twelveMonthsAgo}
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month ASC
      `,
    ]);

    const revenueHistory: number[] = [];
    const expensesHistory: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${m.getFullYear()}-${m.getMonth()}`;
      const sr = monthlySales.find((r) => {
        const d = new Date(r.month);
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      });
      const er = monthlyExp.find((r) => {
        const d = new Date(r.month);
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      });
      revenueHistory.push(Number(sr?.total || 0));
      expensesHistory.push(Number(er?.total || 0));
    }

    // Top customers by revenue in period
    const topCustomerGroups = await prisma.salesInvoice.groupBy({
      by: ["customerId"],
      where: { companyId, deletedAt: null, ...branchFilter, date: { gte: startDate } },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    });
    const customerAccounts = await prisma.account.findMany({
      where: { id: { in: topCustomerGroups.map((r) => r.customerId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(customerAccounts.map((c) => [c.id, c.name]));
    const topCustomers = topCustomerGroups.map((r) => ({
      name: nameMap.get(r.customerId) || "Unknown",
      revenue: Number(r._sum.total || 0),
    }));

    // Recent activity
    const [recentSales, recentPurchases] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: { companyId, deletedAt: null, ...branchFilter },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { invoiceNo: true, total: true, createdAt: true },
      }),
      prisma.purchaseInvoice.findMany({
        where: { companyId, deletedAt: null, ...branchFilter },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { invoiceNo: true, total: true, createdAt: true },
      }),
    ]);
    const recentActivity = [
      ...recentSales.map((s) => ({
        type: "invoice",
        description: `Sales Invoice ${s.invoiceNo}`,
        amount: Number(s.total || 0),
        date: s.createdAt.toISOString().slice(0, 10),
      })),
      ...recentPurchases.map((p) => ({
        type: "purchase",
        description: `Purchase Invoice ${p.invoiceNo}`,
        amount: Number(p.total || 0),
        date: p.createdAt.toISOString().slice(0, 10),
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    return NextResponse.json({
      revenue,
      expenses,
      profit: revenue - expenses,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      receivables,
      payables,
      cashBalance,
      overdueAmount: Math.round(overdueAmount),
      invoicesPending,
      revenueHistory,
      expensesHistory,
      topCustomers,
      recentActivity,
    });
  } catch (e: any) {
    console.error("DASHBOARD SUMMARY ERROR:", e);
    return NextResponse.json(
      { error: e.message || "Dashboard summary failed", details: String(e) },
      { status: 500 }
    );
  }
}
