/**
 * POST /api/travel/departure-settlement — raise a supplier bill for a departure.
 *
 * A group departure is bought in blocks, not ticket by ticket: forty air seats
 * from a consolidator, a room allocation from a Saudi hotel, forty visas from a
 * visa agent. Three suppliers, three bills, none of which belongs to any one
 * pilgrim — which is why the per-ticket settlement could not express them and
 * the payable for a whole departure was appearing nowhere at all.
 *
 * It posts like a purchase bill, the same way the ticket settlement does: the
 * cost to its own head, the money owed to the supplier's account, where a CPV
 * clears it. There is no Purchase Invoice here for the same reason — that
 * document is built for goods with quantities and stock movement, and a block
 * of forty seats is none of those.
 *
 * The component matters. "We owe the consolidator 7.4m" is a fact; "air 7.4m,
 * hotel 9.9m, visas 1.1m" is a departure an owner can read, and the P&L splits
 * the same way.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import { ensureExpenseAccount, ensurePartyAccount } from "@/lib/travelAccounting";
import { readDeparture } from "@/lib/umrahPackage";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

/** What a departure is bought in, and the head each lands in. */
const COMPONENTS: Record<string, { label: string; account: string }> = {
  air: { label: "Air seats", account: "Airline Settlement Cost" },
  visa: { label: "Visas", account: "Embassy / Visa Fee" },
  hotel: { label: "Hotel rooms", account: "Hotel Supplier Cost" },
  transport: { label: "Transport", account: "Travel & Courier Expense" },
  other: { label: "Other", account: "Tour Supplier Cost" },
};

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const body = await req.json().catch(() => null);
    const departureId = String(body?.departureId || "").trim();
    const supplierName = String(body?.supplierName || "").trim();
    const componentKey = String(body?.component || "other");
    const amount = Math.round((Number(body?.amount) || 0) * 100) / 100;

    if (!departureId) return NextResponse.json({ error: "departureId is required" }, { status: 400 });
    if (!supplierName) return NextResponse.json({ error: "Name the supplier" }, { status: 400 });
    if (!(amount > 0)) return NextResponse.json({ error: "The bill must be more than zero" }, { status: 400 });

    const component = COMPONENTS[componentKey] || COMPONENTS.other;

    const record = await prisma.businessRecord.findFirst({
      where: { id: departureId, companyId, category: "umrah_departure" },
    });
    if (!record) return NextResponse.json({ error: "Departure not found" }, { status: 404 });
    const departure = readDeparture(record.data);

    const date = body?.date ? new Date(String(body.date)) : new Date();
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    const dueDate = body?.dueDate ? new Date(String(body.dueDate)) : null;

    const supplier = await ensurePartyAccount({ companyId, name: supplierName, partyType: "SUPPLIER", openDate: date });
    const costAccount = await ensureExpenseAccount(companyId, component.account);

    /* Numbered off the trip rather than a global sequence, so a departure's
       bills read together: SET-UMR-2610-1, -2, -3. An operator chasing what is
       owed on one trip should not have to remember three unrelated numbers. */
    const trip = departure.tripNumber || record.title;
    const existing = await prisma.businessRecord.count({
      where: { companyId, category: "travel_settlement", refId: record.id },
    });
    const settlementRef = `SET-${trip}-${existing + 1}`;

    await prisma.voucher.create({
      data: {
        companyId,
        branchId,
        voucherNo: settlementRef,
        // A purchase bill, not a payment. Nothing has left the bank yet.
        type: "PI",
        date,
        narration: `${settlementRef} — ${component.label} for ${departure.title || trip} (${supplier.name})`,
        entries: {
          create: [
            { companyId, accountId: costAccount.id, amount },
            { companyId, accountId: supplier.id, amount: -amount },
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
        // Linked to the departure, so the trip's bills can be found from it.
        refId: record.id,
        amount,
        date: dueDate || date,
        data: {
          sourceCategory: "umrah_departure",
          sourceTitle: departure.title || trip,
          sourceRecordId: record.id,
          supplierId: supplier.id,
          supplierName: supplier.name,
          component: componentKey,
          componentLabel: component.label,
          qty: Number(body?.qty) || 0,
          remarks: String(body?.remarks || ""),
        },
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelDepartureSettlement",
      entityId: settlement.id,
      action: "CREATE",
      afterValues: { settlementRef, amount, component: componentKey, supplier: supplier.name },
      description: `Raised ${settlementRef} — ${component.label} ${amount.toLocaleString()} to ${supplier.name}`,
    });

    return NextResponse.json({
      success: true,
      settlementRef,
      amount,
      supplierName: supplier.name,
      component: component.label,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to raise the supplier bill" },
      { status: 500 },
    );
  }
}
