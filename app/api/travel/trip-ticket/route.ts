/**
 * /api/travel/trip-ticket — the ticket for a flight that is already on a trip.
 *
 * A trip is a Booking with BookingItems; the tickets desk is a BusinessRecord
 * with category "travel_ticket". They are different tables for good reason —
 * one is what the customer bought, the other is what the airline issued — but
 * until now the road only ran one way. `trip-attach` takes a ticket raised on
 * the desk and puts it on a trip. A flight typed straight into a trip had
 * nowhere to become a ticket: no PNR, no passenger list, and nothing on the
 * tickets desk, which for an Umrah package is most of the flights an agency
 * sells.
 *
 * This builds the ticket from the trip line and links the two, so the money is
 * counted once and both screens show the same booking.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

function clean(value: unknown, max = 120): string {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot issue tickets." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "A trip line is required" }, { status: 400 });

    const bookingId = clean(body.bookingId, 40);
    const itemId = clean(body.itemId, 40);
    const pnr = clean(body.pnr, 20).toUpperCase();
    if (!bookingId || !itemId) {
      return NextResponse.json({ error: "A trip and a flight line are required" }, { status: 400 });
    }
    if (!pnr) {
      return NextResponse.json({ error: "A PNR is required — it is what the airline issued" }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: { items: true, travelers: true },
    });
    if (!booking) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const item = booking.items.find((row) => row.id === itemId);
    if (!item) return NextResponse.json({ error: "That service is not on this trip" }, { status: 404 });
    if (item.productType !== "FLIGHT") {
      return NextResponse.json({ error: "Only a flight line becomes an airline ticket" }, { status: 400 });
    }

    /* Already done. Hand back what exists rather than issuing a second ticket
       against the same line — two records for one flight is how a payable gets
       paid twice. */
    if (item.sourceRecordId) {
      const existing = await prisma.businessRecord.findFirst({
        where: { id: item.sourceRecordId, companyId },
        select: { id: true, title: true, data: true },
      });
      if (existing) {
        return NextResponse.json({
          success: true,
          reused: true,
          recordId: existing.id,
          bookingRef: existing.title,
          pnr: (existing.data as Record<string, unknown> | null)?.pnr ?? null,
        });
      }
      // The record it pointed at is gone, so the line is free to be issued again.
    }

    const branchId = await resolveBranchIdOrDefault(req, companyId);

    /* The desk keys a ticket by its reference, so one is built from the trip
       and the line's position on it: BK-260922-397-F1, BK-260922-397-F2. The
       trip is readable in it, which is the point — somebody looking at the
       tickets desk should be able to see which journey it belongs to. */
    const flightLines = booking.items.filter((row) => row.productType === "FLIGHT");
    const position = flightLines.findIndex((row) => row.id === item.id) + 1;
    let bookingRef = `${booking.bookingNo}-F${position || 1}`;
    const clash = await prisma.businessRecord.findFirst({
      where: { companyId, category: "travel_ticket", title: bookingRef },
      select: { id: true },
    });
    if (clash) bookingRef = `${bookingRef}-${Date.now().toString().slice(-4)}`;

    const travelerIds = booking.travelers.map((row) => row.travelerId);
    const travelers = travelerIds.length
      ? await prisma.traveler.findMany({
          where: { companyId, id: { in: travelerIds } },
          select: { id: true, fullName: true, passportNo: true, dob: true },
        })
      : [];

    /* The people are already on the trip, so the ticket takes them rather than
       asking for the same names a second time — which is also how they end up
       spelled two different ways on one journey. */
    const passengers = travelers.map((person) => ({
      name: person.fullName,
      passport: person.passportNo || "",
      dob: person.dob ? person.dob.toISOString().slice(0, 10) : "",
      type: "adult",
    }));

    const legData = (item.data ?? {}) as Record<string, unknown>;
    const from = clean(legData.from, 10);
    const to = clean(legData.to, 10);
    const route = from && to ? (legData.leg === "ROUND" ? `${from} → ${to} → ${from}` : `${from} → ${to}`) : item.title;

    const record = await prisma.businessRecord.create({
      data: {
        companyId,
        branchId: branchId || null,
        category: "travel_ticket",
        title: bookingRef,
        status: "ticketed",
        amount: item.sale,
        date: item.serviceDate ?? booking.travelDate,
        data: {
          passenger: passengers[0]?.name || booking.customerName,
          passengers,
          paxCount: passengers.length || Number(item.qty) || 1,
          cost: item.cost,
          route,
          pnr,
          // Held in step with each other, as the desk and the wizard both do.
          airline: item.supplierName || "",
          supplier: item.supplierName || "",
          customerName: booking.customerName,
          ticketNumbers: clean(body.ticketNumbers, 200),
          /* What stops the same flight being billed twice.

             The trip carries this line and the trip is what gets invoiced, so
             a ticket raised from a trip must never be invoiced on its own.
             create-invoice reads these two fields and refuses. */
          bookingId: booking.id,
          bookingNo: booking.bookingNo,
          bookedVia: "trip",
        },
      },
    });

    /* The link the trip needs, in the field that already exists for it. It is
       also what keeps this ticket out of "Attach service" — that picker skips
       any record a trip line already points at. */
    await prisma.bookingItem.update({
      where: { id: item.id },
      data: {
        sourceCategory: "travel_ticket",
        sourceRecordId: record.id,
        status: "ticketed",
        data: { ...legData, pnr },
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelTicket",
      entityId: record.id,
      action: "CREATE",
      description: `Issued ticket ${bookingRef} (PNR ${pnr}) from trip ${booking.bookingNo}`,
    });

    return NextResponse.json({
      success: true,
      recordId: record.id,
      bookingRef,
      pnr,
      passengers: passengers.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not issue the ticket" },
      { status: 500 },
    );
  }
}
