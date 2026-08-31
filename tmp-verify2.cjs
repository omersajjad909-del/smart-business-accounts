"use strict";

// lib/prisma.ts
var import_client = require("@prisma/client");

// lib/fieldEncrypt.ts
var import_crypto = require("crypto");
var ALGORITHM = "aes-256-gcm";
var PREFIX = "enc:v1:";
var IV_BYTES = 12;
function getKey() {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY env var is missing or invalid. Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  return Buffer.from(hex, "hex");
}
function encryptField(plaintext) {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext;
  const key = getKey();
  const iv = (0, import_crypto.randomBytes)(IV_BYTES);
  const cipher = (0, import_crypto.createCipheriv)(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}
function decryptField(value) {
  if (!value) return value;
  if (!value.startsWith(PREFIX)) return value;
  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted field format");
  const [ivHex, tagHex, ctHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ctHex, "hex");
  const decipher = (0, import_crypto.createDecipheriv)(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// lib/prisma.ts
var globalForPrisma = global;
var prismaLogLevels = process.env.DEBUG_PRISMA === "true" ? ["query", "error", "warn"] : ["error", "warn"];
var ENCRYPTED_FIELDS = {
  User: ["phone"],
  Contact: ["email", "phone"],
  Company: ["phone", "taxId"]
};
var IMMUTABLE_LOG_ACTIONS = /* @__PURE__ */ new Set([
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
  "2FA_ENABLED",
  "2FA_DISABLED",
  "2FA_VERIFIED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "PLAN_CHANGED",
  "SUBSCRIPTION_CANCELLED",
  "USER_CREATED",
  "USER_DELETED",
  "USER_ROLE_CHANGED",
  "COMPANY_CREATED",
  "COMPANY_DELETED",
  "PERMISSION_CHANGED",
  "EXPORT_DATA",
  "DATA_DELETED"
]);
function encryptData(model, data) {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields || !data || !process.env.FIELD_ENCRYPTION_KEY) return data;
  const result = { ...data };
  for (const field of fields) {
    if (typeof result[field] === "string" && result[field]) {
      result[field] = encryptField(result[field]);
    }
  }
  return result;
}
function decryptResult(model, result) {
  if (!result || !process.env.FIELD_ENCRYPTION_KEY) return result;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return result;
  if (Array.isArray(result)) return result.map((r) => decryptResult(model, r));
  const out = { ...result };
  for (const field of fields) {
    if (typeof out[field] === "string") {
      try {
        out[field] = decryptField(out[field]);
      } catch {
      }
    }
  }
  return out;
}
function buildClient() {
  const base = new import_client.PrismaClient({ log: prismaLogLevels });
  return base.$extends({
    query: {
      // ── Immutable audit log protection ──
      activityLog: {
        async $allOperations({ operation, args, query }) {
          if (operation === "update" || operation === "updateMany") {
            throw new Error("ActivityLog records are immutable and cannot be updated.");
          }
          if (operation === "delete" || operation === "deleteMany") {
            const action = args?.where?.action;
            if (action && IMMUTABLE_LOG_ACTIONS.has(action)) {
              throw new Error(`ActivityLog action "${action}" is a security record and cannot be deleted.`);
            }
          }
          return query(args);
        }
      },
      // ── Field encryption: User ──
      user: {
        async create({ args, query }) {
          if (args.data) args.data = encryptData("User", args.data);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async update({ args, query }) {
          if (args.data) args.data = encryptData("User", args.data);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async upsert({ args, query }) {
          if (args.create) args.create = encryptData("User", args.create);
          if (args.update) args.update = encryptData("User", args.update);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return decryptResult("User", result);
        }
      },
      // ── Field encryption: Contact ──
      contact: {
        async create({ args, query }) {
          if (args.data) args.data = encryptData("Contact", args.data);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async update({ args, query }) {
          if (args.data) args.data = encryptData("Contact", args.data);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async upsert({ args, query }) {
          if (args.create) args.create = encryptData("Contact", args.create);
          if (args.update) args.update = encryptData("Contact", args.update);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return decryptResult("Contact", result);
        }
      },
      // ── Field encryption: Company ──
      company: {
        async create({ args, query }) {
          if (args.data) args.data = encryptData("Company", args.data);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async update({ args, query }) {
          if (args.data) args.data = encryptData("Company", args.data);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async upsert({ args, query }) {
          if (args.create) args.create = encryptData("Company", args.create);
          if (args.update) args.update = encryptData("Company", args.update);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return decryptResult("Company", result);
        }
      }
    }
  });
}
var globalForExtended = global;
var prisma = globalForExtended.prisma ?? buildClient();
globalForExtended.prisma = prisma;

// lib/payrollCalc.ts
var DEFAULT_RATES = {
  workingDaysPerMonth: 30,
  standardHoursPerDay: 8,
  otMultiplier: 1.5
};
function daysInCalendarMonth(monthYear) {
  const [y, m] = monthYear.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function otHoursForDay(row, standardHoursPerDay) {
  if (!row.checkIn || !row.checkOut) return 0;
  const worked = (row.checkOut.getTime() - row.checkIn.getTime()) / 36e5;
  if (worked <= 0) return 0;
  const ot = worked - standardHoursPerDay;
  return ot > 0 ? Math.round(ot * 100) / 100 : 0;
}
function computePayroll(params) {
  const rates = { ...DEFAULT_RATES, ...params.rates || {} };
  const totalDays = daysInCalendarMonth(params.monthYear);
  const counts = {
    present: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
    late: 0,
    holiday: 0,
    unmarked: 0,
    totalDays
  };
  let otTotal = 0;
  let daysWithOT = 0;
  for (const row of params.attendance) {
    const s = String(row.status || "").toUpperCase();
    if (s === "PRESENT") counts.present++;
    else if (s === "ABSENT") counts.absent++;
    else if (s === "HALF_DAY") counts.halfDay++;
    else if (s === "LEAVE") counts.leave++;
    else if (s === "LATE") counts.late++;
    else if (s === "HOLIDAY") counts.holiday++;
    if (s === "PRESENT" || s === "HALF_DAY" || s === "LATE") {
      const ot = otHoursForDay(row, rates.standardHoursPerDay);
      if (ot > 0) {
        otTotal += ot;
        daysWithOT++;
      }
    }
  }
  const accountedFor = counts.present + counts.absent + counts.halfDay + counts.leave + counts.late + counts.holiday;
  counts.unmarked = Math.max(0, totalDays - accountedFor);
  const perDay = params.baseSalary / rates.workingDaysPerMonth;
  const perHour = perDay / rates.standardHoursPerDay;
  otTotal = Math.round(otTotal * 100) / 100;
  const absentDeduction = money(counts.absent * perDay);
  const halfDayDeduction = money(counts.halfDay * perDay / 2);
  const grossDeduction = money(absentDeduction + halfDayDeduction);
  const otCredit = money(otTotal * perHour * rates.otMultiplier);
  const netDeduction = money(Math.max(0, grossDeduction - otCredit));
  const otAllowance = money(Math.max(0, otCredit - grossDeduction));
  const suggestedNetSalary = money(params.baseSalary + otAllowance - netDeduction);
  const reasonBits = [];
  if (counts.absent) reasonBits.push(`${counts.absent} absent (Rs. ${fmt(absentDeduction)})`);
  if (counts.halfDay) reasonBits.push(`${counts.halfDay} half-day (Rs. ${fmt(halfDayDeduction)})`);
  if (otTotal > 0) reasonBits.push(`${otTotal}h OT (Rs. ${fmt(otCredit)})`);
  let reasonText = reasonBits.join(" + ");
  if (grossDeduction > 0 && otCredit >= grossDeduction) {
    reasonText += ` \u2192 OT offsets deduction; extra OT allowance Rs. ${fmt(otAllowance)}`;
  } else if (grossDeduction > 0 && otCredit > 0) {
    reasonText += ` \u2192 net deduction Rs. ${fmt(netDeduction)}`;
  } else if (grossDeduction > 0) {
    reasonText += ` \u2192 deduction Rs. ${fmt(netDeduction)}`;
  } else if (otTotal > 0) {
    reasonText += ` \u2192 OT allowance Rs. ${fmt(otAllowance)}`;
  } else {
    reasonText = "Full attendance \u2014 no deduction, no OT.";
  }
  return {
    employeeId: params.employeeId,
    monthYear: params.monthYear,
    baseSalary: params.baseSalary,
    counts,
    overtime: { totalHours: otTotal, daysWithOT },
    rates: {
      perDay: money(perDay),
      perHour: round2(perHour),
      otMultiplier: rates.otMultiplier,
      workingDaysPerMonth: rates.workingDaysPerMonth,
      standardHoursPerDay: rates.standardHoursPerDay
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
      reasonText
    }
  };
}
function round2(n) {
  return Math.round(n * 100) / 100;
}
function money(n) {
  return Math.round(Number(n) || 0);
}
function fmt(n) {
  return money(n).toLocaleString(void 0, { maximumFractionDigits: 0 });
}

// lib/payrollAdvanceRecovery.ts
function hasAdvanceReason(reason) {
  return String(reason || "").toLowerCase().includes("advance");
}
function monthOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function shiftHours(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return null;
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}
async function attendanceDeductionByMonth(tx, companyId, employeeId, salaryByMonth) {
  const out = /* @__PURE__ */ new Map();
  const months = [...salaryByMonth.keys()].sort();
  if (!months.length) return out;
  const employee = await tx.employee.findFirst({
    where: { id: employeeId, companyId },
    select: { shiftStart: true, shiftEnd: true }
  });
  const shiftLen = shiftHours(employee?.shiftStart, employee?.shiftEnd);
  const [y0, m0] = months[0].split("-").map(Number);
  const [y1, m1] = months[months.length - 1].split("-").map(Number);
  const rows = await tx.attendance.findMany({
    where: {
      companyId,
      employeeId,
      date: { gte: new Date(y0, m0 - 1, 1), lt: new Date(y1, m1, 1) }
    },
    select: { date: true, status: true, checkIn: true, checkOut: true },
    orderBy: { date: "asc" }
  });
  const byMonth = /* @__PURE__ */ new Map();
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
      rates: shiftLen && shiftLen > 0 && shiftLen <= 24 ? { standardHoursPerDay: shiftLen } : void 0
    });
    out.set(month, computed.breakdown.netDeduction);
  }
  return out;
}
async function computeEmployeeAdvanceState(tx, companyId, employeeId) {
  const advances = await tx.advanceSalary.findMany({
    where: { companyId, employeeId, deletedAt: null },
    select: { id: true, amount: true, date: true, monthYear: true, createdAt: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }]
  });
  const rows = advances.map((advance) => ({
    advanceId: advance.id,
    amount: money(advance.amount || 0),
    recovered: 0,
    balance: money(advance.amount || 0),
    targetMonth: advance.monthYear || null,
    createdAt: advance.createdAt
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
      createdAt: true
    },
    orderBy: { monthYear: "asc" }
  });
  if (!payrolls.length) return { rows: rows.map(finalizeRow), carries: [] };
  const salaryByMonth = new Map(
    payrolls.map((payroll) => [payroll.monthYear, Number(payroll.baseSalary || 0)])
  );
  const attendanceDeduction = await attendanceDeductionByMonth(tx, companyId, employeeId, salaryByMonth);
  const carries = [];
  let carryIn = 0;
  for (const payroll of payrolls) {
    const grossSalary = money(Number(payroll.baseSalary || 0) + Number(payroll.allowances || 0));
    const deductions = money(payroll.deductions || 0);
    const cashPaid = money(payroll.additionalCash || 0);
    const nonAdvanceDeduction = Math.min(
      deductions,
      money(attendanceDeduction.get(payroll.monthYear) || 0) + carryIn
    );
    let advanceIntent = hasAdvanceReason(payroll.deductionReason) ? Math.max(0, deductions - nonAdvanceDeduction) : 0;
    let advanceShortfall = 0;
    if (advanceIntent > 0) {
      const eligible = rows.filter(
        (row) => row.balance > 0 && // Rule 1 — on the books when this payroll was entered, or explicitly
        // targeted at this month or an earlier one.
        (row.targetMonth !== null && row.targetMonth <= payroll.monthYear || row.createdAt.getTime() <= payroll.createdAt.getTime())
      );
      const allocations = [];
      for (const row of eligible) {
        if (advanceIntent <= 0) break;
        const allocated = Math.min(row.balance, advanceIntent);
        row.balance -= allocated;
        advanceIntent -= allocated;
        allocations.push({ advanceId: row.advanceId, allocated });
      }
      let salaryAvailable = Math.max(0, grossSalary - nonAdvanceDeduction);
      for (const allocation of allocations) {
        const row = rows.find((candidate) => candidate.advanceId === allocation.advanceId);
        if (!row) continue;
        const recoveredNow = Math.min(allocation.allocated, salaryAvailable);
        salaryAvailable -= recoveredNow;
        row.recovered += recoveredNow;
        const notRecovered = allocation.allocated - recoveredNow;
        row.balance += notRecovered;
        advanceShortfall += notRecovered;
      }
    }
    carryIn = Math.max(0, money(deductions + cashPaid - grossSalary - advanceShortfall));
    carries.push({ monthYear: payroll.monthYear, carryOut: carryIn });
  }
  return { rows: rows.map(finalizeRow), carries };
}
function finalizeRow(row) {
  const recovered = money(Math.min(row.amount, Math.max(0, row.recovered)));
  const balance = money(Math.max(0, row.balance));
  return {
    advanceId: row.advanceId,
    amount: row.amount,
    recovered,
    balance,
    status: balance <= 0 ? "DEDUCTED" : "PENDING"
  };
}
function carryIntoMonth(carries, monthYear) {
  let carry = 0;
  for (const row of carries) {
    if (row.monthYear >= monthYear) break;
    carry = row.carryOut;
  }
  return carry;
}
async function getEmployeeAdvanceState(companyId, employeeId) {
  return computeEmployeeAdvanceState(prisma, companyId, employeeId);
}
async function getEmployeeCarryForward(companyId, employeeId, monthYear) {
  const state = await computeEmployeeAdvanceState(prisma, companyId, employeeId);
  return carryIntoMonth(state.carries, monthYear);
}

// tmp-verify.ts
async function main() {
  const emps = await prisma.employee.findMany({
    where: { isActive: true, companyId: "9806c891-d1bd-4ff5-93b5-2665ca576540" },
    select: { id: true, employeeId: true, firstName: true, lastName: true, salary: true, companyId: true },
    orderBy: { employeeId: "asc" }
  });
  for (const e of emps) {
    if (!e.companyId) continue;
    const rows = (await getEmployeeAdvanceState(e.companyId, e.id)).rows;
    const advTotal = rows.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0);
    const carry = await getEmployeeCarryForward(e.companyId, e.id, "2026-08");
    const att = await prisma.attendance.findMany({
      where: { employeeId: e.id, companyId: e.companyId, date: { gte: new Date(2026, 7, 1), lt: new Date(2026, 8, 1) } },
      select: { date: true, status: true, checkIn: true, checkOut: true }
    });
    const calc = computePayroll({ employeeId: e.id, monthYear: "2026-08", baseSalary: e.salary || 0, attendance: att });
    console.log(
      `${e.employeeId} ${e.firstName} ${e.lastName || ""}`.padEnd(28),
      "| advance:",
      String(advTotal).padStart(7),
      "| prevBal:",
      String(carry).padStart(7),
      "| attendance:",
      String(calc.breakdown.netDeduction).padStart(6),
      "| TOTAL DEDUCTION:",
      String(advTotal + carry + calc.breakdown.netDeduction).padStart(8)
    );
    for (const r of rows) {
      console.log(`      advance ${r.advanceId.slice(0, 8)} amount=${r.amount} recovered=${r.recovered} balance=${r.balance} ${r.status}`);
    }
  }
  await prisma.$disconnect();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
