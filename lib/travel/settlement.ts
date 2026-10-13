/**
 * Raising the supplier's payable for a travel file.
 *
 * Lives here, not in the route, because two things raise it: the settlement
 * button, and a booking that is saved as booked or issued — the moment the
 * airline has the seat the agency owes for it, whether or not anyone presses
 * anything. Two callers, one posting: the voucher can only be written one way.
 */

import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { logAuditFromReq } from "@/lib/auditLogger";
import { resolveBranchIdOrDefault } from "@/lib/tenant";
import {
  TRAVEL_COST_ACCOUNTS,
  buildTravelSource,
  ensureExpenseAccount,
  ensurePartyAccount,
} from "@/lib/travelAccounting";

export class SettlementError extends Error {}

export type RaisedSettlement = {
  settlementId: string;
  settlementRef: string;
  supplierName?: string;
  reused?: boolean;
};

export async function raiseTravelSettlement(
  req: NextRequest,
  companyId: string,
  recordId: string,
): Promise<RaisedSettlement> {
    const { record, source } = await buildTravelSource(companyId, recordId);
    const existingData = (record.data || {}) as Record<string, unknown>;
    if (existingData.settlementId && existingData.settlementRef) {
      return {
        settlementId: String(existingData.settlementId),
        settlementRef: String(existingData.settlementRef),
        reused: true,
      };
    }
    if (!source.supplierName) {
      throw new SettlementError("Supplier or airline name is required before settlement");
    }
    if (source.costAmount <= 0) {
      throw new SettlementError("Supplier cost must be greater than zero before settlement");
    }

    const supplier = await ensurePartyAccount({
      companyId,
      name: source.supplierName,
      partyType: "SUPPLIER",
      openDate: source.issueDate,
    });

    const settlementRef = `SET-${record.title}`;

    /* The supplier bill, in the ledger.
    
       This is the half that was missing, and it was the most expensive gap in
       the module. Raising a ticket posted the sale — debit the passenger,
       credit revenue — and the cost of that ticket was never posted at all. It
       lived in this settlement record and nowhere else, so the P&L showed the
       whole fare as profit: a ticket sold for 185,000 that cost 172,000 read as
       185,000 earned instead of 13,000, and the airline's payable never
       appeared in the trial balance or on its own supplier ledger.
    
       There is no Purchase Invoice here on purpose. That document is built for
       goods — items, quantities, rates, stock movement — and a seat on an
       aircraft is none of those. The settlement IS the agency's purchase
       document, so it posts like one: the cost to its own head, the money owed
       to the supplier's account, where a CPV can pay it off like any other
       creditor. */
    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const costAccount = await ensureExpenseAccount(
      companyId,
      TRAVEL_COST_ACCOUNTS[source.category] || "Airline Settlement Cost",
    );

    await prisma.voucher.create({
      data: {
        companyId,
        branchId,
        voucherNo: settlementRef,
        // A purchase bill, not a payment. Nothing has left the bank yet.
        type: "PI",
        date: source.issueDate,
        narration: `${settlementRef} — ${supplier.name} (${source.title})`,
        entries: {
          create: [
            { companyId, accountId: costAccount.id, amount: source.costAmount },
            { companyId, accountId: supplier.id, amount: -source.costAmount },
          ],
        },
      },
    });

    const settlement = await prisma.businessRecord.create({
      data: {
        companyId,
        branchId: record.branchId || null,
        category: "travel_settlement",
        title: settlementRef,
        status: "pending",
        refId: record.id,
        amount: source.costAmount,
        date: source.dueDate || source.issueDate,
        data: {
          sourceCategory: source.category,
          sourceTitle: source.title,
          sourceRecordId: record.id,
          supplierId: supplier.id,
          supplierName: supplier.name,
          customerName: source.customerName,
          invoiceNo: String(existingData.invoiceNo || ""),
          route: String(source.data.route || ""),
          country: String(source.data.country || ""),
          remarks: source.notes,
        },
      },
    });

    await prisma.businessRecord.update({
      where: { id: record.id },
      data: {
        data: {
          ...existingData,
          supplierId: supplier.id,
          supplierName: supplier.name,
          settlementId: settlement.id,
          settlementRef,
          settlementCreatedAt: new Date().toISOString(),
        },
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelSettlement",
      entityId: settlement.id,
      action: "CREATE",
      afterValues: settlement,
      description: `Created travel settlement ${settlementRef}`,
    });

  return {
    settlementId: settlement.id,
    settlementRef,
    supplierName: supplier.name,
  };
}
