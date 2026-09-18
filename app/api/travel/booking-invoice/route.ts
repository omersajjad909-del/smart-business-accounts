/**
 * POST /api/travel/booking-invoice — raise the sales invoice for a booking.
 *
 * Until this existed a group booking was a number on a screen and nothing in
 * the books. The pilgrim's debt was tracked inside the booking record, so it
 * appeared on no customer ledger, in no ageing report and on no statement — and
 * an instalment "received" moved no cash anywhere. The operator could tell you
 * who owed what only by opening the Bookings page and reading it.
 *
 * The invoice is what puts the party on the customer ledger. From that moment
 * the balance is a receivable like any other: it ages, it appears on a
 * statement, and a CRV against that customer clears it.
 *
 * One invoice per booking, for the whole package, priced as pax × the agreed
 * per-pilgrim rate. Not one per instalment: an instalment is a promise to pay,
 * not a separate sale, and invoicing each one would put the same trip on the
 * ledger three times.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import {
  ensurePartyAccount,
  ensureRevenueAccount,
  ensureServiceItem,
  getNextSalesInvoiceNo,
} from "@/lib/travelAccounting";
import { bookingMoney, readBooking } from "@/lib/umrahBooking";
import { occupancyName, readDeparture } from "@/lib/umrahPackage";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

/** Hajj and Umrah packages get their own income head, not "Tour Package". */
const PACKAGE_REVENUE = "Hajj & Umrah Package Revenue";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const body = await req.json().catch(() => null);
    const recordId = String(body?.recordId || "").trim();
    if (!recordId) return NextResponse.json({ error: "recordId is required" }, { status: 400 });

    const record = await prisma.businessRecord.findFirst({
      where: { id: recordId, companyId, category: "umrah_booking" },
    });
    if (!record) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const data = (record.data ?? {}) as Record<string, unknown>;
    // Idempotent. A double-click on a slow connection must not put the same
    // trip on the ledger twice.
    if (data.invoiceId && data.invoiceNo) {
      return NextResponse.json({
        success: true,
        invoiceId: String(data.invoiceId),
        invoiceNo: String(data.invoiceNo),
        reused: true,
      });
    }

    const booking = readBooking(data);
    const money = bookingMoney(booking);

    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "A cancelled booking cannot be invoiced" }, { status: 400 });
    }
    if (!booking.partyName.trim()) {
      return NextResponse.json({ error: "The booking needs a name before it can be invoiced" }, { status: 400 });
    }
    if (money.total <= 0) {
      return NextResponse.json({ error: "The booking has no value — set a price first" }, { status: 400 });
    }

    const departure = booking.departureId
      ? await prisma.businessRecord.findFirst({
          where: { id: booking.departureId, companyId, category: "umrah_departure" },
        })
      : null;
    const dep = departure ? readDeparture(departure.data) : null;

    /* Due on the visa cut-off, not on the departure. The money has to be in
       before the file is filed, so that is the date the invoice should start
       ageing against — an invoice due on the flight is an invoice that was
       already too late when it fell due. */
    const issueDate = new Date();
    let dueDate: Date | null = null;
    if (dep?.departureDate) {
      const cutoff = new Date(dep.departureDate);
      cutoff.setDate(cutoff.getDate() - 14);
      dueDate = cutoff;
    }

    const label = `${dep?.title || booking.departureTitle || "Package"} — ${occupancyName(booking.occupancy)}`;

    const [customer, item, revenueAccount, invoiceNo] = await Promise.all([
      ensurePartyAccount({ companyId, name: booking.partyName.trim(), partyType: "CUSTOMER", openDate: issueDate }),
      ensureServiceItem(companyId, "Hajj / Umrah Package", booking.pricePerPilgrim),
      ensureRevenueAccount(companyId, PACKAGE_REVENUE),
      getNextSalesInvoiceNo(companyId),
    ]);

    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId,
        branchId,
        invoiceNo,
        customerId: customer.id,
        date: issueDate,
        dueDate,
        total: money.total,
        // The pilgrims are named here because this invoice is what a family
        // keeps, and "3 pax" tells them nothing about who is going.
        notes: [
          label,
          booking.pilgrims.map((p) => p.name).filter(Boolean).join(", "),
          booking.bookingNo ? `Booking ${booking.bookingNo}` : "",
        ].filter(Boolean).join("\n"),
        reference: booking.bookingNo || record.title,
        paymentTerms: "Credit",
        location: "TRAVEL",
        approvalStatus: "PENDING",
        items: {
          create: [
            {
              itemId: item.id,
              // One line, pax × rate. The pilgrims are individuals to the
              // embassy and one party to the invoice.
              qty: money.pax,
              rate: booking.pricePerPilgrim,
              amount: money.total,
            },
          ],
        },
      },
    });

    await prisma.voucher.create({
      data: {
        companyId,
        branchId,
        voucherNo: invoice.invoiceNo,
        type: "SI",
        date: issueDate,
        narration: `${label} — ${booking.partyName} (${money.pax} pax)`,
        entries: {
          create: [
            { companyId, accountId: customer.id, amount: money.total },
            { companyId, accountId: revenueAccount.id, amount: -money.total },
          ],
        },
      },
    });

    await prisma.businessRecord.update({
      where: { id: record.id },
      data: {
        // Confirmed on invoicing: an enquiry that has been billed is not an
        // enquiry any more.
        status: booking.status === "enquiry" ? "confirmed" : booking.status,
        data: {
          ...data,
          status: booking.status === "enquiry" ? "confirmed" : booking.status,
          customerId: customer.id,
          invoiceId: invoice.id,
          invoiceNo: invoice.invoiceNo,
          invoicedAt: issueDate.toISOString(),
        },
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelBookingInvoice",
      entityId: invoice.id,
      action: "CREATE",
      afterValues: { invoiceNo: invoice.invoiceNo, total: money.total, pax: money.pax },
      description: `Invoiced booking ${record.title} as ${invoice.invoiceNo} — ${money.total.toLocaleString()}`,
    });

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      customerName: customer.name,
      total: money.total,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to invoice the booking" },
      { status: 500 },
    );
  }
}
