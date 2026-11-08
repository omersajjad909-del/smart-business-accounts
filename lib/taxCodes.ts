// FILE: lib/taxCodes.ts
//
// Optional per-line tax codes.
//
// Tax is the user's choice, never forced: a line that names no tax code keeps
// whatever taxPercent it came with (0 by default), exactly as before. A line
// that does name one gets its rate from the company's own TaxConfiguration —
// read here on the server, so a client cannot post a code with a rate of its
// own — and the code, its category and the amounts are snapshotted onto the
// line so a later edit to the code never rewrites an issued invoice.

import type { Db } from "@/lib/inventoryAccounts";

export const TAX_CATEGORIES = ["STANDARD", "ZERO_RATED", "EXEMPT", "OUT_OF_SCOPE", "REVERSE_CHARGE"] as const;
export type TaxCategory = (typeof TAX_CATEGORIES)[number];

export class UnknownTaxCodeError extends Error {
  constructor(public taxCodeId: string) {
    super(`Tax code not found for this company: ${taxCodeId}`);
  }
}

type LineWithTax = { taxCodeId?: string | null; taxPercent?: number | string | null };

/**
 * Returns the items with `taxPercent` set from the chosen tax code, plus the
 * code's category. Items without a code are returned untouched. Throws
 * UnknownTaxCodeError for a code that is not this company's (or is inactive).
 */
export async function applyLineTaxCodes<T extends LineWithTax>(
  db: Db,
  companyId: string,
  items: T[],
): Promise<(T & { taxCategory: string | null })[]> {
  const ids = [...new Set(items.map((i) => i.taxCodeId).filter((v): v is string => !!v))];
  const codes = ids.length
    ? await db.taxConfiguration.findMany({
        where: { id: { in: ids }, companyId, isActive: true },
        select: { id: true, taxRate: true, category: true },
      })
    : [];
  const byId = new Map(codes.map((c) => [c.id, c]));

  return items.map((i) => {
    if (!i.taxCodeId) return { ...i, taxCategory: null };
    const code = byId.get(i.taxCodeId);
    if (!code) throw new UnknownTaxCodeError(i.taxCodeId);
    // Zero-rated, exempt and out-of-scope lines carry no tax whatever the rate says.
    const rate = code.category === "STANDARD" || code.category === "REVERSE_CHARGE" ? code.taxRate : 0;
    return { ...i, taxPercent: rate, taxCategory: code.category };
  });
}
