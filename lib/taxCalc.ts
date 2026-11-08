// FILE: lib/taxCalc.ts
//
// Document totals (sales / purchase invoices), worked out one way.
//
// The sales create, purchase create and purchase edit routes each carried their
// own copy of this arithmetic, and the copies had drifted: the purchase edit
// path ignored item-level tax and line discounts altogether. Every route now
// calls this instead.
//
// The arithmetic is the create routes' own, so existing totals do not move:
//
//     subtotal  = Σ qty × rate
//     itemsTax  = Σ (qty × rate × (1 − line discount %)) × line tax %
//     globalTax = (subtotal − invoice discount) × invoice-level tax %
//     total     = subtotal − discount + itemsTax + globalTax + freight
//
// Money is rounded to 2 decimals once per figure, so the tax shown on the
// document, the tax posted to the ledger and the tax in the reports agree.

export type TaxCalcItem = {
  qty: number | string;
  rate: number | string;
  discountPercent?: number | string | null;
  taxPercent?: number | string | null;
};

export type TaxCalcInput = {
  items: TaxCalcItem[];
  discount?: number | string | null;
  discountType?: string | null;
  freight?: number | string | null;
  /** Invoice-level tax rate in percent (from a TaxConfiguration), if applied. */
  globalTaxRate?: number | null;
};

export type TaxCalcResult = {
  subtotal: number;
  discountAmt: number;
  itemsTax: number;
  globalTax: number;
  /** itemsTax + globalTax — what the tax account is posted with. */
  taxAmount: number;
  freight: number;
  total: number;
  /** Per input line, in order: value after the line's own discount, and its tax. */
  lines: { taxable: number; tax: number }[];
};

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeDocumentTotals(input: TaxCalcInput): TaxCalcResult {
  const subtotal = input.items.reduce((s, i) => s + Number(i.qty) * Number(i.rate), 0);
  const discountRaw = Number(input.discount || 0);
  const discountAmt = input.discountType === "percent" ? (subtotal * discountRaw) / 100 : discountRaw;

  const itemsTax = input.items.reduce((s, i) => {
    const lineBase = Number(i.qty) * Number(i.rate) * (1 - (Number(i.discountPercent) || 0) / 100);
    return s + (lineBase * (Number(i.taxPercent) || 0)) / 100;
  }, 0);

  const globalTax = input.globalTaxRate ? ((subtotal - discountAmt) * input.globalTaxRate) / 100 : 0;
  const freight = Number(input.freight || 0);

  const lines = input.items.map((i) => {
    const taxable = Number(i.qty) * Number(i.rate) * (1 - (Number(i.discountPercent) || 0) / 100);
    return { taxable: round2(taxable), tax: round2((taxable * (Number(i.taxPercent) || 0)) / 100) };
  });

  const taxAmount = round2(itemsTax + globalTax);
  const total = round2(subtotal - discountAmt + taxAmount + freight);

  return {
    subtotal: round2(subtotal),
    discountAmt: round2(discountAmt),
    itemsTax: round2(itemsTax),
    globalTax: round2(globalTax),
    taxAmount,
    freight: round2(freight),
    total,
    lines,
  };
}
