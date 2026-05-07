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

  // Handle overnight shifts (e.g. 22:00–06:00 where endMinutes < startMinutes)
  const isOvernightShift = endMinutes <= (sh * 60 + sm);

  let inShift: boolean;
  let minutesRemaining: number;

  if (isOvernightShift) {
    // Overnight: in shift if currentMin >= startMinutes OR currentMin < endMinutes
    // Also check previous day is an allowed day for the "after midnight" portion
    const prevDayIdx = (tzNow.getDay() + 6) % 7;
    const prevDayName = SHIFT_DAYS[prevDayIdx];
    const inPrevAllowedDay = shift.days.includes(prevDayName);

    const inShiftAfterStart = inAllowedDay && currentMin >= startMinutes;
    const inShiftBeforeEnd = inPrevAllowedDay && currentMin < endMinutes;
    inShift = inShiftAfterStart || inShiftBeforeEnd;

    if (inShiftAfterStart) {
      // Minutes remaining = from now to midnight + endMinutes
      minutesRemaining = (1440 - currentMin) + endMinutes;
    } else if (inShiftBeforeEnd) {
      minutesRemaining = endMinutes - currentMin;
    } else {
      minutesRemaining = 0;
    }
  } else {
    // Normal same-day shift
    inShift = inAllowedDay && currentMin >= startMinutes && currentMin < endMinutes;
    minutesRemaining = inShift ? endMinutes - currentMin : 0;
  }

  const effH = Math.floor(endMinutes / 60) % 24;
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
