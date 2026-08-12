/**
 * Status pills for the report tables.
 *
 * Every report page used to do `const s = STATUS[r.status]` and then read
 * `s.bg` straight away. When the API answered with a value the page's map did
 * not have — a different case ("HIGH" vs "high"), a different word
 * ("FULLY_RECEIVED" vs "received"), or a number where a word was expected —
 * the lookup returned undefined and the whole page died with
 * "Cannot read properties of undefined (reading 'bg')". Seven report screens
 * were white-screening on it.
 *
 * `badgeFor` normalises the value before the lookup and, failing that, shows
 * the raw value in a neutral pill. A report may show an unstyled status; it may
 * not crash.
 */

export type Badge = { label: string; color: string; bg: string };

const NEUTRAL: Badge = { label: "—", color: "var(--text-muted)", bg: "var(--app-bg)" };

/** "Fully Received" / "FULLY_RECEIVED" / "fully-received" → "fully_received" */
export function normalizeBadgeKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function badgeFor(map: Record<string, Badge>, value: unknown): Badge {
  const key = normalizeBadgeKey(value);
  if (!key) return NEUTRAL;
  const hit = map[key];
  if (hit) return hit;
  // Unknown value: keep the row readable instead of blanking it, and show what
  // the API actually sent so the mismatch is visible rather than silent.
  return { ...NEUTRAL, label: String(value) };
}
