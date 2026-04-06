/**
 * Currency-aware amount resolution.
 *
 * When an invoice is created in a foreign currency, a CurrencyTransaction
 * record is saved with amountInBase (converted to company base currency).
 * Use these helpers everywhere you need the correct base-currency value.
 */

import { prisma } from "@/lib/prisma";

/**
 * Fetch amountInBase for a list of invoice IDs.
 * Returns a Map<invoiceId, amountInBase>.
 * Invoices with no CurrencyTransaction → not in map → caller should fall back to invoice.total.
 */
export async function getBaseAmounts(invoiceIds: string[]): Promise<Map<string, number>> {
  if (!invoiceIds.length) return new Map();
  const cts = await prisma.currencyTransaction.findMany({
    where: { transactionId: { in: invoiceIds }, transactionType: "INVOICE" },
    select: { transactionId: true, amountInBase: true },
  });
  return new Map(cts.map((ct) => [ct.transactionId, Number(ct.amountInBase)]));
}

/**
 * Resolve the base-currency amount for a single invoice.
 * Falls back to rawTotal when no CurrencyTransaction exists (single-currency case).
 */
export function resolveAmount(
  id: string,
  rawTotal: number,
  baseAmounts: Map<string, number>
): number {
  return baseAmounts.get(id) ?? rawTotal;
}

/**
 * Currency-aware SUM for a set of already-fetched invoice objects.
 * Each item must have { id: string; total: number }.
 */
export function sumWithCurrency(
  items: { id: string; total: number }[],
  baseAmounts: Map<string, number>
): number {
  return items.reduce((s, inv) => s + resolveAmount(inv.id, Number(inv.total), baseAmounts), 0);
}
