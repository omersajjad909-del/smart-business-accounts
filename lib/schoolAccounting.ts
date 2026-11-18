import { prisma } from "@/lib/prisma";
import { nextDocNo } from "@/lib/docNumber";
import { ensureCashAccount } from "@/lib/payrollAccounting";

// ─── School fee → general ledger ─────────────────────────────────────────────
// Cash basis: a fee is income on the day it is received. Each receipt posts one
// voucher:   DR Cash / Bank   CR School Fee Income
// The voucher carries a [SCHPAY:<paymentId>] tag so posting is idempotent and a
// receipt can always be traced back from the ledger.

const FEE_INCOME_CODE = "SCH-FEE";

async function ensureFeeIncomeAccount(companyId: string) {
  const existing = await prisma.account.findFirst({ where: { companyId, code: FEE_INCOME_CODE } });
  if (existing) return existing;
  return prisma.account.create({ data: { companyId, code: FEE_INCOME_CODE, name: "School Fee Income", type: "INCOME" } });
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

  const [debit, income] = await Promise.all([
    r.method === "CASH" ? ensureCashAccount(r.companyId) : ensureBankAccount(r.companyId),
    ensureFeeIncomeAccount(r.companyId),
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
          { companyId: r.companyId, accountId: income.id, amount: -r.amount },  // CR fee income
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
