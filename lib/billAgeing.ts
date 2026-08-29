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

/** Whole days a bill has been outstanding as on the report date. */
export function billDays(billDate: Date, asOn: Date): number {
  return Math.max(0, Math.floor((asOn.getTime() - billDate.getTime()) / 86400000));
}

export type BillStatus = "PAID" | "PARTIAL" | "UNPAID";

export function billStatus(amount: number, balance: number): BillStatus {
  if (balance <= BILL_EPS) return "PAID";
  if (balance >= amount - BILL_EPS) return "UNPAID";
  return "PARTIAL";
}
