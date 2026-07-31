import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PayrollAdvanceTx = Prisma.TransactionClient;

export type AdvanceRecoveryRow = {
  advanceId: string;
  amount: number;
  recovered: number;
  balance: number;
  status: "DEDUCTED" | "PENDING";
};

function hasAdvanceReason(reason?: string | null) {
  return String(reason || "").toLowerCase().includes("advance");
}

async function calculateEmployeeAdvanceRecoveryRows(
  tx: PayrollAdvanceTx,
  companyId: string,
  employeeId: string
): Promise<AdvanceRecoveryRow[]> {
  const advances = await tx.advanceSalary.findMany({
    where: { companyId, employeeId, deletedAt: null },
    select: { id: true, amount: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  if (!advances.length) return [];

  const rows = advances.map((advance) => ({
    advanceId: advance.id,
    amount: Number(advance.amount || 0),
    recovered: 0,
    balance: Number(advance.amount || 0),
    status: "PENDING" as const,
  }));

  const payrolls = await tx.payroll.findMany({
    where: { companyId, employeeId },
    select: {
      monthYear: true,
      baseSalary: true,
      allowances: true,
      deductions: true,
      deductionReason: true,
      additionalCash: true,
    },
    orderBy: { monthYear: "asc" },
  });

  for (const payroll of payrolls) {
    if (!hasAdvanceReason(payroll.deductionReason)) continue;

    const grossSalary = Number(payroll.baseSalary || 0) + Number(payroll.allowances || 0);
    let remainingDeductionIntent = Number(payroll.deductions || 0);
    if (remainingDeductionIntent <= 0) continue;

    const affectedRows: AdvanceRecoveryRow[] = [];
    for (const row of rows) {
      if (remainingDeductionIntent <= 0) break;
      if (row.balance <= 0) continue;

      const allocated = Math.min(row.balance, remainingDeductionIntent);
      row.balance -= allocated;
      affectedRows.push({ ...row, balance: allocated });
      remainingDeductionIntent -= allocated;
    }

    const intendedAdvanceDeduction = affectedRows.reduce((sum, row) => sum + row.balance, 0);
    if (intendedAdvanceDeduction <= 0) continue;

    const nonAdvanceDeduction = Math.max(0, Number(payroll.deductions || 0) - intendedAdvanceDeduction);
    let salaryAvailableForAdvance = Math.max(0, grossSalary - nonAdvanceDeduction);

    for (const affected of affectedRows) {
      const row = rows.find((candidate) => candidate.advanceId === affected.advanceId);
      if (!row) continue;

      const recoveredNow = Math.min(affected.balance, salaryAvailableForAdvance);
      row.recovered += recoveredNow;
      salaryAvailableForAdvance -= recoveredNow;

      const notRecoveredFromSalary = affected.balance - recoveredNow;
      row.balance += notRecoveredFromSalary;
    }

    // Extra cash only becomes new debt when it exceeds what the employee actually
    // earned this month (netSalary). Paying out exactly what they're owed — even
    // after an advance deduction fully cleared — is a normal settlement, not a
    // fresh loan, and must not resurrect an already-recovered advance.
    const netSalary = grossSalary - Number(payroll.deductions || 0);
    const entitlement = Math.max(0, netSalary);
    let extraCashCarry = Math.max(0, Number(payroll.additionalCash || 0) - entitlement);
    for (let index = affectedRows.length - 1; index >= 0 && extraCashCarry > 0; index--) {
      const row = rows.find((candidate) => candidate.advanceId === affectedRows[index].advanceId);
      if (!row) continue;
      row.balance += extraCashCarry;
      extraCashCarry = 0;
    }
  }

  return rows.map((row) => {
    const recovered = Math.min(row.amount, Math.max(0, row.recovered));
    const balance = Math.max(0, row.balance);
    return {
      ...row,
      recovered,
      balance,
      status: balance <= 0.01 ? "DEDUCTED" : "PENDING",
    };
  });
}

// Reconciling and reading were previously two separate transactions that each
// recomputed the same rows from scratch — every advance list request paid for
// the recovery calculation twice. reconcile now returns the rows it already
// computed so callers never need a second pass.
export async function reconcileEmployeeAdvanceRecoveries(
  companyId: string,
  employeeId: string
): Promise<AdvanceRecoveryRow[]> {
  return prisma.$transaction(async (tx) => {
    const rows = await calculateEmployeeAdvanceRecoveryRows(tx, companyId, employeeId);
    if (!rows.length) return rows;

    await tx.advanceSalary.updateMany({
      where: { companyId, employeeId, deletedAt: null, status: "DEDUCTED" },
      data: { status: "PENDING" },
    });

    const deductedIds = rows
      .filter((row) => row.status === "DEDUCTED")
      .map((row) => row.advanceId);

    if (deductedIds.length) {
      await tx.advanceSalary.updateMany({
        where: { companyId, employeeId, id: { in: deductedIds } },
        data: { status: "DEDUCTED" },
      });
    }
    return rows;
  });
}

export async function reconcileAdvanceRecoveries(
  companyId: string,
  employeeId?: string | null
): Promise<AdvanceRecoveryRow[]> {
  if (employeeId) {
    return reconcileEmployeeAdvanceRecoveries(companyId, employeeId);
  }

  const employees = await prisma.advanceSalary.findMany({
    where: { companyId, deletedAt: null },
    select: { employeeId: true },
    distinct: ["employeeId"],
  });

  // Each employee's reconciliation is independent — run them concurrently
  // instead of one sequential round trip per employee.
  const rowsByEmployee = await Promise.all(
    employees.map((advance) => reconcileEmployeeAdvanceRecoveries(companyId, advance.employeeId))
  );
  return rowsByEmployee.flat();
}
