/**
 * The provinces FBR's digital invoicing accepts, in one place.
 *
 * Seller and buyer province both ride on every filed invoice, and both were
 * free-text boxes typed separately — so "Punjab", "punjab" and "PUNJAB" could
 * all be sitting in the same database, and a buyer's *city* ("Lahore") was
 * going across in the province field, which the gateway rejects outright.
 *
 * One list, read by the company profile, the customer form and the payload
 * builder, is what keeps those three saying the same thing.
 *
 * ── Verify before the first live filing ─────────────────────────────────────
 * These are the constitutional names. FBR's own list is what the gateway
 * matches against and it has its own spellings and abbreviations, so check
 * these strings against the current FBR integration guide and correct them
 * here — every screen and the payload follow this file.
 */

export const PK_PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Azad Jammu and Kashmir",
  "Gilgit-Baltistan",
] as const;

export type PkProvince = (typeof PK_PROVINCES)[number];

/**
 * Older records hold whatever somebody typed. This maps the common spellings
 * onto the canonical name so an invoice raised against a legacy customer still
 * files, instead of failing on a value nobody can see is wrong.
 *
 * A city is deliberately *not* mapped to its province: guessing that Lahore
 * means Punjab would quietly file an address the operator never confirmed.
 * Unrecognised input comes back null and the caller decides.
 */
const ALIASES: Record<string, PkProvince> = {
  punjab: "Punjab",
  sindh: "Sindh",
  sind: "Sindh",
  kpk: "Khyber Pakhtunkhwa",
  "khyber pakhtunkhwa": "Khyber Pakhtunkhwa",
  "khyber pakhtoonkhwa": "Khyber Pakhtunkhwa",
  "kp": "Khyber Pakhtunkhwa",
  nwfp: "Khyber Pakhtunkhwa",
  balochistan: "Balochistan",
  baluchistan: "Balochistan",
  ict: "Islamabad Capital Territory",
  islamabad: "Islamabad Capital Territory",
  "islamabad capital territory": "Islamabad Capital Territory",
  ajk: "Azad Jammu and Kashmir",
  "azad kashmir": "Azad Jammu and Kashmir",
  "azad jammu and kashmir": "Azad Jammu and Kashmir",
  "azad jammu & kashmir": "Azad Jammu and Kashmir",
  gb: "Gilgit-Baltistan",
  "gilgit baltistan": "Gilgit-Baltistan",
  "gilgit-baltistan": "Gilgit-Baltistan",
};

/** Canonical province for whatever was typed, or null when it is not one. */
export function normalizeProvince(raw: string | null | undefined): PkProvince | null {
  const key = String(raw || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  return ALIASES[key] ?? null;
}
