// FILE: lib/travelAmend.ts
//
// Refunding, voiding and reissuing a travel document.
//
// Issuing a ticket writes in three places: a SalesInvoice, an SI voucher that
// debits the customer and credits revenue, and a travel_settlement record
// holding what is owed to the airline. Until now "cancelled" was a word typed
// into a status box and nothing else moved — the invoice stood, the customer
// still owed the full fare, and the airline was still shown as a payable for a
// seat nobody flew. Every cancelled ticket quietly overstated both sides of the
// balance sheet.
//
// Three operations, and each reverses rather than erases:
//
//   void    — the whole thing comes back. The customer is credited in full and
//             the supplier payable is written off. For a ticket cancelled
//             before anything was issued, where nobody keeps anything.
//   refund  — the ordinary case, and the reason this file is not a one-liner.
//             A cancellation is rarely free: the airline keeps part of the
//             fare and the agency keeps its service charge. So the customer
//             gets back less than they paid, the airline gives back less than
//             it was owed, and the difference on each side stays as income and
//             as cost. Both numbers are the operator's to enter, because only
//             they have the airline's penalty letter.
//   reissue — a date change. The old fare stands; the change fee is billed as
//             its own line, which is how the airline charges it and how the
//             agency earns on it.
//
// Nothing here deletes a voucher or an invoice. A credit note is a document in
// its own right — the auditor wants to see the sale, the credit and the reason,
// not a gap where a sale used to be.

import { prisma } from "@/lib/prisma";
import {
  TRAVEL_COST_ACCOUNTS,
  ensureExpenseAccount,
  ensurePartyAccount,
  ensureRevenueAccount,
  type TravelSourceCategory,
} from "@/lib/travelAccounting";

export class TravelAmendError extends Error {}

/** BusinessRecord categories this file knows how to reverse. */
const REFUNDABLE = new Set(["travel_ticket", "visa_case", "travel_hotel", "travel_tour"]);

/**
 * Where a cancellation charge lands.
 *
 * Deliberately its own head rather than netted off revenue. "We sold 4 lakh and
 * refunded 3.5" and "we sold 50 thousand" are the same profit and a completely
 * different business, and only the first tells an owner their cancellation rate
 * is eating the month.
 */
const CANCELLATION_INCOME = "Cancellation & Service Charges";

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

type RefundInput = {
  companyId: string;
  branchId?: string | null;
  recordId: string;
  /** What actually goes back to the passenger. Never more than they paid. */
  customerRefund: number;
  /** What the airline or embassy gives back to us. Never more than we owed. */
  supplierRefund: number;
  reason?: string;
  date?: string;
};

export type RefundResult = {
  recordId: string;
  status: string;
  creditNoteNo: string;
  customerRefund: number;
  supplierRefund: number;
  /** Kept by the agency out of the fare — income. */
  retainedIncome: number;
  /** Kept by the airline out of what it owed — cost. */
  supplierCharge: number;
};

async function nextCreditNoteNo(companyId: string, prefix: string): Promise<string> {
  const last = await prisma.voucher.findFirst({
    where: { companyId, voucherNo: { startsWith: prefix } },
    orderBy: { voucherNo: "desc" },
    select: { voucherNo: true },
  });
  const seq = last ? Number(String(last.voucherNo).replace(/\D/g, "")) || 0 : 0;
  return `${prefix}${String(seq + 1).padStart(4, "0")}`;
}

/**
 * Refund a travel document, keeping whatever each side retains.
 *
 * `void` is this with both refunds set to the full amount; there is no separate
 * code path, because a void is not a different kind of event — it is a refund
 * where nobody kept anything, and writing it twice is how the two drift apart.
 */
export async function refundTravelDocument(input: RefundInput): Promise<RefundResult> {
  const { companyId } = input;
  const date = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new TravelAmendError("Invalid date");

  return prisma.$transaction(async (tx) => {
    const record = await tx.businessRecord.findFirst({
      where: { id: input.recordId, companyId },
    });
    if (!record) throw new TravelAmendError("Document not found");
    if (!REFUNDABLE.has(record.category)) {
      throw new TravelAmendError("This document cannot be refunded here");
    }
    if (record.status === "refunded" || record.status === "void") {
      throw new TravelAmendError("This document has already been refunded");
    }

    const data = (record.data ?? {}) as Record<string, unknown>;
    const saleAmount = round2(Number(record.amount) || 0);
    const costAmount = round2(Number(data.cost) || 0);

    const customerRefund = round2(input.customerRefund);
    const supplierRefund = round2(input.supplierRefund);

    /* Checked rather than clamped. A refund larger than the sale is not a
       number to quietly trim — it means the operator read the wrong figure off
       the airline's letter, and trimming it would post a plausible wrong entry
       instead of asking. */
    if (customerRefund < 0 || supplierRefund < 0) {
      throw new TravelAmendError("A refund cannot be negative");
    }
    if (customerRefund > saleAmount) {
      throw new TravelAmendError(
        `The passenger paid ${saleAmount.toLocaleString()} — the refund cannot be more than that`,
      );
    }
    if (supplierRefund > costAmount) {
      throw new TravelAmendError(
        `The supplier was owed ${costAmount.toLocaleString()} — it cannot refund more than that`,
      );
    }

    const retainedIncome = round2(saleAmount - customerRefund);
    const supplierCharge = round2(costAmount - supplierRefund);
    const label = String(data.pnr || record.title);

    /* ── The customer side ──
       A credit note against the sale. The passenger's receivable falls by what
       they get back; what the agency keeps moves out of ticket revenue and into
       its own cancellation head, so the month can be read honestly. */
    const creditNoteNo = await nextCreditNoteNo(companyId, "CN-TRV-");
    const customerName = String(data.customerName || data.passenger || data.applicant || "");

    if (customerName && (customerRefund > 0 || retainedIncome > 0)) {
      const customer = await ensurePartyAccount({
        companyId,
        name: customerName,
        partyType: "CUSTOMER",
        openDate: date,
      });
      const ticketRevenue = await ensureRevenueAccount(
        companyId,
        String(data.revenueAccount || "Air Ticket Revenue"),
      );
      const retainedAccount = await ensureRevenueAccount(companyId, CANCELLATION_INCOME);

      const entries: { companyId: string; accountId: string; amount: number }[] = [
        // The whole sale comes off revenue…
        { companyId, accountId: ticketRevenue.id, amount: saleAmount },
        // …the passenger stops owing what they get back…
        { companyId, accountId: customer.id, amount: -customerRefund },
      ];
      // …and what the agency keeps is income of a different kind.
      if (retainedIncome > 0) {
        entries.push({ companyId, accountId: retainedAccount.id, amount: -retainedIncome });
      }

      await tx.voucher.create({
        data: {
          companyId,
          branchId: input.branchId || null,
          voucherNo: creditNoteNo,
          type: "CN",
          date,
          narration: `${label} — refunded${input.reason ? `: ${input.reason}` : ""}`,
          entries: { create: entries },
        },
      });
    }

    /* ── The supplier side ──
       The payable was a travel_settlement record, not a ledger posting, so this
       reverses it the same way: the settlement is reduced to whatever the
       airline actually keeps, and closed when it keeps nothing. */
    const supplierName = String(data.supplierName || data.supplier || data.airline || "");
    if (supplierName && supplierRefund > 0) {
      /* The supplier bill comes back by what the airline actually returns.
      
         Raising the settlement posted a purchase bill: the cost to its own head
         and the money owed to the supplier. Reducing only the settlement record
         would leave that bill standing in the ledger for a seat nobody flew, so
         it is reversed here for the refunded part — the supplier owes us less,
         and the cost of sale falls with it. What the airline keeps stays
         posted, because it is a real cost of the cancellation. */
      const supplier = await ensurePartyAccount({
        companyId,
        name: supplierName,
        partyType: "SUPPLIER",
        openDate: date,
      });
      const costAccount = await ensureExpenseAccount(
        companyId,
        TRAVEL_COST_ACCOUNTS[record.category as TravelSourceCategory] || "Airline Settlement Cost",
      );
      await tx.voucher.create({
        data: {
          companyId,
          branchId: input.branchId || null,
          voucherNo: `${creditNoteNo}-S`,
          type: "PR",
          date,
          narration: `${label} — supplier refund from ${supplier.name}`,
          entries: {
            create: [
              { companyId, accountId: supplier.id, amount: supplierRefund },
              { companyId, accountId: costAccount.id, amount: -supplierRefund },
            ],
          },
        },
      });
    }

    const settlementId = String(data.settlementId || "");
    if (settlementId) {
      const settlement = await tx.businessRecord.findFirst({
        where: { id: settlementId, companyId, category: "travel_settlement" },
      });
      if (settlement) {
        const settlementData = (settlement.data ?? {}) as Record<string, unknown>;
        await tx.businessRecord.update({
          where: { id: settlement.id },
          data: {
            amount: supplierCharge,
            status: supplierCharge > 0 ? "pending" : "settled",
            data: {
              ...settlementData,
              refundedAt: date.toISOString(),
              supplierRefund,
              /* The original figure, kept. Without it the settlement reads as
                 though the airline was only ever owed the penalty, and the
                 refund it paid back leaves no trace anywhere. */
              originalAmount: costAmount,
              remarks: `Refunded — supplier returned ${supplierRefund.toLocaleString()}, kept ${supplierCharge.toLocaleString()}`,
            },
          },
        });
      }
    }

    const status = customerRefund >= saleAmount && supplierRefund >= costAmount ? "void" : "refunded";

    await tx.businessRecord.update({
      where: { id: record.id },
      data: {
        status,
        data: {
          ...data,
          refundedAt: date.toISOString(),
          refundReason: input.reason || "",
          customerRefund,
          supplierRefund,
          retainedIncome,
          supplierCharge,
          creditNoteNo,
        },
      },
    });

    return {
      recordId: record.id,
      status,
      creditNoteNo,
      customerRefund,
      supplierRefund,
      retainedIncome,
      supplierCharge,
    };
  }, { timeout: 20_000, maxWait: 10_000 });
}

/**
 * What a refund would do, without doing it.
 *
 * The screen shows this before the operator confirms, for the same reason the
 * production run is priced before it posts: a cancellation is the one moment in
 * a travel file where money moves in two directions at once, and nobody should
 * have to work out in their head which way each part went.
 */
export function quoteRefund(opts: {
  saleAmount: number;
  costAmount: number;
  customerRefund: number;
  supplierRefund: number;
}): {
  customerRefund: number;
  supplierRefund: number;
  retainedIncome: number;
  supplierCharge: number;
  /** What the agency is left with once both sides have settled. */
  netToAgency: number;
  errors: string[];
} {
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
    // What the agency keeps less what the airline keeps. Negative is a real and
    // common answer — an airline penalty larger than the agency's own charge
    // means the cancellation cost the agency money, and that is worth seeing
    // before confirming rather than at month end.
    netToAgency: round2(retainedIncome - supplierCharge),
    errors,
  };
}
