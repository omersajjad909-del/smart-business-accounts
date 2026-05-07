import { ShiftSetting } from "./companyAdminControl";

export const SHIFT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Returns current time converted to the given IANA timezone as a plain Date object */
export function getNowInTimezone(timezone: string): Date {
  try {
    return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
  } catch {
    // Fallback to UTC if timezone is invalid
    return new Date();
  }
}

export function getShiftStatus(shift: ShiftSetting, now?: Date): {
  inShift: boolean;
  minutesRemaining: number;
  effectiveEndTime: string;
  startMinutes: number;
  endMinutes: number;
} {
  const tz = shift.timezone || "Asia/Karachi";
  const tzNow = now ?? getNowInTimezone(tz);

  const dayName = SHIFT_DAYS[tzNow.getDay()];
  const inAllowedDay = shift.days.includes(dayName);

  const currentMin = tzNow.getHours() * 60 + tzNow.getMinutes();
  const [sh, sm] = shift.startTime.split(":").map(Number);
  const [eh, em] = shift.endTime.split(":").map(Number);
  const graceMin = shift.graceMinutes ?? 10;
  const overtimeMin = shift.overtimeMinutes ?? 0;

  const startMinutes = sh * 60 + sm - graceMin;
  const endMinutes = eh * 60 + em + overtimeMin;

  const inShift = inAllowedDay && currentMin >= startMinutes && currentMin < endMinutes;
  const minutesRemaining = inShift ? endMinutes - currentMin : 0;

  const effH = Math.floor(endMinutes / 60);
  const effM = endMinutes % 60;
  const effectiveEndTime = `${String(effH).padStart(2, "0")}:${String(effM).padStart(2, "0")}`;

  return { inShift, minutesRemaining, effectiveEndTime, startMinutes, endMinutes };
}

export function formatShiftTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}
