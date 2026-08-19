// FILE: lib/trialBalance.ts
//
// One trial balance, computed in one place.
//
// There were two: /api/reports/trial-balance, which the report screen reads and
// which counts every voucher, and /api/trial-balance, which counted `CRV` and
// `CPV` only. The second one silently dropped sales, purchases, journals, cost
// of sales and everything manufacturing posts — a factory that had produced and
// sold all month saw a page of zeros. Nothing in the app called it, so the two
// were free to disagree for as long as they liked.
//
// Both routes now come through here. Their responses keep their own shapes; the
// numbers behind them can no longer drift apart.

import { prisma } from "@/lib/prisma";

export type TrialBalanceRow = {
  code: string | null;
  name: string;
  category: string;
  opDebit: number;
  opCredit: number;
  transDebit: number;
  transCredit: number;
  clDebit: number;
  clCredit: number;
};

export type TrialBalanceTotals = Omit<TrialBalanceRow, "code" | "name" | "category">;

export type TrialBalance = { rows: TrialBalanceRow[]; totals: TrialBalanceTotals };

function resolveCategory(acc: { partyType?: string | null; type?: string | null }) {
  if (acc.partyType === "EMPLOYES" || acc.partyType === "EMPLOYEE") return "EMPLOYEES";
  if (acc.partyType === "CUSTOMER") return "CUSTOMERS";
  if (acc.partyType === "SUPPLIER") return "SUPPLIERS";
  if (acc.type === "ASSET")     return "ASSETS";
  if (acc.type === "LIABILITY") return "LIABILITIES";
  if (acc.type === "EQUITY")    return "EQUITY";
  if (acc.type === "INCOME")    return "INCOME";
  if (acc.type === "EXPENSE")   return "EXPENSES";
  return "OTHERS";
}

/**
 * Opening balance, movement and closing balance per account.
 *
 * Every voucher type counts. A trial balance that picks and chooses which
 * vouchers to believe is not a trial balance — it will not balance, and the one
 * thing this report exists to prove is that the books do.
 *
 * Soft-deleted accounts are deliberately included when they carry entries: an
 * account can be retired after it has been posted to, and dropping it would
 * take its side of those entries out of the totals and unbalance the report.
 * Deleted *vouchers* are excluded, because their entries are excluded too.
 *
 * `branchId` narrows to one branch; null (the default when no branch is chosen)
 * reports the whole company.
 */
export async function computeTrialBalance(opts: {
  companyId: string;
  branchId?: string | null;
  /** Inclusive period start. Defaults to everything ever posted. */
  from?: Date;
  /** Inclusive period end. Defaults to now. */
  to?: Date;
}): Promise<TrialBalance> {
  const fromDate = opts.from ?? new Date("2000-01-01");
  const toDate = opts.to ?? new Date();
  const branchFilter = opts.branchId ? { branchId: opts.branchId } : {};
  const voucherWhere = { companyId: opts.companyId, deletedAt: null, ...branchFilter };

  // Four queries, not two per account.
  const [accounts, openingEntries, periodDebits, periodCredits] = await Promise.all([
    prisma.account.findMany({ where: { companyId: opts.companyId }, orderBy: [{ name: "asc" }] }),

    // Opening: net movement before the period starts.
    prisma.voucherEntry.groupBy({
      by: ["accountId"],
      where: { voucher: { ...voucherWhere, date: { lt: fromDate } } },
      _sum: { amount: true },
    }),

    // Entry amounts are signed: positive is a debit, negative a credit.
    prisma.voucherEntry.groupBy({
      by: ["accountId"],
      where: { amount: { gt: 0 }, voucher: { ...voucherWhere, date: { gte: fromDate, lte: toDate } } },
      _sum: { amount: true },
    }),
    prisma.voucherEntry.groupBy({
      by: ["accountId"],
      where: { amount: { lt: 0 }, voucher: { ...voucherWhere, date: { gte: fromDate, lte: toDate } } },
      _sum: { amount: true },
    }),
  ]);

  const openingMap = new Map(openingEntries.map((e) => [e.accountId, e._sum.amount ?? 0]));
  const debitMap = new Map(periodDebits.map((e) => [e.accountId, e._sum.amount ?? 0]));
  const creditMap = new Map(periodCredits.map((e) => [e.accountId, Math.abs(e._sum.amount ?? 0)]));

  const rows: TrialBalanceRow[] = [];
  for (const acc of accounts) {
    const openingFromMaster = Number(acc.openDebit || 0) - Number(acc.openCredit || 0);
    const openingNet = openingFromMaster + (openingMap.get(acc.id) ?? 0);
    const transDebit = debitMap.get(acc.id) ?? 0;
    const transCredit = creditMap.get(acc.id) ?? 0;
    const closingNet = openingNet + (transDebit - transCredit);

    // An account that has never been touched is noise on a trial balance.
    if (openingNet === 0 && transDebit === 0 && transCredit === 0) continue;

    rows.push({
      code: acc.code,
      name: acc.name,
      category: resolveCategory(acc),
      opDebit:  openingNet > 0 ? openingNet : 0,
      opCredit: openingNet < 0 ? Math.abs(openingNet) : 0,
      transDebit,
      transCredit,
      clDebit:  closingNet > 0 ? closingNet : 0,
      clCredit: closingNet < 0 ? Math.abs(closingNet) : 0,
    });
  }

  const totals = rows.reduce<TrialBalanceTotals>(
    (a, r) => ({
      opDebit:     a.opDebit     + r.opDebit,
      opCredit:    a.opCredit    + r.opCredit,
      transDebit:  a.transDebit  + r.transDebit,
      transCredit: a.transCredit + r.transCredit,
      clDebit:     a.clDebit     + r.clDebit,
      clCredit:    a.clCredit    + r.clCredit,
    }),
    { opDebit: 0, opCredit: 0, transDebit: 0, transCredit: 0, clDebit: 0, clCredit: 0 },
  );

  return { rows, totals };
}
