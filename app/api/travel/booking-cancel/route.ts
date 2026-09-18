/**
 * POST /api/travel/booking-cancel — cancel a group booking, keeping the charge.
 *
 * A pilgrim pulling out of an Umrah is not a free event. The operator has
 * already bought the seat and blocked the room, and the consolidator rarely
 * gives all of it back — so the agency keeps a cancellation charge out of what
 * was paid, refunds the rest, and is left with whatever the supplier kept.
 *
 * Three figures, and only the first is arithmetic:
 *
 *   paid so far      — known, from the receipts already posted
 *   charge retained  — the agency's own decision, on its own terms
 *   refunded         — what actually goes back, paid ≤ refund + charge
 *
 * Reverses rather than erases, like every other undo in this system. A credit
 * note takes the sale off revenue and drops the receivable; the charge moves to
 * its own income head so a month of cancellations is visible as cancellations
 * rather than as a thinner month of sales. The refund, when there is one, is a
 * payment out.
 *
 * The booking is kept and marked cancelled. It held the seat, and a departure
 * that sold forty seats and cancelled six is a different business from one that
 * sold thirty-four.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import { ensurePartyAccount, ensureRevenueAccount } from "@/lib/travelAccounting";
import { bookingMoney, readBooking } from "@/lib/umrahBooking";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

/** Kept out of a cancelled booking. Its own head — see the note above. */
const CANCELLATION_INCOME = "Cancellation & Service Charges";

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function nextNo(companyId: string, prefix: string): Promise<string> {
  const last = await prisma.voucher.findFirst({
    where: { companyId, voucherNo: { startsWith: prefix } },
    orderBy: { voucherNo: "desc" },
    select: { voucherNo: true },
  });
  const seq = last ? Number(String(last.voucherNo).replace(/\D/g, "")) || 0 : 0;
  return `${prefix}${String(seq + 1).padStart(4, "0")}`;
}

async function cashAccount(companyId: string, openDate: Date) {
  const existing = await prisma.account.findFirst({
    where: { companyId, type: "ASSET", name: { contains: "Cash", mode: "insensitive" }, deletedAt: null },
  });
  if (existing) return existing;
  return prisma.account.create({
    data: { companyId, code: "1001", name: "Cash in Hand", type: "ASSET", openDate },
  });
}

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
    const booking = readBooking(data);
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "This booking is already cancelled" }, { status: 409 });
    }
    if (booking.status === "travelled") {
      return NextResponse.json(
        { error: "They have already travelled — that is not a cancellation." },
        { status: 409 },
      );
    }

    const money = bookingMoney(booking);
    const charge = round2(body?.charge);
    const refund = round2(body?.refund);

    /* Checked rather than clamped. The agency cannot keep more than the party
       ever handed over, and cannot refund money it never received — either one
       means the operator read the wrong figure, and posting a plausible wrong
       entry is worse than refusing. */
    if (charge < 0 || refund < 0) {
      return NextResponse.json({ error: "Neither figure can be negative" }, { status: 400 });
    }
    if (round2(charge + refund) > money.paid + 0.01) {
      return NextResponse.json(
        {
          error:
            `Only ${money.paid.toLocaleString()} has been received — the charge and the refund ` +
            `cannot come to ${round2(charge + refund).toLocaleString()} between them.`,
        },
        { status: 400 },
      );
    }

    const date = body?.date ? new Date(String(body.date)) : new Date();
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    const reason = String(body?.reason || "").trim();
    const customer = booking.partyName.trim()
      ? await ensurePartyAccount({ companyId, name: booking.partyName.trim(), partyType: "CUSTOMER", openDate: date })
      : null;

    let creditNoteNo = "";
    let refundVoucherNo = "";

    /* ── Reverse the sale ──
       Only where one was raised. A booking cancelled before it was invoiced has
       nothing on the ledger to take off, and writing a credit note against a
       sale that never posted would leave revenue negative. */
    if (data.invoiceId && customer && money.total > 0) {
      const revenue = await ensureRevenueAccount(companyId, "Hajj & Umrah Package Revenue");
      const retained = await ensureRevenueAccount(companyId, CANCELLATION_INCOME);
      creditNoteNo = await nextNo(companyId, "CN-BKG-");

      const entries: { companyId: string; accountId: string; amount: number }[] = [
        // The whole sale comes off revenue…
        { companyId, accountId: revenue.id, amount: money.total },
        // …and the receivable goes with it, less whatever is being kept.
        { companyId, accountId: customer.id, amount: -round2(money.total - charge) },
      ];
      if (charge > 0) entries.push({ companyId, accountId: retained.id, amount: -charge });

      await prisma.voucher.create({
        data: {
          companyId, branchId, voucherNo: creditNoteNo, type: "CN", date,
          narration: `${booking.bookingNo || record.title} — booking cancelled${reason ? `: ${reason}` : ""}`,
          entries: { create: entries },
        },
      });
    }

    /* ── Pay the money back ──
       A separate voucher, because it is a separate event: the credit note is
       the sale being undone and this is cash leaving the drawer, often days
       apart and sometimes not at all. */
    if (refund > 0 && customer) {
      const from = await cashAccount(companyId, date);
      refundVoucherNo = await nextNo(companyId, "PV-BKG-");
      await prisma.voucher.create({
        data: {
          companyId, branchId, voucherNo: refundVoucherNo, type: "CPV", date,
          narration: `${booking.bookingNo || record.title} — refund to ${booking.partyName}`,
          entries: {
            create: [
              { companyId, accountId: customer.id, amount: refund },
              { companyId, accountId: from.id, amount: -refund },
            ],
          },
        },
      });
    }

    await prisma.businessRecord.update({
      where: { id: record.id },
      data: {
        status: "cancelled",
        data: {
          ...data,
          status: "cancelled",
          cancelledAt: date.toISOString(),
          cancelReason: reason,
          cancellationCharge: charge,
          cancellationRefund: refund,
          creditNoteNo,
          refundVoucherNo,
        },
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelBookingCancel",
      entityId: record.id,
      action: "UPDATE",
      afterValues: { charge, refund, creditNoteNo, refundVoucherNo },
      description:
        `Cancelled booking ${record.title} — kept ${charge.toLocaleString()}, ` +
        `refunded ${refund.toLocaleString()}`,
    });

    return NextResponse.json({
      success: true,
      charge,
      refund,
      creditNoteNo,
      refundVoucherNo,
      // Seats go back on the departure the moment this saves: the departures
      // screen counts sold seats off live bookings and skips cancelled ones.
      seatsReleased: money.pax,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel the booking" },
      { status: 500 },
    );
  }
}
