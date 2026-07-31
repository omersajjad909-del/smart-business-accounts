import { prisma } from "@/lib/prisma";

function monthEnd(monthYear: string) {
  const [year, month] = monthYear.split("-").map(Number);
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function advanceAppliesToPayroll(advance: { date: Date; monthYear?: string | null }, payrollMonth: string) {
  if (advance.monthYear) return advance.monthYear <= payrollMonth;
  return advance.date <= monthEnd(payrollMonth);
}

export async function reconcileEmployeeAdvanceRecoveries(companyId: string, employeeId: string) {
  await prisma.$transaction(async (tx) => {
    const advances = await tx.advanceSalary.findMany({
      where: { companyId, employeeId, deletedAt: null },
      select: { id: true, amount: true, date: true, monthYear: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    if (!advances.length) return;

    const payrolls = await tx.payroll.findMany({
      where: { companyId, employeeId },
      select: { monthYear: true, deductions: true, deductionReason: true },
      orderBy: { monthYear: "asc" },
    });

    const deductedAdvanceIds = new Set<string>();

    for (const payroll of payrolls) {
      const reason = String(payroll.deductionReason || "").toLowerCase();
      if (!reason.includes("advance")) continue;

      let remainingAdvanceDeduction = Number(payroll.deductions || 0);
      if (remainingAdvanceDeduction <= 0) continue;

      for (const advance of advances) {
        if (deductedAdvanceIds.has(advance.id)) continue;
        if (!advanceAppliesToPayroll(advance, payroll.monthYear)) continue;

        const amount = Number(advance.amount || 0);
        if (amount > 0 && remainingAdvanceDeduction + 0.01 >= amount) {
          deductedAdvanceIds.add(advance.id);
          remainingAdvanceDeduction -= amount;
        }
      }
    }

    await tx.advanceSalary.updateMany({
      where: { companyId, employeeId, deletedAt: null, status: "DEDUCTED" },
      data: { status: "PENDING" },
    });

    if (deductedAdvanceIds.size) {
      await tx.advanceSalary.updateMany({
        where: { companyId, employeeId, id: { in: Array.from(deductedAdvanceIds) } },
        data: { status: "DEDUCTED" },
      });
    }
  });
}

export async function reconcileAdvanceRecoveries(companyId: string, employeeId?: string | null) {
  if (employeeId) {
    await reconcileEmployeeAdvanceRecoveries(companyId, employeeId);
    return;
  }

  const pendingEmployees = await prisma.advanceSalary.findMany({
    where: { companyId, deletedAt: null },
    select: { employeeId: true },
    distinct: ["employeeId"],
  });

  for (const advance of pendingEmployees) {
    await reconcileEmployeeAdvanceRecoveries(companyId, advance.employeeId);
  }
}
