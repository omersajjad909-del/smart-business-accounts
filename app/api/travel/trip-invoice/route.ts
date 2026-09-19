/**
 * POST /api/travel/trip-invoice — raise one invoice for a whole trip.
 *
 * The point of a trip is that the flight, the hotel, the visa and the transfer
 * are one thing to the customer. They should be one thing to the ledger too:
 * one invoice, one receivable, one line per service, and a margin that is the
 * trip's rather than five margins nobody adds up.
 *
 * The invoice total is the booking's own saleTotal, which was itself summed
 * from the items on the server. Nothing here trusts a number from the client.
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

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

/** What each service is called on the ledger. */
const REVENUE_ACCOUNT: Record<string, string> = {
  FLIGHT: "Air Ticket Sales",
  HOTEL: "Hotel Booking Sales",
  VISA: "Visa Service Income",
  PASSPORT: "Passport Service Income",
  TRANSPORT: "Transport Income",
  INSURANCE: "Travel Insurance Income",
  TOUR: "Tour Package Sales",
  HAJJ: "Hajj Package Sales",
  UMRAH: "Umrah Package Sales",
  FEE: "Agency Service Fees",
};

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot raise invoices." }, { status: 403 });
    }

    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const body = (await req.json().catch(() => null)) as { bookingId?: string } | null;
    const bookingId = String(body?.bookingId || "").trim();
    if (!bookingId) return NextResponse.json({ error: "A booking id is required" }, { status: 400 });

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: { items: true },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Already done. Hand back what exists rather than raising a second one.
    if (booking.invoiceId && booking.invoiceNo) {
      return NextResponse.json({
        success: true,
        invoiceId: booking.invoiceId,
        invoiceNo: booking.invoiceNo,
        reused: true,
      });
    }

    if (!booking.items.length) {
      return NextResponse.json({ error: "This trip has no services on it to invoice" }, { status: 400 });
    }
    if (booking.saleTotal <= 0) {
      return NextResponse.json({ error: "This trip's value is zero — price the services first" }, { status: 400 });
    }
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "A cancelled trip cannot be invoiced" }, { status: 409 });
    }

    const issueDate = new Date();

    /* One item per service, so the invoice reads the way the customer was
       quoted — a flight line, a hotel line, a visa line — rather than a single
       "travel services" total nobody can question. */
    const [customer, invoiceNo, ...lines] = await Promise.all([
      ensurePartyAccount({ companyId, name: booking.customerName, partyType: "CUSTOMER", openDate: issueDate }),
      getNextSalesInvoiceNo(companyId),
      ...booking.items.map(async (item) => {
        const amount = Math.round(item.sale * item.qty * 100) / 100;
        const [serviceItem, revenue] = await Promise.all([
          ensureServiceItem(companyId, `${item.productType} — ${item.title}`.slice(0, 120), item.sale),
          ensureRevenueAccount(companyId, REVENUE_ACCOUNT[item.productType] || "Travel Income"),
        ]);
        return { item, serviceItem, revenue, amount };
      }),
    ]);

    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId,
        branchId,
        invoiceNo,
        customerId: customer.id,
        date: issueDate,
        total: booking.saleTotal,
        reference: booking.bookingNo,
        notes: `Trip ${booking.bookingNo} — ${booking.items.length} service${booking.items.length === 1 ? "" : "s"}`,
        paymentTerms: "Cash",
        location: "TRAVEL",
        approvalStatus: "PENDING",
        items: {
          create: lines.map((line) => ({
            itemId: line.serviceItem.id,
            qty: line.item.qty,
            rate: line.item.sale,
            amount: line.amount,
          })),
        },
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    /* The double entry: the customer owes the whole trip, and each service's
       revenue account is credited with its own share. Split rather than lumped,
       so a month's flight income and a month's visa income can be told apart. */
    await prisma.voucher.create({
      data: {
        companyId,
        branchId,
        voucherNo: invoice.invoiceNo,
        type: "SI",
        date: issueDate,
        narration: `Trip ${booking.bookingNo} - ${booking.customerName}`,
        entries: {
          create: [
            { companyId, accountId: customer.id, amount: booking.saleTotal },
            ...lines.map((line) => ({ companyId, accountId: line.revenue.id, amount: -line.amount })),
          ],
        },
      },
    });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, status: booking.status === "draft" ? "confirmed" : booking.status },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "Booking",
      entityId: booking.id,
      action: "UPDATE",
      afterValues: updated,
      description:
        `Invoiced trip ${booking.bookingNo} as ${invoice.invoiceNo} — ` +
        `${booking.saleTotal.toLocaleString()} across ${booking.items.length} service${booking.items.length === 1 ? "" : "s"}`,
    });

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      total: booking.saleTotal,
      lines: lines.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not raise the invoice" },
      { status: 500 },
    );
  }
}
