import { prisma } from "@/lib/prisma";
import { computePayroll, money } from "@/lib/payrollCalc";

type AdvanceRecord = { id: string; amount: number; date: Date; monthYear: string | null; createdAt: Date };
type PayrollRecord = {
  monthYear: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  deductionReason: string | null;
  additionalCash: number;
  createdAt: Date;
};
type AttendanceRecord = { date: Date; status: string; checkIn: Date | null; checkOut: Date | null };

// Structural, so the read-only callers can pass the shared client straight in and
// the reconciler can pass its transaction client. Wrapping the reads in an
// interactive transaction just to satisfy a nominal type was timing out against
// the pooled connection (P2028) — reads never needed one.
type DbClient = {
  advanceSalary: { findMany(args: any): Promise<AdvanceRecord[]> };
  payroll:       { findMany(args: any): Promise<PayrollRecord[]> };
  employee:      { findFirst(args: any): Promise<any> };
  attendance:    { findMany(args: any): Promise<AttendanceRecord[]> };
};

export type AdvanceRecoveryRow = {
  advanceId: string;
  amount: number;
  recovered: number;
  balance: number;
  status: "DEDUCTED" | "PENDING";
};

export type MonthCarry = {
  monthYear: string;   // the payroll month this carry closes
  carryOut: number;    // rupees still owed going into the next month
};

export type EmployeeAdvanceState = {
  rows: AdvanceRecoveryRow[];
  carries: MonthCarry[];
};

function hasAdvanceReason(reason?: string | null) {
  return String(reason || "").toLowerCase().includes("advance");
}

function monthOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftHours(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return null;
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60; // shift crosses midnight
  return mins / 60;
}

/**
 * Attendance-driven deduction (absent + half-day, offset by OT) per payroll
 * month. This is the slice of a month's deduction that was never advance
 * recovery, so it must not be charged against an outstanding advance.
 */
async function attendanceDeductionByMonth(
  tx: DbClient,
  companyId: string,
  employeeId: string,
  salaryByMonth: Map<string, number>
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const months = [...salaryByMonth.keys()].sort();
  if (!months.length) return out;

  const employee = (await tx.employee.findFirst({
    where: { id: employeeId, companyId },
    select: { shiftStart: true, shiftEnd: true } as any,
  })) as any;
  const shiftLen = shiftHours(employee?.shiftStart, employee?.shiftEnd);

  const [y0, m0] = months[0].split("-").map(Number);
  const [y1, m1] = months[months.length - 1].split("-").map(Number);
  const rows = await tx.attendance.findMany({
    where: {
      companyId,
      employeeId,
      date: { gte: new Date(y0, m0 - 1, 1), lt: new Date(y1, m1, 1) },
    },
    select: { date: true, status: true, checkIn: true, checkOut: true },
    orderBy: { date: "asc" },
  });

  const byMonth = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = monthOf(row.date);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(row);
    else byMonth.set(key, [row]);
  }

  for (const month of months) {
    const computed = computePayroll({
      employeeId,
      monthYear: month,
      baseSalary: salaryByMonth.get(month) || 0,
      attendance: byMonth.get(month) || [],
      rates: shiftLen && shiftLen > 0 && shiftLen <= 24 ? { standardHoursPerDay: shiftLen } : undefined,
    });
    out.set(month, computed.breakdown.netDeduction);
  }
  return out;
}

/**
 * Replays every payroll month in order to work out how much of each advance has
 * genuinely been recovered from salary, plus the balance the employee carries
 * into the following month.
 *
 * Three rules keep the two debts separate so the payroll screen can show them as
 * distinct lines (Prev Bal + Advance + Absent) instead of one blended number:
 *
 * 1. A payroll row may only recover advances that already existed when it was
 *    entered (or that explicitly target that month or earlier). Without this an
 *    older month's deduction silently ate an advance taken weeks later.
 * 2. The advance-recoverable slice of a deduction is the deduction minus the
 *    parts that were never advance recovery — this month's attendance deduction
 *    and the balance carried in from last month.
 * 3. Cash paid beyond what the month actually earned is NOT advance debt. It is
 *    the month's closing balance and carries forward on its own; folding it into
 *    an advance balance is what made the two amounts collapse into one.
 */
async function computeEmployeeAdvanceState(
  tx: DbClient,
  companyId: string,
  employeeId: string
): Promise<EmployeeAdvanceState> {
  const advances = await tx.advanceSalary.findMany({
    where: { companyId, employeeId, deletedAt: null },
    select: { id: true, amount: true, date: true, monthYear: true, createdAt: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const rows = advances.map((advance) => ({
    advanceId: advance.id,
    amount: money(advance.amount || 0),
    recovered: 0,
    balance: money(advance.amount || 0),
    targetMonth: advance.monthYear || null,
    createdAt: advance.createdAt,
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
      createdAt: true,
    },
    orderBy: { monthYear: "asc" },
  });

  if (!payrolls.length) return { rows: rows.map(finalizeRow), carries: [] };

  const salaryByMonth = new Map<string, number>(
    payrolls.map((payroll) => [payroll.monthYear, Number(payroll.baseSalary || 0)])
  );
  const attendanceDeduction = await attendanceDeductionByMonth(tx, companyId, employeeId, salaryByMonth);

  const carries: MonthCarry[] = [];
  let carryIn = 0;

  for (const payroll of payrolls) {
    const grossSalary = money(Number(payroll.baseSalary || 0) + Number(payroll.allowances || 0));
    const deductions  = money(payroll.deductions || 0);
    const cashPaid    = money(payroll.additionalCash || 0);

    // Slice the deduction: attendance + last month's balance first, advance last.
    const nonAdvanceDeduction = Math.min(
      deductions,
      money(attendanceDeduction.get(payroll.monthYear) || 0) + carryIn
    );
    let advanceIntent = hasAdvanceReason(payroll.deductionReason)
      ? Math.max(0, deductions - nonAdvanceDeduction)
      : 0;

    let advanceShortfall = 0;

    if (advanceIntent > 0) {
      const eligible = rows.filter((row) =>
        row.balance > 0 &&
        // Rule 1 — on the books when this payroll was entered, or explicitly
        // targeted at this month or an earlier one.
        ((row.targetMonth !== null && row.targetMonth <= payroll.monthYear) ||
          row.createdAt.getTime() <= payroll.createdAt.getTime())
      );

      const allocations: Array<{ advanceId: string; allocated: number }> = [];
      for (const row of eligible) {
        if (advanceIntent <= 0) break;
        const allocated = Math.min(row.balance, advanceIntent);
        row.balance -= allocated;
        advanceIntent -= allocated;
        allocations.push({ advanceId: row.advanceId, allocated });
      }

      // An advance can only be recovered out of salary that actually exists.
      let salaryAvailable = Math.max(0, grossSalary - nonAdvanceDeduction);
      for (const allocation of allocations) {
        const row = rows.find((candidate) => candidate.advanceId === allocation.advanceId);
        if (!row) continue;
        const recoveredNow = Math.min(allocation.allocated, salaryAvailable);
        salaryAvailable -= recoveredNow;
        row.recovered += recoveredNow;

        // Whatever the salary could not cover stays outstanding on the advance.
        const notRecovered = allocation.allocated - recoveredNow;
        row.balance += notRecovered;
        advanceShortfall += notRecovered;
      }
    }

    // Closing balance for the month. The slice already held on an advance
    // balance (advanceShortfall) is excluded so it is never counted twice.
    carryIn = Math.max(0, money(deductions + cashPaid - grossSalary - advanceShortfall));
    carries.push({ monthYear: payroll.monthYear, carryOut: carryIn });
  }

  return { rows: rows.map(finalizeRow), carries };
}

function finalizeRow(row: {
  advanceId: string;
  amount: number;
  recovered: number;
  balance: number;
}): AdvanceRecoveryRow {
  const recovered = money(Math.min(row.amount, Math.max(0, row.recovered)));
  const balance = money(Math.max(0, row.balance));
  return {
    advanceId: row.advanceId,
    amount: row.amount,
    recovered,
    balance,
    status: balance <= 0 ? "DEDUCTED" : "PENDING",
  };
}

/** Balance owed coming *into* `monthYear`, taken from the latest earlier payroll month. */
export function carryIntoMonth(carries: MonthCarry[], monthYear: string): number {
  let carry = 0;
  for (const row of carries) {
    if (row.monthYear >= monthYear) break;
    carry = row.carryOut;
  }
  return carry;
}

/** Read-only view of an employee's advance balances and month-end carry-forwards. */
export async function getEmployeeAdvanceState(
  companyId: string,
  employeeId: string
): Promise<EmployeeAdvanceState> {
  return prisma.$transaction((tx) => computeEmployeeAdvanceState(tx, companyId, employeeId));
}

export async function getEmployeeCarryForward(
  companyId: string,
  employeeId: string,
  monthYear: string
): Promise<number> {
  const state = await prisma.$transaction((tx) => computeEmployeeAdvanceState(tx, companyId, employeeId));
  return carryIntoMonth(state.carries, monthYear);
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
    const { rows } = await computeEmployeeAdvanceState(tx, companyId, employeeId);
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
