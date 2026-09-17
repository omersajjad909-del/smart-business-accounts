/**
 * POST /api/travel/refund — refund or void a travel document.
 *
 * The money half of a cancellation. Until this existed, cancelling a ticket set
 * a word in a status box: the sales invoice stood, the passenger still owed the
 * full fare and the airline was still carried as a payable for a seat nobody
 * flew. Both sides of the balance sheet overstated, silently, on every cancelled
 * file.
 *
 * The two refund figures are the caller's to supply and are never guessed here.
 * What the airline keeps is on its penalty letter and what the agency keeps is
 * its own commercial decision; a default for either would be a number the
 * ledger presents as fact and nobody chose.
 *
 * See lib/travelAmend.ts for what it posts.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import { TravelAmendError, refundTravelDocument } from "@/lib/travelAmend";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    // A refund moves money in two directions at once. It is not a data entry
    // correction, so it is not open to whoever happens to be on the desk.
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const body = await req.json().catch(() => null);
    if (!body?.recordId) {
      return NextResponse.json({ error: "recordId is required" }, { status: 400 });
    }

    const result = await refundTravelDocument({
      companyId,
      branchId,
      recordId: String(body.recordId),
      customerRefund: Number(body.customerRefund) || 0,
      supplierRefund: Number(body.supplierRefund) || 0,
      reason: body.reason ? String(body.reason) : "",
      date: body.date ? String(body.date) : undefined,
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelRefund",
      entityId: result.recordId,
      action: "UPDATE",
      afterValues: result,
      description:
        `${result.status === "void" ? "Voided" : "Refunded"} travel document — ` +
        `passenger ${result.customerRefund.toLocaleString()}, supplier ${result.supplierRefund.toLocaleString()}` +
        ` (credit note ${result.creditNoteNo})`,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    // A refused refund is nearly always the operator reading a figure off the
    // wrong line of an airline letter, so the reason goes back verbatim.
    const status = error instanceof TravelAmendError ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refund" },
      { status },
    );
  }
}
