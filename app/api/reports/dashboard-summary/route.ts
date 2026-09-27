import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { Prisma } from "@prisma/client";
import { ledgerMonthlyPL, ledgerPL, ledgerPositions } from "@/lib/ledgerKpis";
import { billStatus, collectPartyBills, settleBills } from "@/lib/billAgeing";

// Helper: SUM of invoices with currency conversion via CurrencyTransaction
// Uses COALESCE: if a CurrencyTransaction exists → amountInBase; else → total (already base currency)
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
    if (period === "all") {
      startDate = new Date(2000, 0, 1); // effectively all-time
    } else if (period === "quarter") {
      const q = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), q * 3, 1);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const periodMs = now.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodMs);

    // Money KPIs come from the ledger, the same figures the P&L, trial balance
    // and main dashboard show — see lib/ledgerKpis.ts for what the invoice-total
    // versions got wrong (unpaid-forever receivables, sales − purchases as profit).
    const [current, previous, positions, monthly] = await Promise.all([
      ledgerPL(companyId, branchId, startDate, now),
      ledgerPL(companyId, branchId, prevStart, startDate),
      ledgerPositions(companyId, branchId, now),
      ledgerMonthlyPL(companyId, branchId, 12, now),
    ]);

    const { revenue, expenses, profit } = current;
    const { revenue: prevRevenue, expenses: prevExpenses, profit: prevProfit } = previous;
    const { receivables, payables, cashBalance } = positions;

    const revenueGrowth  = prevRevenue  > 0 ? ((revenue  - prevRevenue)  / prevRevenue)  * 100 : (revenue  > 0 ? 100 : 0);
    const expensesGrowth = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : (expenses > 0 ? 100 : 0);
    const profitGrowth   = prevProfit !== 0 ? ((profit   - prevProfit)   / Math.abs(prevProfit)) * 100 : (profit !== 0 ? 100 : 0);

    const overdueAmount   = positions.overdueAmount;
    const invoicesPending = positions.overdueCount;

    const revenueHistory  = monthly.revenue;
    const expensesHistory = monthly.expenses;

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
        select: { id: true, invoiceNo: true, total: true, createdAt: true, customerId: true },
      }),
      prisma.purchaseInvoice.findMany({
        where: { companyId, deletedAt: null, ...(branchId ? { branchId } : {}) },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, invoiceNo: true, total: true, createdAt: true, supplierId: true },
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

    // Payment status is not a column on the invoice — a bill is settled by a
    // CRV/CPV landing on the same party account, so the ledger is the only
    // place that knows. Settle each party's bills oldest-first (the rule the
    // ageing report uses) and read the balance off the invoice's own voucher.
    // The row used to say "Paid" no matter what.
    const partyIds = Array.from(
      new Set(
        [
          ...recentSales.map((s) => s.customerId),
          ...recentPurchases.map((p) => p.supplierId),
        ].filter(Boolean) as string[],
      ),
    );

    const [partyAccounts, partyEntries] = partyIds.length
      ? await Promise.all([
          prisma.account.findMany({
            where: { id: { in: partyIds }, companyId },
            select: { id: true, openDebit: true, openCredit: true, openDate: true },
          }),
          prisma.voucherEntry.findMany({
            where: {
              accountId: { in: partyIds },
              voucher: { companyId, deletedAt: null, ...(branchId ? { branchId } : {}) },
            },
            include: {
              voucher: { select: { date: true, voucherNo: true, narration: true, type: true } },
            },
            orderBy: { voucher: { date: "asc" } },
          }),
        ])
      : [[], []];

    const asOnNow = new Date();
    // partyId → invoiceNo → outstanding balance on that bill
    const balanceByParty = new Map<string, Map<string, number>>();

    for (const account of partyAccounts) {
      const entries = partyEntries.filter((e) => e.accountId === account.id);
      const isCustomer = recentSales.some((s) => s.customerId === account.id);
      const master = Number(account.openDebit || 0) - Number(account.openCredit || 0);

      const { bills, credit } = collectPartyBills({
        entries,
        opening: isCustomer ? master : -master,
        openingDate: account.openDate ? new Date(account.openDate) : null,
        asOn: asOnNow,
        side: isCustomer ? "RECEIVABLE" : "PAYABLE",
      });

      const { settled } = settleBills(bills, credit);
      const byNo = new Map<string, number>();
      for (const bill of settled) {
        byNo.set(bill.numType, (byNo.get(bill.numType) ?? 0) + bill.balance);
      }
      balanceByParty.set(account.id, byNo);
    }

    // An invoice posts its voucher under voucherNo = invoiceNo.
    const statusOf = (partyId: string | null, invoiceNo: string, amount: number) => {
      const byNo = partyId ? balanceByParty.get(partyId) : undefined;
      const balance = byNo?.get(invoiceNo);
      if (balance === undefined) return "UNPAID";
      return billStatus(amount, balance);
    };

    const recentActivity = [
      ...recentSales.map((s) => {
        const amount = Number(ctMap.get(s.id) ?? s.total ?? 0);
        return {
          type: "invoice",
          description: `Sales Invoice ${s.invoiceNo}`,
          amount,
          date: s.createdAt.toISOString().slice(0, 10),
          status: statusOf(s.customerId, s.invoiceNo, amount),
        };
      }),
      ...recentPurchases.map((p) => {
        const amount = Number(ctMap.get(p.id) ?? p.total ?? 0);
        return {
          type: "purchase",
          description: `Purchase Invoice ${p.invoiceNo}`,
          amount,
          date: p.createdAt.toISOString().slice(0, 10),
          status: statusOf(p.supplierId, p.invoiceNo, amount),
        };
      }),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    return NextResponse.json({
      revenue,
      expenses,
      profit,
      revenueGrowth:  Math.round(revenueGrowth  * 10) / 10,
      expensesGrowth: Math.round(expensesGrowth * 10) / 10,
      profitGrowth:   Math.round(profitGrowth   * 10) / 10,
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
