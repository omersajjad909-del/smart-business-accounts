/**
 * Format a date string or Date object → dd-mm-yyyy
 * e.g. "2026-04-17" → "17-04-2026"
 */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d).slice(0, 10);
  const dd   = String(date.getDate()).padStart(2, "0");
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Today's date as yyyy-mm-dd  (for <input type="date" value=...>)
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
