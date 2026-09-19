/**
 * POST /api/travel/trip-quote — send the customer a price before they agree.
 *
 * A trip goes out as a quotation and comes back as a booking. Invoicing it
 * straight away is the wrong order: the customer has not said yes, nothing is
 * owed, and a receivable raised against a conversation is a receivable that
 * ages on a debtor who never bought anything.
 *
 * So this writes an ordinary Quotation — the same one the rest of FinovaOS
 * prints, emails and converts — with one line per service, and records it on
 * the booking. The margin is deliberately not on it: a quotation is what the
 * customer sees.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import { ensurePartyAccount, ensureServiceItem } from "@/lib/travelAccounting";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

/** The next QT- number for this company, matching app/api/quotation. */
async function nextQuotationNo(companyId: string): Promise<string> {
  const last = await prisma.quotation.findFirst({
    where: { companyId, quotationNo: { startsWith: "QT-" } },
    orderBy: { createdAt: "desc" },
    select: { quotationNo: true },
  });
  let next = 1;
  if (last?.quotationNo) {
    const n = parseInt(last.quotationNo.replace("QT-", ""), 10);
    if (!Number.isNaN(n)) next = n + 1;
  }

  // Deletions leave gaps and two desks can quote in the same second, so the
  // number is walked forward until it is free rather than trusted first time.
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = `QT-${String(next + attempt).padStart(4, "0")}`;
    const clash = await prisma.quotation.findFirst({ where: { companyId, quotationNo: candidate }, select: { id: true } });
    if (!clash) return candidate;
  }
  return `QT-${Date.now().toString().slice(-6)}`;
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot send quotations." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as { bookingId?: string; validDays?: number } | null;
    const bookingId = String(body?.bookingId || "").trim();
    if (!bookingId) return NextResponse.json({ error: "A booking id is required" }, { status: 400 });

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: { items: true },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (booking.quotationId && booking.quotationNo) {
      return NextResponse.json({
        success: true,
        quotationId: booking.quotationId,
        quotationNo: booking.quotationNo,
        reused: true,
      });
    }
    if (!booking.items.length) {
      return NextResponse.json({ error: "This trip has no services on it to quote" }, { status: 400 });
    }
    if (booking.saleTotal <= 0) {
      return NextResponse.json({ error: "This trip's value is zero — price the services first" }, { status: 400 });
    }

    const issueDate = new Date();
    /* A fare that is not held expires, and a quotation with no end date is one
       an agent has to honour in March at January's price. */
    const validDays = Math.min(90, Math.max(1, Number(body?.validDays) || 7));

    const [customer, quotationNo, ...lines] = await Promise.all([
      ensurePartyAccount({ companyId, name: booking.customerName, partyType: "CUSTOMER", openDate: issueDate }),
      nextQuotationNo(companyId),
      ...booking.items.map(async (item) => ({
        item,
        serviceItem: await ensureServiceItem(companyId, `${item.productType} — ${item.title}`.slice(0, 120), item.sale),
        amount: Math.round(item.sale * item.qty * 100) / 100,
      })),
    ]);

    const quotation = await prisma.quotation.create({
      data: {
        companyId,
        branchId: await resolveBranchIdOrDefault(req, companyId),
        quotationNo,
        date: issueDate,
        total: booking.saleTotal,
        validUntil: new Date(issueDate.getTime() + validDays * 864e5),
        status: "DRAFT",
        customerId: customer.id,
        customerName: booking.customerName,
        remarks: `Trip ${booking.bookingNo}${booking.travelDate ? ` — travelling ${booking.travelDate.toISOString().slice(0, 10)}` : ""}`,
        items: {
          create: lines.map((line) => ({
            itemId: line.serviceItem.id,
            qty: line.item.qty,
            rate: line.item.sale,
            amount: line.amount,
          })),
        },
      },
    });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        quotationId: quotation.id,
        quotationNo: quotation.quotationNo,
        // Quoting is itself a step forward, so a trip still sitting in draft
        // moves on rather than needing the status changed by hand.
        status: booking.status === "draft" ? "quoted" : booking.status,
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "Booking",
      entityId: booking.id,
      action: "UPDATE",
      afterValues: updated,
      description:
        `Quoted trip ${booking.bookingNo} as ${quotation.quotationNo} — ` +
        `${booking.saleTotal.toLocaleString()} across ${booking.items.length} service${booking.items.length === 1 ? "" : "s"}, ` +
        `valid ${validDays} days`,
    });

    return NextResponse.json({
      success: true,
      quotationId: quotation.id,
      quotationNo: quotation.quotationNo,
      total: booking.saleTotal,
      lines: lines.length,
      validUntil: quotation.validUntil,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the quotation" },
      { status: 500 },
    );
  }
}
