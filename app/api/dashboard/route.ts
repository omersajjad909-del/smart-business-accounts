import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { currencyByCountry } from "@/lib/currency";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";

function getPeriodStart(period: string, now = new Date()) {
  if (period === "all") return new Date(2000, 0, 1);
  if (period === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), quarter * 3, 1);
  }
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function revenueSQL(table: "SalesInvoice" | "PurchaseInvoice", companyId: string, branchId: string | null, startDate: Date, endDate: Date) {
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
      ${branchId ? Prisma.sql`AND si."branchId" = ${branchId}` : Prisma.empty}
  `;
}

function allTimeSQL(table: "SalesInvoice" | "PurchaseInvoice", companyId: string, branchId: string | null) {
  return prisma.$queryRaw<[{ total: number }]>`
    SELECT COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total
    FROM ${Prisma.raw(`"${table}"`)} si
    LEFT JOIN "CurrencyTransaction" ct
      ON ct."transactionId" = si."id"
      AND ct."transactionType" = 'INVOICE'
    WHERE si."companyId" = ${companyId}
      AND si."deletedAt" IS NULL
      ${branchId ? Prisma.sql`AND si."branchId" = ${branchId}` : Prisma.empty}
  `;
}

function monthlySQL(table: "SalesInvoice" | "PurchaseInvoice", companyId: string, from: Date, branchId: string | null) {
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
      ${branchId ? Prisma.sql`AND si."branchId" = ${branchId}` : Prisma.empty}
    GROUP BY DATE_TRUNC('month', si."date")
    ORDER BY month ASC
  `;
}

async function getSummary(companyId: string, branchId: string | null, period: string) {
  const now = new Date();
  const startDate = getPeriodStart(period, now);
  const periodMs = now.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - periodMs);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    [revenueRow],
    [expensesRow],
    [prevRevenueRow],
    [prevExpensesRow],
    [receivablesRow],
    [payablesRow],
    bankAgg,
    monthlySales,
    monthlyExp,
    [overdueRow],
    topCustomerRaw,
    recentSales,
    recentPurchases,
  ] = await Promise.all([
    revenueSQL("SalesInvoice", companyId, branchId, startDate, now),
    revenueSQL("PurchaseInvoice", companyId, branchId, startDate, now),
    revenueSQL("SalesInvoice", companyId, branchId, prevStart, startDate),
    revenueSQL("PurchaseInvoice", companyId, branchId, prevStart, startDate),
    allTimeSQL("SalesInvoice", companyId, branchId),
    allTimeSQL("PurchaseInvoice", companyId, branchId),
    prisma.bankAccount.aggregate({ where: { companyId }, _sum: { balance: true } }),
    monthlySQL("SalesInvoice", companyId, twelveMonthsAgo, branchId),
    monthlySQL("PurchaseInvoice", companyId, twelveMonthsAgo, branchId),
    prisma.$queryRaw<{ total: number; count: bigint }[]>`
      SELECT COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total,
             COUNT(si."id") AS count
      FROM "SalesInvoice" si
      LEFT JOIN "CurrencyTransaction" ct
        ON ct."transactionId" = si."id" AND ct."transactionType" = 'INVOICE'
      LEFT JOIN "Account" a ON a."id" = si."customerId"
      WHERE si."companyId" = ${companyId}
        AND si."deletedAt" IS NULL
        AND (si."date" + ((COALESCE(a."creditDays", 30))::text || ' days')::interval) < ${now}
        ${branchId ? Prisma.sql`AND si."branchId" = ${branchId}` : Prisma.empty}
    `,
    prisma.$queryRaw<{ customerId: string; total: number }[]>`
      SELECT si."customerId",
             COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total
      FROM "SalesInvoice" si
      LEFT JOIN "CurrencyTransaction" ct
        ON ct."transactionId" = si."id" AND ct."transactionType" = 'INVOICE'
      WHERE si."companyId" = ${companyId}
        AND si."deletedAt" IS NULL
        AND si."date" >= ${startDate}
        ${branchId ? Prisma.sql`AND si."branchId" = ${branchId}` : Prisma.empty}
      GROUP BY si."customerId"
      ORDER BY total DESC
      LIMIT 5
    `,
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

  const revenue = Number(revenueRow.total || 0);
  const expenses = Number(expensesRow.total || 0);
  const prevRevenue = Number(prevRevenueRow.total || 0);
  const prevExpenses = Number(prevExpensesRow.total || 0);
  const profit = revenue - expenses;
  const prevProfit = prevRevenue - prevExpenses;
  const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : (revenue > 0 ? 100 : 0);
  const expensesGrowth = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : (expenses > 0 ? 100 : 0);
  const profitGrowth = prevProfit !== 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : (profit !== 0 ? 100 : 0);

  const revenueHistory: number[] = [];
  const expensesHistory: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${month.getFullYear()}-${month.getMonth()}`;
    revenueHistory.push(Number(monthlySales.find((row) => {
      const d = new Date(row.month);
      return `${d.getFullYear()}-${d.getMonth()}` === key;
    })?.total || 0));
    expensesHistory.push(Number(monthlyExp.find((row) => {
      const d = new Date(row.month);
      return `${d.getFullYear()}-${d.getMonth()}` === key;
    })?.total || 0));
  }

  const [customerAccounts, recentCurrencies] = await Promise.all([
    prisma.account.findMany({
      where: { id: { in: topCustomerRaw.map((row) => row.customerId) } },
      select: { id: true, name: true },
    }),
    prisma.currencyTransaction.findMany({
      where: {
        transactionId: { in: [...recentSales.map((sale) => sale.id), ...recentPurchases.map((purchase) => purchase.id)] },
        transactionType: "INVOICE",
      },
      select: { transactionId: true, amountInBase: true },
    }),
  ]);

  const nameMap = new Map(customerAccounts.map((customer) => [customer.id, customer.name]));
  const ctMap = new Map(recentCurrencies.map((currency) => [currency.transactionId, currency.amountInBase]));

  return {
    revenue,
    expenses,
    profit,
    revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    expensesGrowth: Math.round(expensesGrowth * 10) / 10,
    profitGrowth: Math.round(profitGrowth * 10) / 10,
    receivables: Number(receivablesRow.total || 0),
    payables: Number(payablesRow.total || 0),
    cashBalance: Number(bankAgg._sum.balance || 0),
    overdueAmount: Math.round(Number(overdueRow.total || 0)),
    invoicesPending: Number(overdueRow.count || 0),
    revenueHistory,
    expensesHistory,
    topCustomers: topCustomerRaw.map((row) => ({ name: nameMap.get(row.customerId) || "Unknown", revenue: Number(row.total || 0) })),
    recentActivity: [
      ...recentSales.map((sale) => ({
        type: "invoice",
        description: `Sales Invoice ${sale.invoiceNo}`,
        amount: Number(ctMap.get(sale.id) ?? sale.total ?? 0),
        date: sale.createdAt.toISOString().slice(0, 10),
      })),
      ...recentPurchases.map((purchase) => ({
        type: "purchase",
        description: `Purchase Invoice ${purchase.invoiceNo}`,
        amount: Number(ctMap.get(purchase.id) ?? purchase.total ?? 0),
        date: purchase.createdAt.toISOString().slice(0, 10),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
  };
}

async function getCharts(companyId: string, branchId: string | null, period: string) {
  const now = new Date();
  const startDate = getPeriodStart(period, now);
  const groupBy = period === "year" || period === "all" ? "month" : "day";
  const bucket = groupBy === "day"
    ? Prisma.sql`TO_CHAR(DATE_TRUNC('day', "date"), 'YYYY-MM-DD')`
    : Prisma.sql`TO_CHAR(DATE_TRUNC('month', "date"), 'YYYY-MM')`;
  const branchClause = branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty;

  const [salesTrend, purchasesTrend] = await Promise.all([
    prisma.$queryRaw<{ label: string; value: number }[]>`
      SELECT ${bucket} AS label, COALESCE(SUM("total"), 0)::float AS value
      FROM "SalesInvoice"
      WHERE "companyId" = ${companyId} AND "deletedAt" IS NULL AND "date" >= ${startDate} ${branchClause}
      GROUP BY label ORDER BY label ASC
    `,
    prisma.$queryRaw<{ label: string; value: number }[]>`
      SELECT ${bucket} AS label, COALESCE(SUM("total"), 0)::float AS value
      FROM "PurchaseInvoice"
      WHERE "companyId" = ${companyId} AND "deletedAt" IS NULL AND "date" >= ${startDate} ${branchClause}
      GROUP BY label ORDER BY label ASC
    `,
  ]);
  return { salesTrend, purchasesTrend, topCustomers: [], topItems: [] };
}

async function getExpenseBreakdown(companyId: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const rows = await prisma.$queryRaw<{ category: string; amount: number }[]>`
    SELECT COALESCE(ei."category", 'Other') AS category,
           COALESCE(SUM(ei."amount"), 0)::float AS amount
    FROM "ExpenseItem" ei
    INNER JOIN "ExpenseVoucher" ev ON ev."id" = ei."expenseVoucherId"
    WHERE ev."companyId" = ${companyId}
      AND ev."date" >= ${start}
      AND ev."date" < ${end}
      AND ev."deletedAt" IS NULL
    GROUP BY COALESCE(ei."category", 'Other')
    ORDER BY amount DESC
  `;
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return {
    rows: rows.map((row) => ({
      department: row.category,
      category: row.category,
      amount: Number(row.amount || 0),
      pct: total > 0 ? (Number(row.amount || 0) / total) * 100 : 0,
      prevAmount: 0,
      change: 0,
    })),
  };
}

async function getTodayStats(companyId: string, branchId: string | null) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const branchClause = branchId ? Prisma.sql`AND si."branchId" = ${branchId}` : Prisma.empty;
  const [[salesRow], [pendingRow], [lowStockRow]] = await Promise.all([
    prisma.$queryRaw<[{ total: number; count: bigint }]>`
      SELECT COALESCE(SUM(COALESCE(ct."amountInBase", si."total")), 0)::float AS total,
             COUNT(si."id") AS count
      FROM "SalesInvoice" si
      LEFT JOIN "CurrencyTransaction" ct ON ct."transactionId" = si."id" AND ct."transactionType" = 'INVOICE'
      WHERE si."companyId" = ${companyId}
        AND si."deletedAt" IS NULL
        AND si."date" >= ${todayStart}
        AND si."date" < ${todayEnd}
        ${branchClause}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(si."id") AS count
      FROM "SalesInvoice" si
      LEFT JOIN "Account" a ON a."id" = si."customerId"
      WHERE si."companyId" = ${companyId}
        AND si."deletedAt" IS NULL
        AND (si."date" + ((COALESCE(a."creditDays", 30))::text || ' days')::interval) < ${now}
        ${branchClause}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(i."id") AS count
      FROM "ItemNew" i
      LEFT JOIN (
        SELECT "itemId", COALESCE(SUM("qty"), 0)::float AS qty
        FROM "InventoryTxn"
        WHERE "companyId" = ${companyId}
        GROUP BY "itemId"
      ) stock ON stock."itemId" = i."id"
      WHERE i."companyId" = ${companyId}
        AND i."deletedAt" IS NULL
        AND i."minStock" > 0
        AND COALESCE(stock.qty, 0) < i."minStock"
    `,
  ]);
  return {
    todaySales: Number(salesRow.total || 0),
    todayOrders: Number(salesRow.count || 0),
    pendingCount: Number(pendingRow.count || 0),
    lowStockCount: Number(lowStockRow.count || 0),
  };
}

async function getDueThisWeek(companyId: string) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [overdueReceivables, dueSoon, banks] = await Promise.all([
    prisma.$queryRaw<{ id: string; invoiceNo: string; party: string; amount: number; dueDate: Date; daysOverdue: number }[]>`
      SELECT si."id",
             si."invoiceNo",
             COALESCE(a."name", '—') AS party,
             COALESCE(si."total", 0)::float AS amount,
             (si."date" + ((COALESCE(a."creditDays", 30))::text || ' days')::interval) AS "dueDate",
             FLOOR(EXTRACT(EPOCH FROM (${now} - (si."date" + ((COALESCE(a."creditDays", 30))::text || ' days')::interval))) / 86400)::int AS "daysOverdue"
      FROM "SalesInvoice" si
      LEFT JOIN "Account" a ON a."id" = si."customerId"
      WHERE si."companyId" = ${companyId}
        AND si."deletedAt" IS NULL
        AND (si."date" + ((COALESCE(a."creditDays", 30))::text || ' days')::interval) < ${now}
      ORDER BY amount DESC
      LIMIT 5
    `,
    prisma.$queryRaw<{ id: string; invoiceNo: string; party: string; amount: number; dueDate: Date; daysLeft: number }[]>`
      SELECT pi."id",
             pi."invoiceNo",
             COALESCE(a."name", '—') AS party,
             COALESCE(pi."total", 0)::float AS amount,
             (pi."date" + ((COALESCE(a."creditDays", 30))::text || ' days')::interval) AS "dueDate",
             FLOOR(EXTRACT(EPOCH FROM ((pi."date" + ((COALESCE(a."creditDays", 30))::text || ' days')::interval) - ${now})) / 86400)::int AS "daysLeft"
      FROM "PurchaseInvoice" pi
      LEFT JOIN "Account" a ON a."id" = pi."supplierId"
      WHERE pi."companyId" = ${companyId}
        AND pi."deletedAt" IS NULL
        AND (pi."date" + ((COALESCE(a."creditDays", 30))::text || ' days')::interval) >= ${now}
        AND (pi."date" + ((COALESCE(a."creditDays", 30))::text || ' days')::interval) <= ${in7Days}
      ORDER BY "daysLeft" ASC
      LIMIT 5
    `,
    prisma.bankAccount.findMany({
      where: { companyId },
      select: { id: true, bankName: true, accountName: true, balance: true },
      orderBy: { balance: "desc" },
      take: 4,
    }),
  ]);

  return {
    overdueReceivables: overdueReceivables.map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
      dueDate: new Date(row.dueDate).toISOString().slice(0, 10),
    })),
    dueSoon: dueSoon.map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
      dueDate: new Date(row.dueDate).toISOString().slice(0, 10),
    })),
    banks,
  };
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_DASHBOARD, companyId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const period = req.nextUrl.searchParams.get("period") || "month";
    const branchId = await resolveBranchId(req, companyId);

    const [
      company,
      branches,
      summary,
      charts,
      expenses,
      todayStats,
      dueData,
    ] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          country: true,
          baseCurrency: true,
          plan: true,
          subscriptionStatus: true,
          activeModules: true,
          businessType: true,
          businessSetupDone: true,
          logoUrl: true,
        },
      }),
      prisma.branch.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),
      getSummary(companyId, branchId, period),
      getCharts(companyId, branchId, period),
      getExpenseBreakdown(companyId),
      getTodayStats(companyId, branchId),
      getDueThisWeek(companyId),
    ]);

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    return NextResponse.json({
      company: {
        ...company,
        baseCurrency: company.baseCurrency || currencyByCountry(company.country || "Pakistan"),
      },
      businessType: {
        businessType: company.businessType,
        businessSetupDone: company.businessSetupDone,
        name: company.name,
      },
      branches,
      summary,
      charts,
      expenses,
      todayStats,
      dueData,
    }, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" },
    });
  } catch (e: any) {
    console.error("DASHBOARD API ERROR:", e);
    return NextResponse.json({ error: e.message || "Dashboard failed" }, { status: 500 });
  }
}
