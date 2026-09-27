import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ledgerMonthlyPL, ledgerPL, ledgerPositions, openPartyBills } from "@/lib/ledgerKpis";

export function getPeriodStart(period: string, now = new Date()) {
  if (period === "all") return new Date(2000, 0, 1);
  if (period === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), quarter * 3, 1);
  }
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getSummary(companyId: string, branchId: string | null, period: string) {
  const now = new Date();
  const startDate = getPeriodStart(period, now);
  const periodMs = now.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - periodMs);

  // Money KPIs come from the ledger — see lib/ledgerKpis.ts for what the
  // invoice-total versions of these got wrong.
  const [
    current,
    previous,
    positions,
    monthly,
    topCustomerRaw,
    recentSales,
    recentPurchases,
    [stockValueRow],
  ] = await Promise.all([
    ledgerPL(companyId, branchId, startDate, now),
    ledgerPL(companyId, branchId, prevStart, startDate),
    ledgerPositions(companyId, branchId, now),
    ledgerMonthlyPL(companyId, branchId, 12, now),
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
    // Inventory valued at cost — the "Stock Value" KPI on the trading,
    // retail and distribution dashboards.
    prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(GREATEST(COALESCE(stock.qty, 0), 0) * i."purchaseRate"), 0)::float AS total
      FROM "ItemNew" i
      LEFT JOIN (
        SELECT "itemId", COALESCE(SUM("qty"), 0)::float AS qty
        FROM "InventoryTxn"
        WHERE "companyId" = ${companyId}
        GROUP BY "itemId"
      ) stock ON stock."itemId" = i."id"
      WHERE i."companyId" = ${companyId}
        AND i."deletedAt" IS NULL
    `,
  ]);

  const { revenue, expenses, profit } = current;
  const { revenue: prevRevenue, expenses: prevExpenses, profit: prevProfit } = previous;
  const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : (revenue > 0 ? 100 : 0);
  const expensesGrowth = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : (expenses > 0 ? 100 : 0);
  const profitGrowth = prevProfit !== 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : (profit !== 0 ? 100 : 0);

  const revenueHistory = monthly.revenue;
  const expensesHistory = monthly.expenses;

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
    receivables: positions.receivables,
    payables: positions.payables,
    cashBalance: positions.cashBalance,
    stockValue: Number(stockValueRow.total || 0),
    overdueAmount: Math.round(positions.overdueAmount),
    invoicesPending: positions.overdueCount,
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

export async function getCharts(companyId: string, branchId: string | null, period: string) {
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

export async function getExpenseBreakdown(companyId: string) {
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

export async function getTodayStats(companyId: string, branchId: string | null) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const branchClause = branchId ? Prisma.sql`AND si."branchId" = ${branchId}` : Prisma.empty;
  const [[salesRow], positions, [lowStockRow]] = await Promise.all([
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
    // Overdue = still unpaid and past credit days (lib/ledgerKpis.ts), not
    // every invoice older than its credit days.
    ledgerPositions(companyId, branchId, now),
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
    pendingCount: positions.overdueCount,
    lowStockCount: Number(lowStockRow.count || 0),
  };
}

export async function getDueThisWeek(companyId: string) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dayMs = 86_400_000;

  // Bill-wise from the ledger (lib/ledgerKpis.ts): only what is still unpaid.
  // These used to list every invoice past (or near) its credit days at its
  // full total, paid or not.
  const [receivable, payable, banks] = await Promise.all([
    openPartyBills(companyId, "RECEIVABLE", now),
    openPartyBills(companyId, "PAYABLE", now),
    prisma.bankAccount.findMany({
      where: { companyId },
      select: { id: true, bankName: true, accountName: true, balance: true },
      orderBy: { balance: "desc" },
      take: 4,
    }),
  ]);

  const overdueReceivables = receivable
    .filter((b) => b.dueDate < now)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
    .map((b) => ({
      id: `${b.accountId}:${b.ref}:${b.date.toISOString()}`,
      invoiceNo: b.ref === "---" ? "Opening balance" : b.ref,
      party: b.party,
      amount: b.balance,
      dueDate: b.dueDate.toISOString().slice(0, 10),
      daysOverdue: Math.floor((now.getTime() - b.dueDate.getTime()) / dayMs),
    }));

  const dueSoon = payable
    .filter((b) => b.dueDate >= now && b.dueDate <= in7Days)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5)
    .map((b) => ({
      id: `${b.accountId}:${b.ref}:${b.date.toISOString()}`,
      invoiceNo: b.ref === "---" ? "Opening balance" : b.ref,
      party: b.party,
      amount: b.balance,
      dueDate: b.dueDate.toISOString().slice(0, 10),
      daysLeft: Math.floor((b.dueDate.getTime() - now.getTime()) / dayMs),
    }));

  return { overdueReceivables, dueSoon, banks };
}
