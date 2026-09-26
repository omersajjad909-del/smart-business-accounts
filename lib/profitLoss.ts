// FILE: lib/profitLoss.ts
//
// The profit & loss statement, computed from the ledger — the same vouchers
// lib/trialBalance.ts reads, so the two reports can never disagree.

import { prisma } from "@/lib/prisma";

const FINANCE_RE    = /\b(interest|finance.?charg|bank.?charg|loan|markup|bnpl|exchange.?loss)\b/i;
const TAX_RE        = /\b(income.?tax|corporate.?tax|withhold|tax.?payable)\b/i;

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 10000) / 100;
}

export async function computeProfitLoss(opts: {
  companyId: string;
  branchId?: string | null;
  fromDate: Date;
  toDate: Date;
}) {
  const { companyId, branchId, fromDate, toDate } = opts;

  // ── Everything comes from the ledger ────────────────────────────
  // This report used to add up invoice totals (tax included) and guess cost
  // of sales from stock movements valued at *sale* price, clamping the
  // result at zero — so COGS read 0 and every profit line equalled sales.
  // It now reads the same vouchers the trial balance does, so the two agree:
  // revenue is what was credited to income, cost of sales what was charged
  // to cost accounts (the COGS vouchers every sale posts), expenses what was
  // charged to expense accounts.
  const voucherWhere = {
    companyId,
    deletedAt: null,
    date: { gte: fromDate, lte: toDate },
    // Opening balances are not this period's trading; the year-end closing
    // entry would wipe every line it is meant to report.
    type: { notIn: ["OPENING", "YEAR_END"] },
    ...(branchId ? { branchId } : {}),
  };

  const accounts = await prisma.account.findMany({
    where: { companyId },
    select: { id: true, name: true, type: true },
  });
  const plAccounts = accounts.filter(a => /^(INCOME|REVENUE|EXPENSE|EXPENSES|COST)$/i.test((a.type || "").trim()));
  const byId = new Map(plAccounts.map(a => [a.id, a]));

  const entries = plAccounts.length
    ? await prisma.voucherEntry.findMany({
        where: { accountId: { in: [...byId.keys()] }, voucher: voucherWhere },
        select: { accountId: true, amount: true, voucher: { select: { type: true } } },
      })
    : [];

  const SALE_VOUCHERS = new Set(["SI", "SR"]);
  const SALES_NAME   = /\b(sales?|revenue|turnover)\b/i;
  const RETURN_NAME  = /return/i;
  const COGS_NAME    = /cost of (goods|sales)|\bcogs\b|purchase|freight.?in|carriage.?in|raw material|factory|direct (labou?r|material|cost)|manufactur/i;

  const salesMap:     Record<string, number> = {};
  const returnsMap:   Record<string, number> = {};
  const cogsMap:      Record<string, number> = {};
  const opExMap:      Record<string, number> = {};
  const financeMap:   Record<string, number> = {};
  const taxMapAcc:    Record<string, number> = {};
  const otherIncMap:  Record<string, number> = {};
  const add = (m: Record<string, number>, k: string, v: number) => { m[k] = (m[k] || 0) + v; };

  for (const e of entries) {
    const acc = byId.get(e.accountId);
    if (!acc) continue;
    const amt = Number(e.amount) || 0; // +ve debit, −ve credit
    if (Math.abs(amt) < 0.0001) continue;
    const name = acc.name;
    const isIncome = /^(INCOME|REVENUE)$/i.test((acc.type || "").trim());

    if (RETURN_NAME.test(name) && SALES_NAME.test(name)) add(returnsMap, name, amt);          // debit side
    else if (isIncome) {
      if (SALE_VOUCHERS.has(e.voucher.type) || SALES_NAME.test(name)) add(salesMap, name, -amt); // credit side
      else add(otherIncMap, name, -amt);
    }
    else if (COGS_NAME.test(name) || e.voucher.type === "COGS") add(cogsMap, name, amt);
    else if (TAX_RE.test(name))     add(taxMapAcc, name, amt);
    else if (FINANCE_RE.test(name)) add(financeMap, name, amt);
    else                            add(opExMap, name, amt);
  }

  const toArr = (m: Record<string, number>) =>
    Object.entries(m)
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .filter(r => Math.abs(r.amount) >= 0.005)
      .sort((a, b) => b.amount - a.amount);
  const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

  const salesLines        = toArr(salesMap);
  const cogsLines         = toArr(cogsMap);
  const operatingExpenses = toArr(opExMap);
  const financeExpenses   = toArr(financeMap);
  const otherIncome       = toArr(otherIncMap);
  const taxEntries        = toArr(taxMapAcc);

  const grossSales     = sum(salesLines);
  const salesReturns   = sum(toArr(returnsMap));
  const salesDiscounts = 0; // invoices post net of discount
  const netSales       = grossSales - salesReturns;

  // Signed, never clamped: a negative cost of sales is a finding, not noise.
  const cogs           = sum(cogsLines);
  const grossProfit    = netSales - cogs;
  const grossMarginPct = pct(grossProfit, netSales);

  const totalOpEx            = sum(operatingExpenses);
  const totalFinanceExpenses = sum(financeExpenses);
  const totalOtherIncome     = sum(otherIncome);
  const taxAmount            = sum(taxEntries);

  const operatingProfit     = grossProfit - totalOpEx;
  const operatingMarginPct  = pct(operatingProfit, netSales);
  const netOtherIncome      = totalOtherIncome - totalFinanceExpenses;
  const ebt                 = operatingProfit + netOtherIncome;
  const netProfit           = ebt - taxAmount;
  const netMarginPct        = pct(netProfit, netSales);

  return {
    // Revenue
    grossSales, salesReturns, salesDiscounts, netSales,
    salesLines,
    // COGS
    cogsLines, cogs,
    // Gross Profit
    grossProfit, grossMarginPct,
    // Operating Expenses
    operatingExpenses, totalOpEx,
    // EBIT
    operatingProfit, operatingMarginPct,
    // Other
    otherIncome, totalOtherIncome,
    financeExpenses, totalFinanceExpenses,
    // EBT
    ebt,
    // Tax
    taxEntries, taxAmount,
    // Net Profit
    netProfit, netMarginPct,
    // Legacy fields (for backward compat if anything reads these)
    totalIncome: netSales + totalOtherIncome,
    totalExpense: cogs + totalOpEx + totalFinanceExpenses + taxAmount,
    income: [{ name: "Net Sales", amount: netSales }, ...otherIncome],
    expense: [
      { name: "Cost of Goods Sold", amount: cogs },
      ...operatingExpenses, ...financeExpenses,
    ],
  };
}
