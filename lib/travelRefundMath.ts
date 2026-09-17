// FILE: lib/travelRefundMath.ts
//
// What a refund does to the money, worked out without touching anything.
//
// Split out of lib/travelAmend.ts so the refund dialog can use it. That file
// imports Prisma, and a client component importing from it pulled the whole
// database client into the browser bundle — which does not run there, so the
// page died with "PrismaClient is unable to run in this browser environment"
// before it rendered a single row.
//
// The rule this file exists to keep: anything a screen needs in order to show
// the operator what is about to happen has to be reachable without a database
// import. The posting lives next door and is the only half that needs one.

export type RefundQuote = {
  customerRefund: number;
  supplierRefund: number;
  /** Kept by the agency out of the fare — income. */
  retainedIncome: number;
  /** Kept by the airline out of what it owed — cost. */
  supplierCharge: number;
  /** What the agency is left with once both sides have settled. */
  netToAgency: number;
  errors: string[];
};

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * What a refund would do, without doing it.
 *
 * The screen shows this before the operator confirms, for the same reason a
 * production run is priced before it posts: a cancellation is the one moment in
 * a travel file where money moves in two directions at once, and nobody should
 * have to work out in their head which way each part went.
 */
export function quoteRefund(opts: {
  saleAmount: number;
  costAmount: number;
  customerRefund: number;
  supplierRefund: number;
}): RefundQuote {
  const saleAmount = round2(opts.saleAmount);
  const costAmount = round2(opts.costAmount);
  const customerRefund = round2(opts.customerRefund);
  const supplierRefund = round2(opts.supplierRefund);

  const errors: string[] = [];
  if (customerRefund < 0 || supplierRefund < 0) errors.push("A refund cannot be negative.");
  if (customerRefund > saleAmount) {
    errors.push(`The passenger paid ${saleAmount.toLocaleString()} — the refund cannot exceed it.`);
  }
  if (supplierRefund > costAmount) {
    errors.push(`The supplier was owed ${costAmount.toLocaleString()} — it cannot refund more.`);
  }

  const retainedIncome = round2(saleAmount - customerRefund);
  const supplierCharge = round2(costAmount - supplierRefund);

  return {
    customerRefund,
    supplierRefund,
    retainedIncome,
    supplierCharge,
    // Negative is a real and common answer — an airline penalty larger than the
    // agency's own charge means the cancellation cost the agency money, and
    // that is worth seeing before confirming rather than at month end.
    netToAgency: round2(retainedIncome - supplierCharge),
    errors,
  };
}
