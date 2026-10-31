// Payroll calculation helpers — turn a month of attendance rows into
// suggested salary numbers (deduction from absences + overtime credit).

export type PayrollRates = {
  workingDaysPerMonth: number;   // e.g. 30 (calendar) or 26 (excl. Sundays)
  standardHoursPerDay: number;   // e.g. 8
  otMultiplier: number;          // e.g. 1.5
};

export const DEFAULT_RATES: PayrollRates = {
  workingDaysPerMonth: 30,
  standardHoursPerDay: 8,
  otMultiplier: 1.5,
};

export type AttendanceRow = {
  date: Date;
  status: string; // PRESENT | ABSENT | HALF_DAY | LEAVE | LATE | HOLIDAY
  checkIn: Date | null;
  checkOut: Date | null;
};

export type PayrollComputed = {
  employeeId: string;
  monthYear: string;                  // "YYYY-MM"
  baseSalary: number;

  counts: {
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    late: number;
    holiday: number;
    unmarked: number;                 // days in month with no attendance row
    totalDays: number;                // calendar days in the month
  };

  overtime: {
    totalHours: number;               // rounded to 2 decimals
    daysWithOT: number;
  };

  rates: {
    perDay: number;                   // baseSalary / workingDaysPerMonth
    perHour: number;                  // perDay / standardHoursPerDay
    otMultiplier: number;
    workingDaysPerMonth: number;
    standardHoursPerDay: number;
  };

  breakdown: {
    creditedDays: number;             // paid attendance days (half-days count as 0.5)
    earnedBasicSalary: number;        // monthly base prorated to credited attendance
    absentDeduction: number;          // absent × perDay
    halfDayDeduction: number;         // halfDay × perDay/2
    grossDeduction: number;           // absent + halfDay
    otCredit: number;                 // OT hours × perHour × otMultiplier
    netDeduction: number;             // max(0, gross - OT credit)
    otAllowance: number;              // max(0, OT credit - gross)
    suggestedAllowances: number;      // = otAllowance (can extend later)
    suggestedDeductions: number;      // = netDeduction
    suggestedNetSalary: number;       // baseSalary + allowances - deductions
    reasonText: string;               // human-readable summary for deductionReason
  };
};

function daysInCalendarMonth(monthYear: string): number {
  const [y, m] = monthYear.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function otHoursForDay(
  row: AttendanceRow,
  standardHoursPerDay: number
): number {
  if (!row.checkIn || !row.checkOut) return 0;
  const worked = (row.checkOut.getTime() - row.checkIn.getTime()) / 3600000;
  if (worked <= 0) return 0;
  const ot = worked - standardHoursPerDay;
  return ot > 0 ? Math.round(ot * 100) / 100 : 0;
}

export function computePayroll(params: {
  employeeId: string;
  monthYear: string;
  baseSalary: number;
  attendance: AttendanceRow[];
  rates?: Partial<PayrollRates>;
  weeklyOffDays?: number[];          // 0 = Sunday; defaults to Sunday only
}): PayrollComputed {
  const rates: PayrollRates = { ...DEFAULT_RATES, ...(params.rates || {}) };
  const totalDays = daysInCalendarMonth(params.monthYear);

  const counts = {
    present: 0, absent: 0, halfDay: 0, leave: 0,
    late: 0, holiday: 0, unmarked: 0, totalDays,
  };

  let otTotal = 0;
  let daysWithOT = 0;

  for (const row of params.attendance) {
    const s = String(row.status || "").toUpperCase();
    if (s === "PRESENT")   counts.present++;
    else if (s === "ABSENT")   counts.absent++;
    else if (s === "HALF_DAY") counts.halfDay++;
    else if (s === "LEAVE")    counts.leave++;
    else if (s === "LATE")     counts.late++;
    else if (s === "HOLIDAY")  counts.holiday++;

    // Overtime is only counted on days that were actually worked
    if (s === "PRESENT" || s === "HALF_DAY" || s === "LATE") {
      const ot = otHoursForDay(row, rates.standardHoursPerDay);
      if (ot > 0) {
        otTotal += ot;
        daysWithOT++;
      }
    }
  }

  const accountedFor =
    counts.present + counts.absent + counts.halfDay +
    counts.leave   + counts.late   + counts.holiday;
  counts.unmarked = Math.max(0, totalDays - accountedFor);

  const perDay  = params.baseSalary / rates.workingDaysPerMonth;
  const perHour = perDay / rates.standardHoursPerDay;

  otTotal = Math.round(otTotal * 100) / 100;

  // Every rupee figure is rounded to whole rupees. Payroll is settled in notes,
  // not paisas, and the fractional tails were leaking into deductions and the
  // carry-forward balance (a 999.67 that should simply read 1,000).
  const absentDeduction  = money(counts.absent   * perDay);
  const halfDayDeduction = money(counts.halfDay  * perDay / 2);
  const grossDeduction   = money(absentDeduction + halfDayDeduction);
  const otCredit         = money(otTotal * perHour * rates.otMultiplier);

  // Absences reduce earned days above, so do not deduct their value again.
  const netDeduction  = 0;
  const otAllowance   = otCredit;

  // Salary is a monthly figure: start from the full base and take off only the
  // days that were not worked. Weekly-off days (Sunday by default) with no
  // attendance row are paid rest days, so they are not lost; any other day with
  // no row at all earns nothing. Absences and half-days come off as before.
  const [yy, mm] = params.monthYear.split("-").map(Number);
  const weeklyOff = params.weeklyOffDays ?? [0];
  const marked = new Set(params.attendance.map(r => r.date.getDate()));
  let unpaidUnmarked = 0;
  for (let d = 1; d <= totalDays; d++) {
    if (!marked.has(d) && !weeklyOff.includes(new Date(yy, mm - 1, d).getDay())) unpaidUnmarked++;
  }
  const creditedDays = Math.max(0, workingDaysCredit(rates.workingDaysPerMonth, counts, unpaidUnmarked));
  const earnedBasicSalary = Math.max(0, money(params.baseSalary - grossDeduction - unpaidUnmarked * perDay));
  const suggestedNetSalary = money(earnedBasicSalary + otAllowance - netDeduction);

  const reasonBits: string[] = [];
  if (counts.absent)  reasonBits.push(`${counts.absent} absent (Rs. ${fmt(absentDeduction)})`);
  if (counts.halfDay) reasonBits.push(`${counts.halfDay} half-day (Rs. ${fmt(halfDayDeduction)})`);
  if (otTotal > 0)    reasonBits.push(`${otTotal}h OT (Rs. ${fmt(otCredit)})`);
  let reasonText = reasonBits.join(" + ");
  if (grossDeduction > 0) {
    reasonText += ` → unpaid days excluded from earned salary`;
  }
  if (otTotal > 0) {
    reasonText += `${grossDeduction > 0 ? "; " : " → "}OT allowance Rs. ${fmt(otAllowance)}`;
  } else {
    reasonText = "Full attendance — no deduction, no OT.";
  }

  return {
    employeeId: params.employeeId,
    monthYear:  params.monthYear,
    baseSalary: params.baseSalary,
    counts,
    overtime: { totalHours: otTotal, daysWithOT },
    rates: {
      perDay: money(perDay),
      perHour: round2(perHour),
      otMultiplier: rates.otMultiplier,
      workingDaysPerMonth: rates.workingDaysPerMonth,
      standardHoursPerDay: rates.standardHoursPerDay,
    },
    breakdown: {
      creditedDays,
      earnedBasicSalary,
      absentDeduction,
      halfDayDeduction,
      grossDeduction,
      otCredit,
      netDeduction,
      otAllowance,
      suggestedAllowances: otAllowance,
      suggestedDeductions: netDeduction,
      suggestedNetSalary,
      reasonText,
    },
  };
}

function workingDaysCredit(
  workingDays: number,
  counts: { absent: number; halfDay: number },
  unpaidUnmarked: number,
) {
  return workingDays - counts.absent - counts.halfDay / 2 - unpaidUnmarked;
}

function round2(n: number) { return Math.round(n * 100) / 100; }
/** Payroll money is always whole rupees. */
export function money(n: number) { return Math.round(Number(n) || 0); }
function fmt(n: number) {
  return money(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}
