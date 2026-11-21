import { prisma } from "@/lib/prisma";
import { nextDocNo } from "@/lib/docNumber";
import { ensureCashAccount } from "@/lib/payrollAccounting";

// ─── School fee → general ledger ─────────────────────────────────────────────
// Two ways of keeping the books, chosen per school (SchoolSettings.feeAccounting):
//
//   CASH (default)  a fee is income the day it is received.
//                   receipt:  DR Cash / Bank          CR School Fee Income
//
//   ACCRUAL         a fee is income the day it is billed; what is unpaid sits in Fee Receivable.
//                   billing:  DR Fee Receivable       CR School Fee Income   (one voucher per billing run)
//                   receipt:  DR Cash / Bank          CR Fee Receivable
//
// Receipt vouchers carry a [SCHPAY:<paymentId>] tag so posting is idempotent and a receipt can
// always be traced back from the ledger. Billing is tracked per invoice in `accruedAmount`, so
// running it twice never books anything twice, and a late fee added later posts only the difference.

const FEE_INCOME_CODE = "SCH-FEE";

async function ensureFeeIncomeAccount(companyId: string) {
  const existing = await prisma.account.findFirst({ where: { companyId, code: FEE_INCOME_CODE } });
  if (existing) return existing;
  return prisma.account.create({ data: { companyId, code: FEE_INCOME_CODE, name: "School Fee Income", type: "INCOME" } });
}

export type FeeAccounting = "CASH" | "ACCRUAL";

export async function getFeeAccounting(companyId: string): Promise<FeeAccounting> {
  const row = await prisma.schoolSettings.findUnique({ where: { companyId }, select: { feeAccounting: true } });
  return row?.feeAccounting === "ACCRUAL" ? "ACCRUAL" : "CASH";
}

async function ensureFeeReceivableAccount(companyId: string) {
  const existing = await prisma.account.findFirst({ where: { companyId, code: "SCH-REC" } });
  if (existing) return existing;
  return prisma.account.create({ data: { companyId, code: "SCH-REC", name: "Fee Receivable", type: "ASSET" } });
}

async function ensureBankAccount(companyId: string) {
  const existing = await prisma.account.findFirst({ where: { companyId, type: "ASSET", name: { contains: "Bank", mode: "insensitive" } } });
  if (existing) return existing;
  return prisma.account.create({ data: { companyId, code: "BANK", name: "Bank / Mobile Wallet", type: "ASSET" } });
}

export type SchoolReceipt = {
  companyId: string;
  paymentId: string;
  receiptNo: string;
  studentName: string;
  amount: number;
  method: string;
  paidAt: Date;
};

/** Posts the ledger voucher for one fee receipt. Safe to call twice. */
export async function postSchoolFeeReceipt(r: SchoolReceipt) {
  if (r.amount <= 0) return null;
  const tag = `[SCHPAY:${r.paymentId}]`;
  const already = await prisma.voucher.findFirst({ where: { companyId: r.companyId, narration: { contains: tag } }, select: { id: true } });
  if (already) return already;

  const accrual = (await getFeeAccounting(r.companyId)) === "ACCRUAL";
  const [debit, income] = await Promise.all([
    r.method === "CASH" ? ensureCashAccount(r.companyId) : ensureBankAccount(r.companyId),
    accrual ? ensureFeeReceivableAccount(r.companyId) : ensureFeeIncomeAccount(r.companyId), // the credit side
  ]);
  const issued = await prisma.voucher.findMany({ where: { companyId: r.companyId, voucherNo: { startsWith: "SFR-" } }, select: { voucherNo: true } });
  return prisma.voucher.create({
    data: {
      companyId: r.companyId,
      voucherNo: nextDocNo(issued, "voucherNo", "SFR-"),
      type: "CRV",
      date: r.paidAt,
      narration: `School fee ${r.receiptNo} — ${r.studentName} ${tag}`,
      entries: {
        create: [
          { companyId: r.companyId, accountId: debit.id, amount: r.amount },    // DR cash / bank
          { companyId: r.companyId, accountId: income.id, amount: -r.amount },  // CR fee income (cash) / fee receivable (accrual)
        ],
      },
    },
  });
}

/** Posts every receipt that has no voucher yet — used for payments taken before this existed. */
export async function syncSchoolFeeReceipts(companyId: string) {
  const payments = await prisma.schoolPayment.findMany({
    where: { companyId }, orderBy: { paidAt: "asc" },
    include: { invoice: { select: { student: { select: { name: true } } } } },
  });
  let posted = 0;
  for (const p of payments) {
    const tag = `[SCHPAY:${p.id}]`;
    const exists = await prisma.voucher.findFirst({ where: { companyId, narration: { contains: tag } }, select: { id: true } });
    if (exists) continue;
    await postSchoolFeeReceipt({ companyId, paymentId: p.id, receiptNo: p.receiptNo, studentName: p.invoice.student.name, amount: p.amount, method: p.method, paidAt: p.paidAt });
    posted++;
  }
  return { posted, total: payments.length };
}

// ─── Accrual: book what has been billed ──────────────────────────────────────

const payableOf = (i: { amount: number; discount: number; lateFee: number }) => Math.max(0, i.amount - i.discount + i.lateFee);

/**
 * Books billed-but-not-yet-booked fees:  DR Fee Receivable  CR School Fee Income.
 * Only the difference between what an invoice is worth now and what has been booked is posted,
 * so it is safe to call after every billing run, late fee or payment.
 * One voucher per billing period keeps the journal readable (a school can bill 1,000 invoices at once).
 */
export async function accrueInvoices(companyId: string, scope: { period?: string; invoiceIds?: string[]; all?: boolean }) {
  const invoices = await prisma.schoolFeeInvoice.findMany({
    where: { companyId, ...(scope.invoiceIds ? { id: { in: scope.invoiceIds } } : scope.period ? { period: scope.period } : {}) },
    select: { id: true, period: true, amount: true, discount: true, lateFee: true, accruedAmount: true, createdAt: true },
  });
  const groups = new Map<string, { delta: number; updates: { id: string; payable: number }[]; date: Date }>();
  for (const inv of invoices) {
    const payable = payableOf(inv);
    const delta = payable - inv.accruedAmount;
    if (Math.abs(delta) < 0.005) continue;
    const g = groups.get(inv.period) ?? { delta: 0, updates: [], date: scope.all ? inv.createdAt : new Date() };
    g.delta += delta; g.updates.push({ id: inv.id, payable });
    if (scope.all && inv.createdAt < g.date) g.date = inv.createdAt;
    groups.set(inv.period, g);
  }
  if (groups.size === 0) return { vouchers: 0, invoices: 0, amount: 0 };

  const [receivable, income] = await Promise.all([ensureFeeReceivableAccount(companyId), ensureFeeIncomeAccount(companyId)]);
  const issued = await prisma.voucher.findMany({ where: { companyId, voucherNo: { startsWith: "SFB-" } }, select: { voucherNo: true } });
  let vouchers = 0, count = 0, total = 0;

  for (const [period, g] of groups) {
    if (Math.abs(g.delta) < 0.005) continue;
    const voucherNo = nextDocNo(issued, "voucherNo", "SFB-");
    issued.push({ voucherNo });
    await prisma.$transaction([
      prisma.voucher.create({
        data: {
          companyId, voucherNo, type: "JV", date: g.date,
          narration: `School fee billing ${period} — ${g.updates.length} invoice(s) [SCHBILL:${period}]`,
          entries: { create: [
            { companyId, accountId: receivable.id, amount: g.delta },   // DR fee receivable (CR when a bill was reduced)
            { companyId, accountId: income.id, amount: -g.delta },      // CR school fee income
          ] },
        },
      }),
      // Invoices of the same class usually share one amount, so update them in a handful of statements, not one each.
      ...[...g.updates.reduce((m, u) => m.set(u.payable, [...(m.get(u.payable) ?? []), u.id]), new Map<number, string[]>())].map(([payable, ids]) =>
        prisma.schoolFeeInvoice.updateMany({ where: { id: { in: ids }, companyId }, data: { accruedAmount: payable } }),
      ),
    ]);
    vouchers++; count += g.updates.length; total += g.delta;
  }
  return { vouchers, invoices: count, amount: total };
}

/** Accrues only when the school has chosen accrual accounting; a no-op for cash schools. */
export async function accrueIfEnabled(companyId: string, scope: Parameters<typeof accrueInvoices>[1]) {
  if ((await getFeeAccounting(companyId)) !== "ACCRUAL") return null;
  return accrueInvoices(companyId, scope);
}

/**
 * Switches a cash-basis school to accrual. Safe to run again if it was interrupted.
 *  1. Receipts already posted credited Fee Income; they now credit Fee Receivable instead.
 *  2. Every invoice is booked: DR Fee Receivable  CR Fee Income.
 * Result: income = everything billed, receivable = billed − received, and income is not counted twice.
 */
export async function convertToAccrual(companyId: string) {
  const [income, receivable] = await Promise.all([ensureFeeIncomeAccount(companyId), ensureFeeReceivableAccount(companyId)]);
  const receipts = await prisma.voucher.findMany({ where: { companyId, narration: { contains: "[SCHPAY:" }, deletedAt: null }, select: { id: true } });
  await prisma.$transaction([
    prisma.voucherEntry.updateMany({ where: { companyId, voucherId: { in: receipts.map((v) => v.id) }, accountId: income.id }, data: { accountId: receivable.id } }),
    prisma.schoolSettings.upsert({ where: { companyId }, create: { companyId, feeAccounting: "ACCRUAL" }, update: { feeAccounting: "ACCRUAL" } }),
  ]);
  const booked = await accrueInvoices(companyId, { all: true });
  return { receiptsMoved: receipts.length, ...booked };
}
