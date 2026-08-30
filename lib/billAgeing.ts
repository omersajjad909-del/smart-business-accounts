/**
 * Bill-wise settlement shared by the ageing reports and the dashboard.
 *
 * The app keeps no bill-to-receipt allocation table: an invoice posts a voucher
 * on the party account and a CRV/CPV posts the opposite side. So "is this bill
 * paid?" is answered the way an accountant answers it by hand — apply every
 * receipt to the oldest bill first and see what is left.
 */

export const BILL_EPS = 0.005;

export type PartyBill = {
  numType: string;
  date: Date;
  narration: string;
  amount: number;
};

export type SettledBill = PartyBill & { balance: number };

type EntryLike = {
  amount: unknown;
  voucher: { date: Date; voucherNo: string; narration: string | null; type: string };
};

/**
 * Split a party's voucher entries into bills and the credit available to
 * settle them. `opening` is signed so that a positive value is itself a bill.
 */
export function collectPartyBills(opts: {
  entries: EntryLike[];
  opening: number;
  openingDate: Date | null;
  asOn: Date;
  side: "RECEIVABLE" | "PAYABLE";
}): { bills: PartyBill[]; credit: number } {
  const { entries, opening, openingDate, asOn, side } = opts;
  const billSign = side === "RECEIVABLE" ? 1 : -1;

  const bills: PartyBill[] = [];
  let credit = 0;

  if (!openingDate || openingDate <= asOn) {
    if (opening > 0) {
      bills.push({
        numType:   "---",
        date:      openingDate ?? (entries[0] ? new Date(entries[0].voucher.date) : asOn),
        narration: "OPENING BALANCE B/F",
        amount:    opening,
      });
    } else if (opening < 0) {
      credit += Math.abs(opening);
    }
  }

  for (const e of entries) {
    const amount = Number(e.amount);
    if (!amount) continue;
    const v = e.voucher;
    if (Math.sign(amount) === billSign) {
      bills.push({
        numType:   v.voucherNo || v.type || "JV",
        date:      new Date(v.date),
        narration: v.narration || `Voucher # ${v.voucherNo}`,
        amount:    Math.abs(amount),
      });
    } else {
      credit += Math.abs(amount);
    }
  }

  return { bills, credit };
}

/** Oldest bill first, exactly how a party's receipts are adjusted by hand. */
export function settleBills(
  bills: PartyBill[],
  credit: number,
): { settled: SettledBill[]; unapplied: number } {
  const sorted = [...bills].sort((a, b) => a.date.getTime() - b.date.getTime());
  let available = credit;

  const settled = sorted.map(bill => {
    const applied = Math.min(available, bill.amount);
    available -= applied;
    return { ...bill, balance: bill.amount - applied };
  });

  return { settled, unapplied: available };
}

/** Calendar day of a timestamp, as stored (voucher dates are UTC midnight). */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * "As on 29-AUG" is the position at the *start* of 29-AUG: the day's own
 * entries are not in it yet, and the newest day it can age against is 28-AUG.
 * That is the convention the old desktop ageing uses, and matching it is what
 * removes the one-day drift between the two reports.
 */
export function asOnWindow(asOnKey: string): { before: Date; lastDay: Date } {
  const before = new Date(asOnKey + "T00:00:00.000Z");
  return { before, lastDay: new Date(before.getTime() - 86400000) };
}

/** Whole days a bill has been outstanding, counted on calendar days. */
export function billDays(billDate: Date, lastDay: Date): number {
  const from = Date.parse(dayKey(billDate) + "T00:00:00.000Z");
  const to   = Date.parse(dayKey(lastDay)  + "T00:00:00.000Z");
  return Math.max(0, Math.round((to - from) / 86400000));
}

/**
 * Which bills a party's credit terms make worth reporting. Either breach puts
 * a bill on the report: bills older than the agreed credit days, and — once
 * the party's whole outstanding is over the credit amount — every bill.
 * A party with no terms set is not filtered at all.
 */
export function creditFilter(opts: {
  creditDays: number | null;
  creditLimit: number | null;
  outstanding: number;
}) {
  const hasDays   = !!opts.creditDays && opts.creditDays > 0;
  const hasLimit  = !!opts.creditLimit && opts.creditLimit > 0;
  const overLimit = hasLimit && opts.outstanding > (opts.creditLimit as number) + BILL_EPS;

  return {
    hasTerms: hasDays || hasLimit,
    overLimit,
    /** true when this bill has to be shown */
    shows: (days: number) =>
      !hasDays && !hasLimit
        ? true
        : overLimit || (hasDays && days > (opts.creditDays as number)),
  };
}

export type BillStatus = "PAID" | "PARTIAL" | "UNPAID";

export function billStatus(amount: number, balance: number): BillStatus {
  if (balance <= BILL_EPS) return "PAID";
  if (balance >= amount - BILL_EPS) return "UNPAID";
  return "PARTIAL";
}
