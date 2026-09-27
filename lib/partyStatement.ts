// FILE: lib/partyStatement.ts
//
// Customer and supplier statements, read from the party's ledger account.
//
// Both statements used to add up invoices and `PaymentReceipt` rows. That
// missed everything else that moves a party's balance — the opening balance
// entered on the account, supplier payments (posted as CPV/bank vouchers, never
// as receipts), returns, journals — so a supplier who had been paid showed the
// full invoiced amount as still owing, and every customer's opening balance
// was missing. The ledger already has all of it, and it is what the trial
// balance and balance sheet read, so the statement now agrees with them.

import { prisma } from "@/lib/prisma";

export type StatementRow = {
  date: string;
  ref: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export type PartyStatement = {
  openingBalance: number;
  closingBalance: number;
  /** Invoices raised in the period (sales for a customer, purchases for a supplier). */
  totalInvoiced: number;
  /** Money settled in the period (received from a customer, paid to a supplier). */
  totalSettled: number;
  rows: StatementRow[];
  ageing: { current: number; days30: number; days60: number; days90plus: number };
};

const TYPE_LABEL: Record<string, string> = {
  SI: "Sales Invoice",
  SR: "Sales Return",
  PI: "Purchase Invoice",
  PR: "Purchase Return",
  CRV: "Cash Receipt",
  CPV: "Cash Payment",
  BRV: "Bank Receipt",
  BPV: "Bank Payment",
  JV: "Journal",
  CN: "Credit Note",
  DN: "Debit Note",
  CONTRA: "Contra",
  OPENING: "Opening Balance",
};

const INVOICE_TYPES = { CUSTOMER: new Set(["SI"]), SUPPLIER: new Set(["PI"]) };
const SETTLEMENT_TYPES = new Set(["CRV", "CPV", "BRV", "BPV", "BANK", "RECEIPT", "PAYMENT"]);

const round2 = (n: number) => Math.round(n * 100) / 100;
const daysBetween = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / 86_400_000);

/**
 * `side` decides the sign the statement is written in: a customer's balance is
 * what they owe us (debit-positive), a supplier's is what we owe them
 * (credit-positive). Debit/credit columns always mean the ledger's debit and
 * credit, so the statement reads the same as the account ledger.
 */
export async function computePartyStatement(opts: {
  companyId: string;
  accountId: string;
  side: "CUSTOMER" | "SUPPLIER";
  from: Date;
  to: Date;
  creditDays?: number | null;
}): Promise<PartyStatement> {
  const { companyId, accountId, side, from, to } = opts;
  const sign = side === "CUSTOMER" ? 1 : -1;

  const [account, before, period, lifetime] = await Promise.all([
    prisma.account.findFirst({ where: { id: accountId, companyId }, select: { openDebit: true, openCredit: true } }),
    prisma.voucherEntry.aggregate({
      where: { accountId, voucher: { companyId, deletedAt: null, date: { lt: from } } },
      _sum: { amount: true },
    }),
    prisma.voucherEntry.findMany({
      where: { accountId, voucher: { companyId, deletedAt: null, date: { gte: from, lte: to } } },
      select: { amount: true, voucher: { select: { voucherNo: true, type: true, date: true, narration: true } } },
      orderBy: [{ voucher: { date: "asc" } }, { voucher: { voucherNo: "asc" } }],
    }),
    // Every increase to the balance up to `to`, for ageing what is still open.
    prisma.voucherEntry.findMany({
      where: { accountId, amount: side === "CUSTOMER" ? { gt: 0 } : { lt: 0 }, voucher: { companyId, deletedAt: null, date: { lte: to } } },
      select: { amount: true, voucher: { select: { date: true } } },
      orderBy: { voucher: { date: "desc" } },
    }),
  ]);

  const masterOpening = Number(account?.openDebit || 0) - Number(account?.openCredit || 0);
  const openingBalance = round2(sign * (masterOpening + Number(before._sum.amount || 0)));

  let running = openingBalance;
  let totalInvoiced = 0;
  let totalSettled = 0;
  const rows: StatementRow[] = period.map((e) => {
    const amt = Number(e.amount) || 0;
    const debit = amt > 0 ? round2(amt) : 0;
    const credit = amt < 0 ? round2(-amt) : 0;
    running = round2(running + sign * amt);
    const type = e.voucher.type;
    if (INVOICE_TYPES[side].has(type)) totalInvoiced += sign * amt;
    else if (SETTLEMENT_TYPES.has(type)) totalSettled += -sign * amt;
    return {
      date: e.voucher.date.toISOString().slice(0, 10),
      ref: e.voucher.voucherNo,
      type,
      description: e.voucher.narration || TYPE_LABEL[type] || type,
      debit,
      credit,
      balance: running,
    };
  });

  // Ageing: whatever is still owed is made of the most recent increases
  // (payments settle the oldest first). The master opening balance, having no
  // date, is treated as the oldest item.
  const ageing = { current: 0, days30: 0, days60: 0, days90plus: 0 };
  let open = running;
  const today = to < new Date() ? to : new Date();
  const creditDays = Number(opts.creditDays || 0);
  for (const e of lifetime) {
    if (open <= 0.005) break;
    const part = Math.min(open, Math.abs(Number(e.amount) || 0));
    open -= part;
    const age = Math.max(0, daysBetween(e.voucher.date, today) - creditDays);
    if (age <= 30) ageing.current += part;
    else if (age <= 60) ageing.days30 += part;
    else if (age <= 90) ageing.days60 += part;
    else ageing.days90plus += part;
  }
  if (open > 0.005) ageing.days90plus += open;

  return {
    openingBalance,
    closingBalance: running,
    totalInvoiced: round2(totalInvoiced),
    totalSettled: round2(totalSettled),
    rows,
    ageing: {
      current: round2(ageing.current),
      days30: round2(ageing.days30),
      days60: round2(ageing.days60),
      days90plus: round2(ageing.days90plus),
    },
  };
}
