// FILE: lib/invoiceAmounts.ts
//
// The parts of an invoice total, worked out one way.
//
// Invoices store only `total`, which carries tax and freight:
//
//     total = (Σ qty × rate − discount) + tax + freight
//
// (see the total formula in the sales and purchase invoice routes). Tax is not
// stored, so it is whatever the total carries beyond the taxable value and
// freight — exact for item-level and invoice-level tax alike.
//
// Revenue is what the sale posts to Sales (lib/salesPosting.ts): the total
// less tax, freight recovered included. Reports that used `total` as revenue
// were counting the government's GST as the company's sales.

export type InvoiceLike = {
  total: number | null;
  discount?: number | null;
  discountType?: string | null;
  freight?: number | null;
  items: { qty: number | null; rate: number | null }[];
};

export function invoiceParts(inv: InvoiceLike) {
  const total = Number(inv.total || 0);
  const gross = inv.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.rate || 0), 0);
  const discount = inv.discountType === "percent" ? (gross * Number(inv.discount || 0)) / 100 : Number(inv.discount || 0);
  const taxable = gross - discount;
  const freight = Number(inv.freight || 0);
  const tax = Math.max(0, total - taxable - freight);
  return { total, gross, discount, taxable, freight, tax, revenue: total - tax };
}

/** Revenue (tax excluded) of an invoice. */
export const invoiceRevenue = (inv: InvoiceLike) => invoiceParts(inv).revenue;
