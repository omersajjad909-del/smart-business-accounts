import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/* ────────────────────────────────────────────────────────────
   Device ingest keys

   The plaintext key leaves the server exactly once — in the
   response that creates or rotates it. After that only the
   SHA-256 lives in the DB, same as a password.
   ──────────────────────────────────────────────────────────── */

export function generateDeviceKey(): string {
  return `fbd_${crypto.randomBytes(24).toString("hex")}`;
}

export function hashDeviceKey(key: string): string {
  return crypto.createHash("sha256").update(key.trim()).digest("hex");
}

export function deviceKeyPrefix(key: string): string {
  return key.slice(0, 12);
}

export type AuthedDevice = {
  id: string;
  companyId: string;
  name: string;
  serialNumber: string;
  tzOffsetMin: number;
  mode: string;
};

/**
 * Resolve the `x-device-key` header (or `?key=` for machines that cannot send
 * headers) to a device. Returns null for unknown, inactive or missing keys.
 */
export async function authenticateDevice(req: Request): Promise<AuthedDevice | null> {
  const header = req.headers.get("x-device-key");
  const fromQuery = new URL(req.url).searchParams.get("key");
  const key = header || fromQuery;
  if (!key) return null;

  const device = await prisma.biometricDevice.findFirst({
    where: { apiKeyHash: hashDeviceKey(key), isActive: true },
    select: { id: true, companyId: true, name: true, serialNumber: true, tzOffsetMin: true, mode: true },
  });
  return device;
}

/* ────────────────────────────────────────────────────────────
   Attendance rules

   Stored the same way holiday settings are — one ActivityLog row
   per save, newest wins. Keeps the settings tenant-scoped without
   a table nobody else reads.
   ──────────────────────────────────────────────────────────── */

export const BIOMETRIC_SETTINGS_ACTION = "COMPANY_BIOMETRIC_SETTINGS";

export type BiometricSettings = {
  /** Minutes after shiftStart before a check-in counts as LATE. */
  graceMinutes: number;
  /** Below this many worked hours the day is a HALF_DAY. */
  halfDayHours: number;
  /** Two scans closer together than this are one punch, not an in/out pair. */
  dedupeMinutes: number;
  /** Mark employees with zero punches ABSENT when a day is finalised. */
  autoAbsent: boolean;
  /** Treat an overnight check-out before this hour as belonging to the previous day. */
  nightShiftCutoffHour: number;
};

export const DEFAULT_BIOMETRIC_SETTINGS: BiometricSettings = {
  graceMinutes: 15,
  halfDayHours: 4,
  dedupeMinutes: 2,
  autoAbsent: false,
  nightShiftCutoffHour: 5,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeSettings(input: unknown): BiometricSettings {
  const raw = (input ?? {}) as Partial<BiometricSettings>;
  return {
    graceMinutes: clampInt(raw.graceMinutes, 0, 240, DEFAULT_BIOMETRIC_SETTINGS.graceMinutes),
    halfDayHours: clampInt(raw.halfDayHours, 0, 24, DEFAULT_BIOMETRIC_SETTINGS.halfDayHours),
    dedupeMinutes: clampInt(raw.dedupeMinutes, 0, 120, DEFAULT_BIOMETRIC_SETTINGS.dedupeMinutes),
    autoAbsent: Boolean(raw.autoAbsent ?? DEFAULT_BIOMETRIC_SETTINGS.autoAbsent),
    nightShiftCutoffHour: clampInt(raw.nightShiftCutoffHour, 0, 12, DEFAULT_BIOMETRIC_SETTINGS.nightShiftCutoffHour),
  };
}

export async function getBiometricSettings(companyId: string): Promise<BiometricSettings> {
  const row = await prisma.activityLog.findFirst({
    where: { companyId, action: BIOMETRIC_SETTINGS_ACTION },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });
  if (!row?.details) return { ...DEFAULT_BIOMETRIC_SETTINGS };
  try {
    return normalizeSettings(JSON.parse(row.details));
  } catch {
    return { ...DEFAULT_BIOMETRIC_SETTINGS };
  }
}

/* ────────────────────────────────────────────────────────────
   Time helpers
   ──────────────────────────────────────────────────────────── */

/** "YYYY-MM-DD" for a Date, read in UTC. */
export function dayKey(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Midnight of the given day key — the shape `Attendance.date` is stored in.
 *
 * UTC, not server-local, because that is what `new Date("2026-08-28")` produces
 * and every attendance row written by hand went in through that path. A
 * server-local midnight here would sit a few hours off those rows and the
 * upsert would miss them, quietly doubling the calendar.
 */
export function dayStart(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0, 0));
}

/** Minutes past midnight for an "HH:MM" shift string. */
export function shiftMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

/**
 * Machines report bare wall-clock time. `tzOffsetMin` says how far ahead of UTC
 * that clock runs, so we rebuild the instant rather than trusting the server's
 * own zone (Vercel runs UTC, the machine sits in Karachi).
 */
export function parseDeviceTime(value: string, tzOffsetMin: number): Date | null {
  const s = String(value).trim();
  if (!s) return null;

  // Already carries a zone (…Z or …+05:00) — trust it as sent.
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const [, y, mo, da, hh, mi, ss] = m;
  const utcMs = Date.UTC(+y, +mo - 1, +da, +hh, +mi, ss ? +ss : 0);
  return new Date(utcMs - tzOffsetMin * 60_000);
}

/** Render an instant back in the device's own wall clock, for grouping by day. */
export function inDeviceZone(instant: Date, tzOffsetMin: number): Date {
  return new Date(instant.getTime() + tzOffsetMin * 60_000);
}
