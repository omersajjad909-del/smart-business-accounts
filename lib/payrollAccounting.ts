import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ─── Account ensure helpers ──────────────────────────────────────────────────
// Each helper is idempotent — safe to call any number of times.

async function nextVoucherNo(companyId: string, type: string) {
  const count = await prisma.voucher.count({ where: { companyId, type } });
  return `${type}-${String(count + 1).padStart(4, "0")}`;
}

async function findOrCreateAccount(params: {
  companyId: string;
  code: string;
  name: string;
  type: string;
  parentId?: string | null;
}) {
  const existing = await prisma.account.findFirst({
    where: { companyId: params.companyId, code: params.code },
  });
  if (existing) return existing;
  return prisma.account.create({
    data: {
      companyId: params.companyId,
      code:      params.code,
      name:      params.name,
      type:      params.type,
      parentId:  params.parentId || null,
    },
  });
}

export async function ensureSalaryExpenseAccount(companyId: string) {
  // Try to find an existing "Salary" expense account
  const existing = await prisma.account.findFirst({
    where: {
      companyId,
      type: "EXPENSE",
      name: { contains: "Salary", mode: "insensitive" },
    },
  });
  if (existing) return existing;
  return findOrCreateAccount({
    companyId,
    code: "SAL-EXP",
    name: "Salaries & Wages",
    type: "EXPENSE",
  });
}

export async function ensureCashAccount(companyId: string) {
  const existing = await prisma.account.findFirst({
    where: {
      companyId,
      type: "ASSET",
      name: { contains: "Cash", mode: "insensitive" },
    },
  });
  if (existing) return existing;
  return findOrCreateAccount({
    companyId,
    code: "CASH",
    name: "Cash in Hand",
    type: "ASSET",
  });
}

export async function ensureSalariesPayableParent(companyId: string) {
  return findOrCreateAccount({
    companyId,
    code: "SAL-PAY",
    name: "Salaries Payable",
    type: "LIABILITY",
  });
}

/**
 * Ensures the given employee has a dedicated payable account under
 * "Salaries Payable". Returns the account id and sets it on the Employee
 * record if not already linked.
 */
export async function ensureEmployeePayableAccount(params: {
  companyId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
}): Promise<string> {
  const emp = await prisma.employee.findFirst({
    where: { id: params.employeeId, companyId: params.companyId },
    select: { accountId: true },
  });
  if (emp?.accountId) {
    // Verify it still exists (not deleted)
    const still = await prisma.account.findFirst({ where: { id: emp.accountId, companyId: params.companyId } });
    if (still) return still.id;
  }

  const parent = await ensureSalariesPayableParent(params.companyId);
  const code   = `SALP-${params.employeeCode}`;
  const acc    = await findOrCreateAccount({
    companyId: params.companyId,
    code,
    name: `${params.employeeName} — Salary Payable`,
    type: "LIABILITY",
    parentId: parent.id,
  });

  // Link back to the Employee record
  await prisma.employee.update({
    where: { id: params.employeeId },
    data:  { accountId: acc.id },
  });
  return acc.id;
}

// ─── Voucher creators ─────────────────────────────────────────────────────────

/**
 * Salary accrual JV — booked when payroll record is created.
 *   DR: Salaries & Wages (expense)
 *   CR: <Employee> Salary Payable (liability)
 * Idempotent per payrollId via narration tag.
 */
export async function createPayrollAccrualJV(params: {
  companyId: string;
  payrollId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  monthYear: string;
  grossPay: number; // baseSalary + allowances - deductions (= netSalary)
  date?: Date;
}) {
  if (params.grossPay <= 0) return null;

  const tag = `[PAYROLL:${params.payrollId}]`;
  const already = await prisma.voucher.findFirst({
    where: { companyId: params.companyId, type: "JV", narration: { contains: tag } },
    select: { id: true },
  });
  if (already) return already;

  const [expAcc, payAccId] = await Promise.all([
    ensureSalaryExpenseAccount(params.companyId),
    ensureEmployeePayableAccount({
      companyId: params.companyId,
      employeeId: params.employeeId,
      employeeCode: params.employeeCode,
      employeeName: params.employeeName,
    }),
  ]);

  const voucherNo = await nextVoucherNo(params.companyId, "JV");
  return prisma.voucher.create({
    data: {
      companyId: params.companyId,
      voucherNo,
      type: "JV",
      date: params.date || new Date(),
      narration: `Salary accrual for ${params.employeeName} — ${params.monthYear} ${tag}`,
      entries: {
        create: [
          { companyId: params.companyId, accountId: expAcc.id, amount: params.grossPay },   // DR expense
          { companyId: params.companyId, accountId: payAccId,  amount: -params.grossPay },  // CR employee payable
        ],
      },
    },
  });
}

/**
 * Salary payment CPV — booked when payroll is marked PAID.
 *   DR: <Employee> Salary Payable (clears liability)
 *   CR: Cash (money out)
 * Idempotent per payrollId.
 */
export async function createPayrollPaymentCPV(params: {
  companyId: string;
  payrollId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  amount: number;
  monthYear: string;
  date?: Date;
}) {
  if (params.amount <= 0) return null;

  const tag = `[PAYMENT:${params.payrollId}]`;
  const already = await prisma.voucher.findFirst({
    where: { companyId: params.companyId, type: "CPV", narration: { contains: tag } },
    select: { id: true },
  });
  if (already) return already;

  const [cashAcc, payAccId] = await Promise.all([
    ensureCashAccount(params.companyId),
    ensureEmployeePayableAccount({
      companyId: params.companyId,
      employeeId: params.employeeId,
      employeeCode: params.employeeCode,
      employeeName: params.employeeName,
    }),
  ]);

  const voucherNo = await nextVoucherNo(params.companyId, "CPV");
  return prisma.voucher.create({
    data: {
      companyId: params.companyId,
      voucherNo,
      type: "CPV",
      date: params.date || new Date(),
      narration: `Salary payment to ${params.employeeName} — ${params.monthYear} ${tag}`,
      entries: {
        create: [
          { companyId: params.companyId, accountId: payAccId,  amount: params.amount },    // DR payable (clear)
          { companyId: params.companyId, accountId: cashAcc.id, amount: -params.amount },  // CR cash
        ],
      },
    },
  });
}

/**
 * Advance salary voucher — booked when advance is given to employee.
 *   DR: <Employee> Salary Payable (increases what we still owe them minus the advance)
 *   CR: Cash
 * Idempotent per advanceId.
 */
export async function createAdvanceSalaryVoucher(params: {
  companyId: string;
  advanceId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  amount: number;
  date?: Date;
}) {
  if (params.amount <= 0) return null;

  const tag = `[ADVANCE:${params.advanceId}]`;
  const already = await prisma.voucher.findFirst({
    where: { companyId: params.companyId, type: "CPV", narration: { contains: tag } },
    select: { id: true },
  });
  if (already) return already;

  const [cashAcc, payAccId] = await Promise.all([
    ensureCashAccount(params.companyId),
    ensureEmployeePayableAccount({
      companyId: params.companyId,
      employeeId: params.employeeId,
      employeeCode: params.employeeCode,
      employeeName: params.employeeName,
    }),
  ]);

  const voucherNo = await nextVoucherNo(params.companyId, "CPV");
  return prisma.voucher.create({
    data: {
      companyId: params.companyId,
      voucherNo,
      type: "CPV",
      date: params.date || new Date(),
      narration: `Advance salary to ${params.employeeName} ${tag}`,
      entries: {
        create: [
          { companyId: params.companyId, accountId: payAccId,  amount: params.amount },    // DR payable
          { companyId: params.companyId, accountId: cashAcc.id, amount: -params.amount },  // CR cash
        ],
      },
    },
  });
}

/**
 * Reverse (delete) any voucher previously created with the given tag.
 * Used when payroll/advance/payment is deleted or reverted so the GL
 * doesn't leave stale entries.
 */
export async function deleteVoucherByTag(companyId: string, tag: string) {
  const vouchers = await prisma.voucher.findMany({
    where: { companyId, narration: { contains: tag } },
    select: { id: true },
  });
  if (vouchers.length === 0) return;
  const ids = vouchers.map(v => v.id);
  await prisma.voucherEntry.deleteMany({ where: { voucherId: { in: ids }, companyId } });
  await prisma.voucher.deleteMany({ where: { id: { in: ids }, companyId } });
}
