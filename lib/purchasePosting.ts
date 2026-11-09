// FILE: lib/purchasePosting.ts
//
// The ledger legs of a purchase invoice, posted one way.
//
// A purchase invoice used to post `Dr Inventory / Cr Supplier` for the whole
// total, tax included. Two things were wrong with that:
//
//   * Input tax (GST / VAT) the company can claim back was buried in
//     Inventory, so it never reached a tax return and stock was overstated.
//   * The stock sub-ledger (InventoryTxn) values receipts at qty × rate, tax
//     excluded, so the GL and the sub-ledger disagreed by the tax on every
//     taxed bill.
//
// For a company that switched on "Input Tax on Purchases" (Business Features):
//
//     Dr  Inventory           net of tax (freight stays in — landed cost)
//     Dr  Input Tax           tax charged by the supplier
//         Cr  Supplier            invoice total
//
// For everyone else the old posting is kept exactly: Dr Inventory / Cr Supplier
// for the whole total.
//
// Mirror image of lib/salesPosting.ts.

import { toBase } from "@/lib/fx";
import type { Db } from "@/lib/inventoryAccounts";
import { getCompanyAdminControlSettings } from "@/lib/companyAdminControl";

/**
 * Whether this company posts purchase tax to its own Input Tax account. Off
 * unless the company switched it on (Business Features), so books of companies
 * that never asked for it post exactly as they always did.
 */
export async function separatesInputTax(companyId: string): Promise<boolean> {
  try {
    const settings = await getCompanyAdminControlSettings(companyId);
    return settings.features?.separateInputTax === true;
  } catch {
    return false;
  }
}

/**
 * The asset account input tax is debited to. Charts name it differently —
 * "Input VAT", "Input Tax", "Sales Tax Receivable", "GST Receivable" — so it is
 * matched by name, never an income-tax or advance/withholding account.
 */
export async function resolveInputTaxAccountId(db: Db, companyId: string): Promise<string> {
  const candidates = await db.account.findMany({
    where: { companyId, deletedAt: null, name: { contains: "tax", mode: "insensitive" } },
    select: { id: true, name: true, type: true },
    orderBy: { code: "asc" },
  });
  const vat = await db.account.findMany({
    where: { companyId, deletedAt: null, name: { contains: "vat", mode: "insensitive" } },
    select: { id: true, name: true, type: true },
    orderBy: { code: "asc" },
  });
  const assets = [...candidates, ...vat].filter(
    (a) => /^ASSET/i.test(a.type || "") && !/income|withhold|advance/i.test(a.name),
  );
  const pick =
    assets.find((a) => /input/i.test(a.name)) ??
    assets.find((a) => /receivable|recoverable/i.test(a.name));
  if (pick) return pick.id;

  const created = await db.account.create({
    data: { companyId, code: "ST-REC", name: "Input Tax Receivable", type: "ASSET" },
    select: { id: true },
  });
  return created.id;
}

/**
 * Balanced entries for one purchase invoice, in the company's base currency.
 * `total` is the invoice total (tax and freight included), `tax` the tax on it.
 * Inventory takes the remainder so the voucher balances to the paisa after
 * conversion.
 */
export async function purchaseInvoiceEntries(
  db: Db,
  opts: {
    companyId: string; supplierId: string; inventoryAccountId: string; total: number; tax: number; rate: number;
    /** Result of separatesInputTax(). When false the whole total goes to Inventory, as before. */
    separateTax: boolean;
  },
): Promise<{ companyId: string; accountId: string; amount: number }[]> {
  const { companyId, supplierId, inventoryAccountId, rate } = opts;
  const totalBase = toBase(opts.total, rate);
  const taxBase = opts.separateTax && opts.tax > 0 ? Math.min(toBase(opts.tax, rate), totalBase) : 0;

  const entries = [
    { companyId, accountId: inventoryAccountId, amount: Number((totalBase - taxBase).toFixed(2)) },
    { companyId, accountId: supplierId, amount: -totalBase },
  ];
  if (taxBase > 0) {
    entries.push({ companyId, accountId: await resolveInputTaxAccountId(db, companyId), amount: taxBase });
  }
  return entries;
}
