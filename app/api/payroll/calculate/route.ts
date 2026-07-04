import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { computePayroll, DEFAULT_RATES, type PayrollRates } from "@/lib/payrollCalc";

// GET /api/payroll/calculate?employeeId=X&monthYear=YYYY-MM[&workingDays=N&otHours=8&otMultiplier=1.5]
// Reads attendance for the given month and returns suggested payroll numbers.
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") || "";
    const monthYear  = searchParams.get("monthYear")  || "";

    if (!employeeId || !/^\d{4}-\d{2}$/.test(monthYear)) {
      return NextResponse.json({ error: "employeeId and monthYear (YYYY-MM) required" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true, firstName: true, lastName: true, salary: true, shiftStart: true, shiftEnd: true } as any,
    }) as any;
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    // Derive the "one day" length from the employee's own shift.
    // e.g. shift 09:00–18:00 = 9 hours. Anything worked beyond that = OT.
    function shiftHours(start?: string | null, end?: string | null): number | null {
      if (!start || !end) return null;
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      if ([sh, sm, eh, em].some(n => !Number.isFinite(n))) return null;
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60; // shift crosses midnight (e.g. 22:00–06:00)
      return mins / 60;
    }
    const shiftLen = shiftHours(employee.shiftStart, employee.shiftEnd);

    const [y, m] = monthYear.split("-").map(Number);
    const start  = new Date(y, m - 1, 1, 0, 0, 0);
    const end    = new Date(y, m,     1, 0, 0, 0);

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId,
        companyId,
        date: { gte: start, lt: end },
      },
      select: { date: true, status: true, checkIn: true, checkOut: true },
      orderBy: { date: "asc" },
    });

    const rates: Partial<PayrollRates> = {};
    const wd = Number(searchParams.get("workingDays"));
    const std = Number(searchParams.get("standardHours"));
    const mult = Number(searchParams.get("otMultiplier"));
    if (Number.isFinite(wd) && wd > 0) rates.workingDaysPerMonth = wd;
    if (Number.isFinite(std) && std > 0) rates.standardHoursPerDay = std;
    if (Number.isFinite(mult) && mult > 0) rates.otMultiplier = mult;

    const computed = computePayroll({
      employeeId,
      monthYear,
      baseSalary: employee.salary || 0,
      attendance: attendance.map(a => ({
        date: a.date,
        status: a.status,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
      })),
      rates,
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
        baseSalary: employee.salary || 0,
      },
      defaults: DEFAULT_RATES,
      ...computed,
    });
  } catch (e: any) {
    console.error("Payroll calculate error:", e?.message || e);
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
