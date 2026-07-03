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

  const absentDeduction  = round2(counts.absent   * perDay);
  const halfDayDeduction = round2(counts.halfDay  * perDay / 2);
  const grossDeduction   = round2(absentDeduction + halfDayDeduction);
  const otCredit         = round2(otTotal * perHour * rates.otMultiplier);

  const netDeduction  = round2(Math.max(0, grossDeduction - otCredit));
  const otAllowance   = round2(Math.max(0, otCredit       - grossDeduction));

  const suggestedNetSalary = round2(params.baseSalary + otAllowance - netDeduction);

  const reasonBits: string[] = [];
  if (counts.absent)  reasonBits.push(`${counts.absent} absent (Rs. ${fmt(absentDeduction)})`);
  if (counts.halfDay) reasonBits.push(`${counts.halfDay} half-day (Rs. ${fmt(halfDayDeduction)})`);
  if (otTotal > 0)    reasonBits.push(`${otTotal}h OT (Rs. ${fmt(otCredit)})`);
  let reasonText = reasonBits.join(" + ");
  if (grossDeduction > 0 && otCredit >= grossDeduction) {
    reasonText += ` → OT offsets deduction; extra OT allowance Rs. ${fmt(otAllowance)}`;
  } else if (grossDeduction > 0 && otCredit > 0) {
    reasonText += ` → net deduction Rs. ${fmt(netDeduction)}`;
  } else if (grossDeduction > 0) {
    reasonText += ` → deduction Rs. ${fmt(netDeduction)}`;
  } else if (otTotal > 0) {
    reasonText += ` → OT allowance Rs. ${fmt(otAllowance)}`;
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
      perDay: round2(perDay),
      perHour: round2(perHour),
      otMultiplier: rates.otMultiplier,
      workingDaysPerMonth: rates.workingDaysPerMonth,
      standardHoursPerDay: rates.standardHoursPerDay,
    },
    breakdown: {
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

function round2(n: number) { return Math.round(n * 100) / 100; }
function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
