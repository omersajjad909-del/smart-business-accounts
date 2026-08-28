import { prisma } from "@/lib/prisma";
import {
  dayKey,
  dayStart,
  getBiometricSettings,
  inDeviceZone,
  shiftMinutes,
  type BiometricSettings,
} from "@/lib/biometric";

/**
 * Prefix written into `Attendance.remarks` for every row a machine produced.
 * It is how the UI labels the source, and how a human can see at a glance
 * which rows they typed themselves.
 */
export const AUTO_REMARK_PREFIX = "Biometric";

/** Statuses a human owns. Machine data never overwrites these. */
const PROTECTED_STATUSES = new Set(["LEAVE", "HOLIDAY"]);

const DEFAULT_SHIFT_START = "09:00";
const DEFAULT_SHIFT_END = "18:00";

export type ProcessResult = {
  punchesRead: number;
  daysBuilt: number;
  created: number;
  updated: number;
  skippedProtected: number;
  unmapped: number;
};

type PunchRow = {
  id: string;
  employeeId: string | null;
  punchTime: Date;
  device: { tzOffsetMin: number; name: string } | null;
};

type EmployeeRow = {
  id: string;
  shiftStart: string | null;
  shiftEnd: string | null;
};

/** Does this employee's shift run past midnight? */
function isNightShift(emp: EmployeeRow): boolean {
  const start = emp.shiftStart || DEFAULT_SHIFT_START;
  const end = emp.shiftEnd || DEFAULT_SHIFT_END;
  return end < start;
}

/**
 * Which working day a punch belongs to. For a night shift, an early-morning
 * scan closes the *previous* day rather than opening a new one.
 */
function workingDayOf(
  punchTime: Date,
  tzOffsetMin: number,
  emp: EmployeeRow,
  settings: BiometricSettings
): string {
  const local = inDeviceZone(punchTime, tzOffsetMin);
  if (isNightShift(emp) && local.getUTCHours() < settings.nightShiftCutoffHour) {
    local.setUTCDate(local.getUTCDate() - 1);
  }
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Collapse scans that land within `dedupeMinutes` of each other. People tap
 * twice when the beep is missed; that is one punch, not an in/out pair.
 */
function collapse(times: Date[], dedupeMinutes: number): Date[] {
  const sorted = [...times].sort((a, b) => a.getTime() - b.getTime());
  const windowMs = dedupeMinutes * 60_000;
  const out: Date[] = [];
  for (const t of sorted) {
    const last = out[out.length - 1];
    if (last && t.getTime() - last.getTime() <= windowMs) continue;
    out.push(t);
  }
  return out;
}

/**
 * @param checkInMinutes  minutes past midnight on the *device's* clock
 * @param workedMs        real elapsed time, so it needs no zone at all
 *
 * Lateness is a wall-clock question ("did they arrive after 9?") and is decided
 * in minutes-of-day. Comparing Date objects here would depend on the server's
 * own timezone, which is UTC in production and local in dev — the same punch
 * would come out on time on Vercel and five hours late on a laptop.
 */
function decideStatus(
  checkInMinutes: number,
  workedMs: number | null,
  emp: EmployeeRow,
  settings: BiometricSettings
): { status: string; note: string } {
  if (workedMs === null) {
    return { status: "PRESENT", note: "no check-out recorded" };
  }

  const workedHours = workedMs / 3_600_000;
  if (workedHours < settings.halfDayHours) {
    return { status: "HALF_DAY", note: `${workedHours.toFixed(1)}h worked` };
  }

  const start = shiftMinutes(emp.shiftStart || DEFAULT_SHIFT_START);
  if (start !== null) {
    // A night shift starting at 21:00 and entered at 00:30 is early, not
    // 20 hours late — roll the arrival past midnight into the same day.
    const arrival =
      isNightShift(emp) && checkInMinutes < settings.nightShiftCutoffHour * 60
        ? checkInMinutes + 1440
        : checkInMinutes;

    if (arrival > start + settings.graceMinutes) {
      return { status: "LATE", note: `${arrival - start} min late` };
    }
  }

  return { status: "PRESENT", note: `${workedHours.toFixed(1)}h worked` };
}

/**
 * Attach punches whose enrollment number now maps to an employee. Called after
 * a mapping is saved so history stops being orphaned.
 */
export async function resolveUnmappedPunches(companyId: string): Promise<number> {
  const employees = await prisma.employee.findMany({
    where: { companyId, biometricId: { not: null } },
    select: { id: true, biometricId: true },
  });
  if (employees.length === 0) return 0;

  let linked = 0;
  for (const emp of employees) {
    const res = await prisma.attendancePunch.updateMany({
      where: { companyId, employeeId: null, biometricId: emp.biometricId! },
      data: { employeeId: emp.id, processed: false },
    });
    linked += res.count;
  }
  return linked;
}

/**
 * Turn raw punches into daily Attendance rows.
 *
 * Idempotent by design: it reads punches, never consumes them, so the same
 * range can be replayed after a rules change or a late-arriving batch.
 */
export async function processPunches(
  companyId: string,
  opts: { from: Date; to: Date; employeeIds?: string[]; onlyUnprocessed?: boolean }
): Promise<ProcessResult> {
  const settings = await getBiometricSettings(companyId);

  const punches = (await prisma.attendancePunch.findMany({
    where: {
      companyId,
      punchTime: { gte: opts.from, lte: opts.to },
      ...(opts.employeeIds?.length ? { employeeId: { in: opts.employeeIds } } : {}),
      ...(opts.onlyUnprocessed ? { processed: false } : {}),
    },
    select: {
      id: true,
      employeeId: true,
      punchTime: true,
      device: { select: { tzOffsetMin: true, name: true } },
    },
    orderBy: { punchTime: "asc" },
  })) as PunchRow[];

  const result: ProcessResult = {
    punchesRead: punches.length,
    daysBuilt: 0,
    created: 0,
    updated: 0,
    skippedProtected: 0,
    unmapped: punches.filter((p) => !p.employeeId).length,
  };
  if (punches.length === 0) return result;

  const employeeIds = Array.from(
    new Set(punches.map((p) => p.employeeId).filter((id): id is string => Boolean(id)))
  );
  if (employeeIds.length === 0) return result;

  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, shiftStart: true, shiftEnd: true },
  });
  const empById = new Map(employees.map((e) => [e.id, e as EmployeeRow]));

  // employeeId -> working day -> the scans that fell in it
  type Cell = { times: Date[]; device: string; ids: string[]; tzOffsetMin: number };
  const buckets = new Map<string, Map<string, Cell>>();

  for (const p of punches) {
    if (!p.employeeId) continue;
    const emp = empById.get(p.employeeId);
    if (!emp) continue;

    const tz = p.device?.tzOffsetMin ?? 0;
    const key = workingDayOf(p.punchTime, tz, emp, settings);

    let byDay = buckets.get(p.employeeId);
    if (!byDay) {
      byDay = new Map();
      buckets.set(p.employeeId, byDay);
    }
    let cell = byDay.get(key);
    if (!cell) {
      cell = { times: [], device: p.device?.name ?? "device", ids: [], tzOffsetMin: tz };
      byDay.set(key, cell);
    }
    cell.times.push(p.punchTime);
    cell.ids.push(p.id);
  }

  // Read every attendance row this run could touch in one query. A month-long
  // reprocess for a 200-person company is thousands of employee-days, and one
  // findUnique each turns a replay into a several-minute round-trip storm.
  const allDates = Array.from(
    new Set(Array.from(buckets.values()).flatMap((byDay) => Array.from(byDay.keys())))
  ).map(dayStart);

  const existingRows = allDates.length
    ? await prisma.attendance.findMany({
        where: { companyId, employeeId: { in: Array.from(buckets.keys()) }, date: { in: allDates } },
        select: { id: true, employeeId: true, date: true, status: true },
      })
    : [];
  const existingByKey = new Map(
    existingRows.map((r) => [`${r.employeeId}|${r.date.toISOString()}`, r])
  );

  const processedIds: string[] = [];
  const toCreate: {
    companyId: string;
    employeeId: string;
    date: Date;
    status: string;
    checkIn: Date;
    checkOut: Date | null;
    remarks: string;
  }[] = [];

  for (const [employeeId, byDay] of buckets) {
    const emp = empById.get(employeeId)!;
    for (const [key, cell] of byDay) {
      const times = collapse(cell.times, settings.dedupeMinutes);
      if (times.length === 0) continue;

      result.daysBuilt += 1;

      const checkIn = times[0];
      const checkOut = times.length > 1 ? times[times.length - 1] : null;

      // Read the arrival on the device's own clock; the hours worked are a
      // plain elapsed difference and need no zone.
      const localIn = inDeviceZone(checkIn, cell.tzOffsetMin);
      const checkInMinutes = localIn.getUTCHours() * 60 + localIn.getUTCMinutes();
      const workedMs = checkOut ? checkOut.getTime() - checkIn.getTime() : null;
      const { status, note } = decideStatus(checkInMinutes, workedMs, emp, settings);

      const date = dayStart(key);
      const existing = existingByKey.get(`${employeeId}|${date.toISOString()}`);

      if (existing && PROTECTED_STATUSES.has(existing.status)) {
        result.skippedProtected += 1;
        processedIds.push(...cell.ids);
        continue;
      }

      const remarks = `${AUTO_REMARK_PREFIX} · ${cell.device} · ${note}`;

      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: { status, checkIn, checkOut, remarks },
        });
        result.updated += 1;
      } else {
        toCreate.push({ companyId, employeeId, date, status, checkIn, checkOut, remarks });
        result.created += 1;
      }
      processedIds.push(...cell.ids);
    }
  }

  if (toCreate.length > 0) {
    // skipDuplicates covers the race where a second ingest for the same day
    // landed between the lookup above and here.
    const res = await prisma.attendance.createMany({ data: toCreate, skipDuplicates: true });
    result.created = res.count;
  }

  if (processedIds.length > 0) {
    await prisma.attendancePunch.updateMany({
      where: { id: { in: processedIds } },
      data: { processed: true },
    });
  }

  return result;
}

/**
 * Close a day out: everyone active, not on a holiday or weekly off, who still
 * has no row gets ABSENT. Only runs when the company opted in — on a half
 * rolled-out machine it would libel people who were actually at work.
 */
export async function finalizeDay(
  companyId: string,
  key: string,
  weeklyOffDays: number[]
): Promise<{ marked: number; skipped: string | null }> {
  const settings = await getBiometricSettings(companyId);
  if (!settings.autoAbsent) return { marked: 0, skipped: "autoAbsent is off" };

  const date = dayStart(key);
  if (weeklyOffDays.includes(date.getUTCDay())) return { marked: 0, skipped: "weekly off" };

  const holiday = await prisma.holiday.findFirst({ where: { companyId, date } });
  if (holiday) return { marked: 0, skipped: `holiday: ${holiday.name}` };

  const employees = await prisma.employee.findMany({
    where: { companyId, isActive: true, dateOfJoining: { lte: date } },
    select: { id: true },
  });
  if (employees.length === 0) return { marked: 0, skipped: null };

  const existing = await prisma.attendance.findMany({
    where: { companyId, date, employeeId: { in: employees.map((e) => e.id) } },
    select: { employeeId: true },
  });
  const seen = new Set(existing.map((r) => r.employeeId));

  const missing = employees.filter((e) => !seen.has(e.id));
  if (missing.length === 0) return { marked: 0, skipped: null };

  await prisma.attendance.createMany({
    data: missing.map((e) => ({
      companyId,
      employeeId: e.id,
      date,
      status: "ABSENT",
      remarks: `${AUTO_REMARK_PREFIX} · no punch recorded`,
    })),
    skipDuplicates: true,
  });

  return { marked: missing.length, skipped: null };
}

export { dayKey };
