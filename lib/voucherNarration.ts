/**
 * The narration a cash/bank voucher is saved with.
 *
 * CRV and CPV screens have an overall "Voucher Narration" box and a narration
 * per line. VoucherEntry has no narration column, so the per-line text was
 * dropped on save and every voucher typed only line by line reached the ledger
 * as a bare "Cash Receipt" / "Cash Payment". The overall narration still wins
 * when given; otherwise the line narrations are kept, in order, without repeats.
 */
export function voucherNarration(
  narration: unknown,
  entries: { narration?: unknown }[],
  fallback: string,
): string {
  const overall = typeof narration === "string" ? narration.trim() : "";
  if (overall) return overall;

  const lines = entries
    .map((e) => (typeof e.narration === "string" ? e.narration.trim() : ""))
    .filter(Boolean);
  const unique = [...new Set(lines)];
  return unique.length ? unique.join("; ") : fallback;
}
