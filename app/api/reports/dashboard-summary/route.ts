import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

// Helper: SUM of invoices with currency conversion via CurrencyTransaction
// Uses COALESCE: if a CurrencyTransaction exists → amountInBase; else → total (already base currency)
function buildRevenueSQL(
  table: "SalesInvoice" | "PurchaseInvoice",
  companyId: string,
  branchId: string | null,
  startDate: Date,
  endDate: Date
) {
  const branchClause = branchId
    ? Prisma.sql`AND si."branchId" = ${branchId}`
    : Prisma.empty;

  return prisma.$queryRaw<[{ total: number }]>`
    SELECT COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total
    FROM ${Prisma.raw(`"${table}"`)} si
    LEFT JOIN "CurrencyTransaction" ct
      ON ct."transactionId" = si."id"
      AND ct."transactionType" = 'INVOICE'
    WHERE si."companyId" = ${companyId}
      AND si."deletedAt" IS NULL
      AND si."date" >= ${startDate}
      AND si."date" <= ${endDate}
      ${branchClause}
  `;
}

function buildAllTimeSQL(
  table: "SalesInvoice" | "PurchaseInvoice",
  companyId: string,
  branchId: string | null
) {
  const branchClause = branchId
    ? Prisma.sql`AND si."branchId" = ${branchId}`
    : Prisma.empty;

  return prisma.$queryRaw<[{ total: number }]>`
    SELECT COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total
    FROM ${Prisma.raw(`"${table}"`)} si
    LEFT JOIN "CurrencyTransaction" ct
      ON ct."transactionId" = si."id"
      AND ct."transactionType" = 'INVOICE'
    WHERE si."companyId" = ${companyId}
      AND si."deletedAt" IS NULL
      ${branchClause}
  `;
}

function buildMonthlySQL(
  table: "SalesInvoice" | "PurchaseInvoice",
  companyId: string,
  from: Date
) {
  return prisma.$queryRaw<{ month: Date; total: number }[]>`
    SELECT DATE_TRUNC('month', si."date") AS month,
           COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total
    FROM ${Prisma.raw(`"${table}"`)} si
    LEFT JOIN "CurrencyTransaction" ct
      ON ct."transactionId" = si."id"
      AND ct."transactionType" = 'INVOICE'
    WHERE si."companyId" = ${companyId}
      AND si."deletedAt" IS NULL
      AND si."date" >= ${from}
    GROUP BY DATE_TRUNC('month', si."date")
    ORDER BY month ASC
  `;
}

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
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // All KPI queries run in parallel — currency-aware via LEFT JOIN
    const [
      [revenueRow],
      [expensesRow],
      [prevRevenueRow],
      [receivablesRow],
      [payablesRow],
      bankAgg,
      monthlySales,
      monthlyExp,
    ] = await Promise.all([
      buildRevenueSQL("SalesInvoice",   companyId, branchId, startDate, now),
      buildRevenueSQL("PurchaseInvoice", companyId, branchId, startDate, now),
      buildRevenueSQL("SalesInvoice",   companyId, branchId, prevStart, startDate),
      buildAllTimeSQL("SalesInvoice",   companyId, branchId),
      buildAllTimeSQL("PurchaseInvoice", companyId, branchId),
      prisma.bankAccount.aggregate({ where: { companyId }, _sum: { balance: true } }),
      buildMonthlySQL("SalesInvoice",   companyId, twelveMonthsAgo),
      buildMonthlySQL("PurchaseInvoice", companyId, twelveMonthsAgo),
    ]);

    const revenue     = Number(revenueRow.total     || 0);
    const expenses    = Number(expensesRow.total    || 0);
    const prevRevenue = Number(prevRevenueRow.total || 0);
    const receivables = Number(receivablesRow.total || 0);
    const payables    = Number(payablesRow.total    || 0);
    const cashBalance = Number(bankAgg._sum.balance || 0);
    const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Overdue invoices (creditDays-based) — currency-aware
    const overdueRows = await prisma.$queryRaw<{ total: number; date: Date; creditDays: number | null }[]>`
      SELECT COALESCE(ct."amountInBase", si."total")::float AS total,
             si."date",
             a."creditDays"
      FROM "SalesInvoice" si
      LEFT JOIN "CurrencyTransaction" ct
        ON ct."transactionId" = si."id"
        AND ct."transactionType" = 'INVOICE'
      LEFT JOIN "Account" a ON a."id" = si."customerId"
      WHERE si."companyId" = ${companyId}
        AND si."deletedAt" IS NULL
        ${branchId ? Prisma.sql`AND si."branchId" = ${branchId}` : Prisma.empty}
    `;

    let overdueAmount = 0;
    let invoicesPending = 0;
    overdueRows.forEach((inv) => {
      const creditDays = inv.creditDays ?? 30;
      const dueDate = new Date(inv.date);
      dueDate.setDate(dueDate.getDate() + creditDays);
      if (dueDate < now) {
        overdueAmount += Number(inv.total || 0);
        invoicesPending++;
      }
    });

    // Monthly sparkline — 12-slot arrays
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

    // Top customers by base-currency revenue in period
    const topCustomerRaw = await prisma.$queryRaw<{ customerId: string; total: number }[]>`
      SELECT si."customerId",
             COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total
      FROM "SalesInvoice" si
      LEFT JOIN "CurrencyTransaction" ct
        ON ct."transactionId" = si."id"
        AND ct."transactionType" = 'INVOICE'
      WHERE si."companyId" = ${companyId}
        AND si."deletedAt" IS NULL
        AND si."date" >= ${startDate}
        ${branchId ? Prisma.sql`AND si."branchId" = ${branchId}` : Prisma.empty}
      GROUP BY si."customerId"
      ORDER BY total DESC
      LIMIT 5
    `;
    const customerAccounts = await prisma.account.findMany({
      where: { id: { in: topCustomerRaw.map((r) => r.customerId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(customerAccounts.map((c) => [c.id, c.name]));
    const topCustomers = topCustomerRaw.map((r) => ({
      name: nameMap.get(r.customerId) || "Unknown",
      revenue: Number(r.total || 0),
    }));

    // Recent activity
    const [recentSales, recentPurchases] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: { companyId, deletedAt: null, ...(branchId ? { branchId } : {}) },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, invoiceNo: true, total: true, createdAt: true },
      }),
      prisma.purchaseInvoice.findMany({
        where: { companyId, deletedAt: null, ...(branchId ? { branchId } : {}) },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, invoiceNo: true, total: true, createdAt: true },
      }),
    ]);

    // Fetch currency conversions for recent invoices
    const recentIds = [
      ...recentSales.map((s) => s.id),
      ...recentPurchases.map((p) => p.id),
    ];
    const recentCurrencies = recentIds.length
      ? await prisma.currencyTransaction.findMany({
          where: { transactionId: { in: recentIds }, transactionType: "INVOICE" },
          select: { transactionId: true, amountInBase: true },
        })
      : [];
    const ctMap = new Map(recentCurrencies.map((c) => [c.transactionId, c.amountInBase]));

    const recentActivity = [
      ...recentSales.map((s) => ({
        type: "invoice",
        description: `Sales Invoice ${s.invoiceNo}`,
        amount: Number(ctMap.get(s.id) ?? s.total ?? 0),
        date: s.createdAt.toISOString().slice(0, 10),
      })),
      ...recentPurchases.map((p) => ({
        type: "purchase",
        description: `Purchase Invoice ${p.invoiceNo}`,
        amount: Number(ctMap.get(p.id) ?? p.total ?? 0),
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
