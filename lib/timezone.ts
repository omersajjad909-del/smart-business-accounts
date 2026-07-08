/**
 * Returns the next UTC Date at which `hour` (0-23) occurs in the given IANA timezone.
 * If that hour has already passed today in the target timezone, returns tomorrow.
 */
export function getNextOccurrenceAt({
  timezone,
  hour,
}: {
  timezone: string;
  hour: number;
}): Date {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((p) => [p.type, p.value]),
  );

  const currentHourInTz = parseInt(parts.hour, 10);
  const y = parseInt(parts.year, 10);
  const m = parseInt(parts.month, 10) - 1;
  const d = parseInt(parts.day, 10);

  // Build a candidate: today at `hour` in the target timezone
  const candidateLocal = new Date(Date.UTC(y, m, d, hour, 0, 0, 0));

  // Convert back: find UTC offset by comparing what Intl says vs what UTC would say
  const utcOffset = now.getTime() - Date.UTC(
    parseInt(parts.year, 10),
    parseInt(parts.month, 10) - 1,
    parseInt(parts.day, 10),
    currentHourInTz,
    parseInt(parts.minute, 10),
    parseInt(parts.second, 10),
  );

  const candidateUTC = candidateLocal.getTime() - utcOffset;

  if (candidateUTC > now.getTime()) {
    return new Date(candidateUTC);
  }

  // Already past today — add one day
  return new Date(candidateUTC + 24 * 60 * 60 * 1000);
}
