// FILE: lib/salesPosting.ts
//
// The revenue leg of a sale, posted one way.
//
// A sales invoice used to post `Dr Customer / Cr Sales` for
// `total + freight + taxAmount` — but `total` already carried the tax and the
// freight. Every taxed or freighted invoice charged the customer's ledger the
// tax and freight twice, and all of it, tax included, landed in Sales, so the
// P&L reported the government's GST as the company's revenue.
//
// Now:
//
//     Dr  Customer            invoice total
//         Cr  Sales               net of tax (freight recovered stays in sales)
//         Cr  Sales Tax Payable   tax charged
//
// The cost leg is separate — see lib/cogsPosting.ts.

import { toBase } from "@/lib/fx";
import type { Db } from "@/lib/inventoryAccounts";

/**
 * The revenue account a sale credits. Exact "Sales" first — what the sales
 * invoice route has always created — then any income account named for sales
 * that is not a return or tax account, then a new "Sales".
 */
export async function resolveSalesAccountId(db: Db, companyId: string): Promise<string> {
  const exact = await db.account.findFirst({
    where: { companyId, deletedAt: null, name: { equals: "Sales", mode: "insensitive" } },
    select: { id: true },
  });
  if (exact) return exact.id;

  const candidates = await db.account.findMany({
    where: { companyId, deletedAt: null, name: { contains: "sales", mode: "insensitive" } },
    select: { id: true, name: true, type: true },
    orderBy: { code: "asc" },
  });
  const income = candidates.find(
    (a) =>
      /^(INCOME|REVENUE)$/i.test(a.type || "") &&
      !/return|tax|discount/i.test(a.name),
  );
  if (income) return income.id;

  const created = await db.account.create({
    data: { companyId, code: "SALES", name: "Sales", type: "INCOME" },
    select: { id: true },
  });
  return created.id;
}

/**
 * The liability output tax is credited to. Charts name it differently —
 * "Sales Tax Payable (GST)", "Sales Tax Payable", "Tax Payable" — so it is
 * matched by name, never by an income-tax account.
 */
export async function resolveSalesTaxAccountId(db: Db, companyId: string): Promise<string> {
  const candidates = await db.account.findMany({
    where: { companyId, deletedAt: null, name: { contains: "tax", mode: "insensitive" } },
    select: { id: true, name: true, type: true },
    orderBy: { code: "asc" },
  });
  const liability = candidates.filter(
    (a) => /^LIABILIT/i.test(a.type || "") && !/income|withhold|advance/i.test(a.name),
  );
  const pick =
    liability.find((a) => /sales tax|gst|vat|output/i.test(a.name)) ??
    liability.find((a) => /tax payable/i.test(a.name));
  if (pick) return pick.id;

  const created = await db.account.create({
    data: { companyId, code: "ST-PAY", name: "Sales Tax Payable", type: "LIABILITY" },
    select: { id: true },
  });
  return created.id;
}

/**
 * Balanced entries for one sales invoice, in the company's base currency.
 * `total` is the invoice total (tax and freight included), `tax` the tax on it.
 * Sales takes the remainder so the voucher balances to the paisa after
 * conversion.
 */
export async function salesInvoiceEntries(
  db: Db,
  opts: { companyId: string; customerId: string; total: number; tax: number; rate: number },
): Promise<{ companyId: string; accountId: string; amount: number }[]> {
  const { companyId, customerId, rate } = opts;
  const totalBase = toBase(opts.total, rate);
  const taxBase = opts.tax > 0 ? toBase(opts.tax, rate) : 0;
  const salesAccountId = await resolveSalesAccountId(db, companyId);

  const entries = [
    { companyId, accountId: customerId, amount: totalBase },
    { companyId, accountId: salesAccountId, amount: -Number((totalBase - taxBase).toFixed(2)) },
  ];
  if (taxBase > 0) {
    entries.push({ companyId, accountId: await resolveSalesTaxAccountId(db, companyId), amount: -taxBase });
  }
  return entries;
}
