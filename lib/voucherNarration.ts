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

/*
 * Cheque vouchers post exactly like bank vouchers — the money moves through the
 * chosen bank account — and differ only in carrying a cheque number. There is
 * no column for it, so it rides at the front of the narration ("Chq# 004512 —
 * …"), where it also shows up in the ledger and on the printed voucher.
 */
const CHEQUE_PREFIX = /^Chq# (\S+)(?: — )?/;

export function withChequeNo(narration: string, chequeNo: unknown): string {
  const no = typeof chequeNo === "string" ? chequeNo.trim().replace(/\s+/g, "") : "";
  if (!no) return narration;
  return narration ? `Chq# ${no} — ${narration}` : `Chq# ${no}`;
}

/** Undo withChequeNo, so an edited voucher does not get the prefix twice. */
export function splitChequeNo(narration: string | null | undefined): { chequeNo: string; narration: string } {
  const text = narration || "";
  const m = text.match(CHEQUE_PREFIX);
  return m ? { chequeNo: m[1], narration: text.slice(m[0].length) } : { chequeNo: "", narration: text };
}
