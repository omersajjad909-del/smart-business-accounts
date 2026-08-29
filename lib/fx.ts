// FILE: lib/fx.ts
//
// One rule, in one place: the ledger is kept in the company's own currency.
//
// A document may be raised in any currency — a USD invoice to a Dubai customer,
// a EUR bill from a supplier — and the document keeps its own figure, because
// that is the number printed on it and the number the customer will pay. What
// cannot be in that currency is the double entry behind it. A trial balance is
// a single column of money that has to add to zero; put 1,000 into it because
// the invoice said USD 1,000, and the ledger now claims the customer owes one
// thousand rupees for a two-hundred-and-eighty-thousand-rupee sale.
//
// That is exactly what was happening. Every route that took a currency wrote a
// CurrencyTransaction with the converted figure in `amountInBase` — correctly —
// and then posted the *unconverted* figure to the voucher. The reports built on
// CurrencyTransaction (the dashboard, the summaries) were right; the ledger, the
// trial balance, the balance sheet and every party's statement were wrong, by
// the exchange rate, on every foreign transaction. Nothing failed and nothing
// warned: the books simply understated foreign business by a factor of the rate.
//
// So conversion lives here and every posting site calls it, rather than each
// one remembering to multiply.

/**
 * The multiplier that turns a document's own currency into the company's books.
 *
 * The direction is local → base: `amountInBase = amountInLocal × rate`. That is
 * the direction every existing CurrencyTransaction was written with, so it is
 * the direction the stored history means, whatever the field is called. For a
 * company keeping books in PKR, a USD document has a rate around 280.
 *
 * Returns 1 for a document with no currency on it, which is almost all of them —
 * so a single-currency company goes through this untouched.
 *
 * A missing, zero or nonsensical rate also returns 1 rather than throwing or
 * multiplying by zero. A document posted at par is visibly wrong to whoever
 * reads the ledger and can be corrected; one posted at zero is invisible, and
 * one that throws loses the whole invoice over a field somebody left blank.
 */
export function baseRate(currencyId: unknown, exchangeRate: unknown): number {
  if (!currencyId) return 1;
  const rate = Number(exchangeRate);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

/**
 * A document amount, in the currency the books are kept in.
 *
 * Rounded to two places, and — this is the point — meant to be called once per
 * document and the result used for both legs of the entry. Converting each leg
 * separately lets the two round in opposite directions on a rate like 283.4567,
 * which leaves the voucher a paisa out of balance and the trial balance out by
 * a paisa per foreign invoice, for ever.
 */
export function toBase(amount: unknown, rate: number): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Number((n * rate).toFixed(2));
}
