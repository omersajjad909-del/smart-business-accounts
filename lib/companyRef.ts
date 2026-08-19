/**
 * One company identifier for every screen. Client-safe — no prisma here, so
 * "use client" pages can import it. The DB-backed resolvers live in
 * `lib/companyRefServer.ts`.
 *
 * A company carries two identifiers: `Company.id` — a UUID primary key that
 * the foreign keys of ~100 tables point at — and `Company.companyNo`, a short
 * unique autoincrement int. The UUID has to stay the database key, but showing
 * both was a constant source of confusion: the companies list showed
 * "#100004", the URL for that same row showed "36fe6682-…", and the backup
 * table showed a third-looking "9806c891-…" for a different company of the
 * same name. Three strings, and no way to tell from a screen which two meant
 * one company.
 *
 * So `companyNo` is now the ONLY identifier that reaches a screen or a URL.
 * Anything user-facing goes through `formatCompanyNo` (display) or
 * `companyRef` (links); anything that touches the database resolves the
 * incoming ref back to a UUID with `resolveCompanyId` first.
 */

/** A ref is a companyNo when it is all digits — UUIDs always carry hyphens. */
export function isCompanyNoRef(ref: string): boolean {
  return /^\d+$/.test(String(ref || "").trim());
}

/** The ref to put in a link: `/admin/companies/100004`. */
export function companyRef(company: { id: string; companyNo?: number | null }): string {
  return company.companyNo != null ? String(company.companyNo) : company.id;
}

/**
 * The ID to print on a screen: `#100004`.
 *
 * Falls back to a shortened UUID only if a row somehow has no companyNo, so a
 * missing number degrades to something traceable instead of a blank cell.
 */
export function formatCompanyNo(
  companyNo?: number | null,
  fallbackId?: string | null
): string {
  if (companyNo != null) return `#${companyNo}`;
  if (fallbackId) return `#${String(fallbackId).slice(0, 8)}…`;
  return "—";
}

/**
 * What to call the provider customer ID on screen.
 *
 * The DB column is named `stripeCustomerId` for historical reasons, but it
 * holds whichever gateway's customer id arrived on the webhook that activated
 * the subscription — a LemonSqueezy `customer_id` is a plain integer
 * ("9629773"), a Stripe one is "cus_…". Labelling all of them "Stripe" made a
 * LemonSqueezy id look like corrupt Stripe data, so the label follows the
 * provider actually on file.
 */
export function billingCustomerIdLabel(provider?: string | null): string {
  switch (String(provider || "").toUpperCase()) {
    case "LEMONSQUEEZY": return "LemonSqueezy Customer ID";
    case "STRIPE":       return "Stripe Customer ID";
    case "SAFEPAY":      return "Safepay Customer ID";
    case "SWITCHNOW":    return "SwitchNow Customer ID";
    default:             return "Billing Customer ID";
  }
}
