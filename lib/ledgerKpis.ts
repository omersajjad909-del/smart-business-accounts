// FILE: lib/ledgerKpis.ts
//
// Dashboard KPIs read from the ledger — the vouchers the trial balance,
// balance sheet and P&L read — so a number on the dashboard is the same number
// the reports show.
//
// The dashboards used to add up invoice totals instead:
//   • "Receivables" was every sales invoice ever raised, with no payment ever
//     subtracted, so it only ever grew.
//   • "Payables" the same for purchase invoices.
//   • "Expenses" were purchase invoices, so "Profit" was sales − purchases (tax
//     on both sides included) — nothing like the P&L.
//   • "Overdue" counted every invoice past its credit days, paid or not.
//   • "Cash" was the stored balance on bank records, without cash in hand.

import { prisma } from "@/lib/prisma";
import { BILL_EPS, collectPartyBills, settleBills } from "@/lib/billAgeing";

const round2 = (n: number) => Math.round(n * 100) / 100;
const INCOME_TYPE = /^(INCOME|REVENUE)$/i;
const EXPENSE_TYPE = /^(EXPENSE|EXPENSES|COST)$/i;

/**
 * Cash and bank accounts: bank-type parties, accounts behind a BankAccount
 * record, and asset accounts named for cash.
 */
export async function cashAccountIds(companyId: string): Promise<string[]> {
  const [named, banks, linked] = await Promise.all([
    prisma.account.findMany({
      where: {
        companyId,
        type: { equals: "ASSET", mode: "insensitive" },
        OR: [
          { name: { contains: "cash", mode: "insensitive" } },
          { name: { contains: "petty", mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true },
    }),
    prisma.account.findMany({
      where: { companyId, partyType: { equals: "BANKS", mode: "insensitive" } },
      select: { id: true },
    }),
    prisma.bankAccount.findMany({ where: { companyId }, select: { accountId: true } }),
  ]);
  // "Cash Discount", "Cash Sales Clearing" and the like are not money.
  const cash = named.filter((a) => !/discount|clearing|advance|equivalent.*invest/i.test(a.name));
  return [...new Set([...cash.map((a) => a.id), ...banks.map((a) => a.id), ...linked.map((b) => b.accountId)])];
}

/** Closing balance (debit-positive) per account, master opening included. */
async function balances(companyId: string, branchId: string | null, accountIds: string[], asOf: Date) {
  if (!accountIds.length) return new Map<string, number>();
  const [accounts, sums] = await Promise.all([
    prisma.account.findMany({ where: { id: { in: accountIds } }, select: { id: true, openDebit: true, openCredit: true } }),
    prisma.voucherEntry.groupBy({
      by: ["accountId"],
      where: {
        accountId: { in: accountIds },
        voucher: { companyId, deletedAt: null, date: { lte: asOf }, ...(branchId ? { branchId } : {}) },
      },
      _sum: { amount: true },
    }),
  ]);
  const sumMap = new Map(sums.map((s) => [s.accountId, Number(s._sum.amount || 0)]));
  return new Map(
    accounts.map((a) => [a.id, Number(a.openDebit || 0) - Number(a.openCredit || 0) + (sumMap.get(a.id) || 0)]),
  );
}

/** Income, expense and profit over a period, from income/expense accounts. */
export async function ledgerPL(companyId: string, branchId: string | null, from: Date, to: Date) {
  const accounts = await prisma.account.findMany({ where: { companyId }, select: { id: true, type: true } });
  const income = new Set(accounts.filter((a) => INCOME_TYPE.test((a.type || "").trim())).map((a) => a.id));
  const expense = new Set(accounts.filter((a) => EXPENSE_TYPE.test((a.type || "").trim())).map((a) => a.id));
  if (!income.size && !expense.size) return { revenue: 0, expenses: 0, profit: 0 };

  const sums = await prisma.voucherEntry.groupBy({
    by: ["accountId"],
    where: {
      accountId: { in: [...income, ...expense] },
      voucher: {
        companyId, deletedAt: null, date: { gte: from, lte: to },
        // Same exclusions as the P&L (lib/profitLoss.ts).
        type: { notIn: ["OPENING", "YEAR_END"] },
        ...(branchId ? { branchId } : {}),
      },
    },
    _sum: { amount: true },
  });
  let revenue = 0;
  let expenses = 0;
  for (const s of sums) {
    const amt = Number(s._sum.amount || 0);
    if (income.has(s.accountId)) revenue -= amt;
    else expenses += amt;
  }
  return { revenue: round2(revenue), expenses: round2(expenses), profit: round2(revenue - expenses) };
}

/** Month-by-month income and expense for the last `months` months, oldest first. */
export async function ledgerMonthlyPL(companyId: string, branchId: string | null, months = 12, now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const accounts = await prisma.account.findMany({ where: { companyId }, select: { id: true, type: true } });
  const income = new Set(accounts.filter((a) => INCOME_TYPE.test((a.type || "").trim())).map((a) => a.id));
  const expense = new Set(accounts.filter((a) => EXPENSE_TYPE.test((a.type || "").trim())).map((a) => a.id));
  const revenue = Array(months).fill(0);
  const expenses = Array(months).fill(0);
  if (!income.size && !expense.size) return { revenue, expenses };

  const entries = await prisma.voucherEntry.findMany({
    where: {
      accountId: { in: [...income, ...expense] },
      voucher: {
        companyId, deletedAt: null, date: { gte: from, lte: now },
        type: { notIn: ["OPENING", "YEAR_END"] },
        ...(branchId ? { branchId } : {}),
      },
    },
    select: { accountId: true, amount: true, voucher: { select: { date: true } } },
  });
  for (const e of entries) {
    const d = e.voucher.date;
    const idx = (d.getFullYear() - from.getFullYear()) * 12 + (d.getMonth() - from.getMonth());
    if (idx < 0 || idx >= months) continue;
    if (income.has(e.accountId)) revenue[idx] -= Number(e.amount);
    else expenses[idx] += Number(e.amount);
  }
  return { revenue: revenue.map(round2), expenses: expenses.map(round2) };
}

/**
 * What customers owe, what is owed to suppliers, cash on hand, and the part of
 * receivables that is past its credit days.
 *
 * Overdue is worked out per customer: payments settle the oldest invoices
 * first, so whatever is still owed is made of the most recent charges. Only the
 * open part of a charge whose credit days have run out counts as overdue.
 */
export async function ledgerPositions(companyId: string, branchId: string | null, now = new Date()) {
  const [parties, cashIds] = await Promise.all([
    prisma.account.findMany({
      where: { companyId, partyType: { in: ["CUSTOMER", "SUPPLIER"] } },
      select: { id: true, partyType: true, creditDays: true },
    }),
    cashAccountIds(companyId),
  ]);
  const customers = parties.filter((p) => p.partyType === "CUSTOMER");
  const suppliers = parties.filter((p) => p.partyType === "SUPPLIER");

  const bal = await balances(companyId, branchId, [...parties.map((p) => p.id), ...cashIds], now);

  let receivables = 0;
  let payables = 0;
  const owing = new Map<string, number>();
  for (const c of customers) {
    const b = bal.get(c.id) || 0;
    if (b > 0.005) { receivables += b; owing.set(c.id, b); }
  }
  for (const s of suppliers) {
    const b = -(bal.get(s.id) || 0);
    if (b > 0.005) payables += b;
  }
  const cash = cashIds.reduce((s, id) => s + (bal.get(id) || 0), 0);

  let overdueAmount = 0;
  let overdueCount = 0;
  if (owing.size) {
    const charges = await prisma.voucherEntry.findMany({
      where: {
        accountId: { in: [...owing.keys()] },
        amount: { gt: 0 },
        voucher: { companyId, deletedAt: null, date: { lte: now }, ...(branchId ? { branchId } : {}) },
      },
      select: { accountId: true, amount: true, voucher: { select: { date: true } } },
      orderBy: { voucher: { date: "desc" } },
    });
    const creditDays = new Map(customers.map((c) => [c.id, Number(c.creditDays ?? 30)]));
    const open = new Map(owing);
    for (const e of charges) {
      const left = open.get(e.accountId) || 0;
      if (left <= 0.005) continue;
      const part = Math.min(left, Number(e.amount));
      open.set(e.accountId, left - part);
      const due = new Date(e.voucher.date);
      due.setDate(due.getDate() + (creditDays.get(e.accountId) ?? 30));
      if (due < now) { overdueAmount += part; overdueCount++; }
    }
    // Balance older than every posted charge (a master opening balance) is
    // as old as it gets.
    for (const left of open.values()) if (left > 0.005) { overdueAmount += left; overdueCount++; }
  }

  return {
    receivables: round2(receivables),
    payables: round2(payables),
    cashBalance: round2(cash),
    overdueAmount: round2(overdueAmount),
    overdueCount,
  };
}

export type OpenBill = {
  accountId: string;
  party: string;
  /** Voucher number of the bill (the invoice number for posted invoices), or "---" for an opening balance. */
  ref: string;
  date: Date;
  dueDate: Date;
  amount: number;
  balance: number;
};

/**
 * Every customer (RECEIVABLE) or supplier (PAYABLE) bill with something still
 * open on it, bill-wise from the ledger: payments settle the oldest bills
 * first (lib/billAgeing.ts). `dueDate` is the bill date plus the party's credit
 * days (30 when none are set).
 */
export async function openPartyBills(
  companyId: string,
  side: "RECEIVABLE" | "PAYABLE",
  asOf = new Date(),
): Promise<OpenBill[]> {
  const parties = await prisma.account.findMany({
    where: { companyId, partyType: side === "RECEIVABLE" ? "CUSTOMER" : "SUPPLIER" },
    select: { id: true, name: true, creditDays: true, openDebit: true, openCredit: true, openDate: true },
  });
  if (!parties.length) return [];

  const entries = await prisma.voucherEntry.findMany({
    where: { accountId: { in: parties.map((p) => p.id) }, voucher: { companyId, deletedAt: null, date: { lte: asOf } } },
    select: { accountId: true, amount: true, voucher: { select: { date: true, voucherNo: true, narration: true, type: true } } },
    orderBy: { voucher: { date: "asc" } },
  });
  const byParty = new Map<string, typeof entries>();
  for (const e of entries) {
    const list = byParty.get(e.accountId);
    if (list) list.push(e);
    else byParty.set(e.accountId, [e]);
  }

  const out: OpenBill[] = [];
  for (const p of parties) {
    const openingDebit = Number(p.openDebit || 0) - Number(p.openCredit || 0);
    const { bills, credit } = collectPartyBills({
      entries: byParty.get(p.id) ?? [],
      opening: side === "RECEIVABLE" ? openingDebit : -openingDebit,
      openingDate: p.openDate ? new Date(p.openDate) : null,
      asOn: asOf,
      side,
    });
    const { settled } = settleBills(bills, credit);
    for (const b of settled) {
      if (b.balance <= BILL_EPS) continue;
      const dueDate = new Date(b.date);
      dueDate.setDate(dueDate.getDate() + (p.creditDays ?? 30));
      out.push({ accountId: p.id, party: p.name, ref: b.numType, date: b.date, dueDate, amount: round2(b.amount), balance: round2(b.balance) });
    }
  }
  return out;
}
