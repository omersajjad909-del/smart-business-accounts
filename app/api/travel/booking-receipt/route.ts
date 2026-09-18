/**
 * POST /api/travel/booking-receipt — receive one instalment against a booking.
 *
 * Marking an instalment "paid on 3 August" inside the booking record moved no
 * money anywhere. The schedule said the money had arrived; the cash book and
 * the customer ledger did not know. An operator could have a booking reading
 * "paid in full" beside a customer account still showing the whole balance.
 *
 * Receiving money is a posting, not a date field, so it happens here: cash or
 * bank is debited, the party's receivable is credited, and the instalment is
 * stamped with the voucher number it came in on.
 *
 * Refused until the booking has been invoiced. Crediting a customer who was
 * never debited would push their account negative — the money would land in the
 * books as though the agency owed the pilgrim.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import { ensurePartyAccount } from "@/lib/travelAccounting";
import { bookingMoney, readBooking } from "@/lib/umrahBooking";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

/** The account the money lands in when no bank is named. */
async function cashAccount(companyId: string, openDate: Date) {
  const existing = await prisma.account.findFirst({
    where: { companyId, type: "ASSET", name: { contains: "Cash", mode: "insensitive" }, deletedAt: null },
  });
  if (existing) return existing;
  return prisma.account.create({
    data: { companyId, code: "1001", name: "Cash in Hand", type: "ASSET", openDate },
  });
}

async function nextReceiptNo(companyId: string): Promise<string> {
  const last = await prisma.voucher.findFirst({
    where: { companyId, voucherNo: { startsWith: "RV-TRV-" } },
    orderBy: { voucherNo: "desc" },
    select: { voucherNo: true },
  });
  const seq = last ? Number(String(last.voucherNo).replace(/\D/g, "")) || 0 : 0;
  return `RV-TRV-${String(seq + 1).padStart(4, "0")}`;
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
    const instalmentId = String(body?.instalmentId || "").trim();
    if (!recordId || !instalmentId) {
      return NextResponse.json({ error: "recordId and instalmentId are required" }, { status: 400 });
    }

    const record = await prisma.businessRecord.findFirst({
      where: { id: recordId, companyId, category: "umrah_booking" },
    });
    if (!record) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const data = (record.data ?? {}) as Record<string, unknown>;
    const booking = readBooking(data);

    if (!data.invoiceId) {
      return NextResponse.json(
        {
          error:
            "Raise the invoice first. Crediting a customer who was never debited would show the " +
            "agency owing the pilgrim.",
        },
        { status: 409 },
      );
    }

    const instalment = booking.instalments.find((i) => i.id === instalmentId);
    if (!instalment) return NextResponse.json({ error: "Instalment not found" }, { status: 404 });
    if (instalment.paidDate) {
      return NextResponse.json({ error: "That instalment is already receipted" }, { status: 409 });
    }

    // What actually came in. Part-payments against an instalment are ordinary —
    // a family brings what they have — so the amount is the caller's, capped at
    // what the instalment is for.
    const amount = Math.round((Number(body?.amount) || instalment.amount) * 100) / 100;
    if (!(amount > 0)) return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    if (amount > instalment.amount + 0.01) {
      return NextResponse.json(
        { error: `That instalment is for ${instalment.amount.toLocaleString()} — receipt cannot exceed it.` },
        { status: 400 },
      );
    }

    const date = body?.date ? new Date(String(body.date)) : new Date();
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    const customer = await ensurePartyAccount({
      companyId,
      name: booking.partyName.trim(),
      partyType: "CUSTOMER",
      openDate: date,
    });

    /* Where the money went. A named bank account when the caller gives one,
       otherwise cash — an Umrah instalment is very often handed over in notes,
       and forcing a bank on it would misstate the cash book. */
    const bankId = String(body?.bankAccountId || "").trim();
    const into = bankId
      ? await prisma.account.findFirst({ where: { id: bankId, companyId, deletedAt: null } })
      : null;
    const debitAccount = into || (await cashAccount(companyId, date));

    const voucherNo = await nextReceiptNo(companyId);
    await prisma.voucher.create({
      data: {
        companyId,
        branchId,
        voucherNo,
        type: "CRV",
        date,
        narration: `${booking.bookingNo || record.title} — instalment from ${booking.partyName}`,
        entries: {
          create: [
            { companyId, accountId: debitAccount.id, amount },
            { companyId, accountId: customer.id, amount: -amount },
          ],
        },
      },
    });

    const instalments = booking.instalments.map((i) =>
      i.id === instalmentId
        ? { ...i, amount, paidDate: date.toISOString().slice(0, 10), receiptNo: voucherNo }
        : i,
    );
    const after = bookingMoney({ ...booking, instalments });

    await prisma.businessRecord.update({
      where: { id: record.id },
      data: { data: { ...data, instalments } },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelBookingReceipt",
      entityId: record.id,
      action: "CREATE",
      afterValues: { voucherNo, amount, balance: after.balance },
      description: `Received ${amount.toLocaleString()} on ${record.title} — ${voucherNo}, balance ${after.balance.toLocaleString()}`,
    });

    return NextResponse.json({
      success: true,
      voucherNo,
      amount,
      into: debitAccount.name,
      balance: after.balance,
      paidPercent: after.percentPaid,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to receive the instalment" },
      { status: 500 },
    );
  }
}
