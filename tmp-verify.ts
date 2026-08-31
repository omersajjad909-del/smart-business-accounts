import { prisma } from "@/lib/prisma";
import { getEmployeeAdvanceState, getEmployeeCarryForward } from "@/lib/payrollAdvanceRecovery";
import { computePayroll } from "@/lib/payrollCalc";

async function main() {
  const emps = await prisma.employee.findMany({
    where: { isActive: true, companyId: "9806c891-d1bd-4ff5-93b5-2665ca576540" },
    select: { id: true, employeeId: true, firstName: true, lastName: true, salary: true, companyId: true },
    orderBy: { employeeId: "asc" },
  });

  for (const e of emps) {
    if (!e.companyId) continue;
    const rows = (await getEmployeeAdvanceState(e.companyId, e.id)).rows;
    const advTotal = rows.filter(r => r.balance > 0).reduce((s, r) => s + r.balance, 0);
    const carry = await getEmployeeCarryForward(e.companyId, e.id, "2026-08");

    const att = await prisma.attendance.findMany({
      where: { employeeId: e.id, companyId: e.companyId, date: { gte: new Date(2026, 7, 1), lt: new Date(2026, 8, 1) } },
      select: { date: true, status: true, checkIn: true, checkOut: true },
    });
    const calc = computePayroll({ employeeId: e.id, monthYear: "2026-08", baseSalary: e.salary || 0, attendance: att });

    console.log(
      `${e.employeeId} ${e.firstName} ${e.lastName || ""}`.padEnd(28),
      "| advance:", String(advTotal).padStart(7),
      "| prevBal:", String(carry).padStart(7),
      "| attendance:", String(calc.breakdown.netDeduction).padStart(6),
      "| TOTAL DEDUCTION:", String(advTotal + carry + calc.breakdown.netDeduction).padStart(8)
    );
    for (const r of rows) {
      console.log(`      advance ${r.advanceId.slice(0, 8)} amount=${r.amount} recovered=${r.recovered} balance=${r.balance} ${r.status}`);
    }
  }
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
