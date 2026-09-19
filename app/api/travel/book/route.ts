/**
 * POST /api/travel/book — turn a chosen flight and a party of passengers into
 * a ticket file.
 *
 * The record it writes is an ordinary travel_ticket business record, the same
 * one the Airline Tickets desk has always kept. That is the point: the wizard
 * is a nicer way in, not a second place where bookings live. Everything
 * downstream — invoicing, supplier settlement, refunds, the passenger dialog —
 * goes on working without knowing the booking came from here.
 *
 * The sale value and the supplier cost are summed from the passenger rows on
 * the server and never read from the request, for the same reason the passenger
 * route does it: a client that can post its own total can post one that is not
 * the sum of its lines, and the first time those disagree nobody can tell which
 * was right.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import { readPassengers, totalPassengers, validatePassengers } from "@/lib/travelPassengers";
import { describeRoute, type FlightLeg } from "@/lib/travel/flightSearch";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

/** What the wizard may set a new file to. Everything else is reached by doing
    the thing that causes it — you refund a booking, you do not type "refunded". */
const ALLOWED_STATUS = new Set(["quoted", "booked", "issued"]);

function readLegs(value: unknown): FlightLeg[] {
  if (!Array.isArray(value)) return [];
  const out: FlightLeg[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const leg = raw as Record<string, unknown>;
    const from = String(leg.from || "").toUpperCase();
    const to = String(leg.to || "").toUpperCase();
    if (!from || !to) continue;
    out.push({
      from,
      to,
      date: String(leg.date || "").slice(0, 10),
      departAt: String(leg.departAt || ""),
      arriveAt: String(leg.arriveAt || ""),
      durationMinutes: Number(leg.durationMinutes) || 0,
      via: Array.isArray(leg.via) ? leg.via.map((v) => String(v).toUpperCase()).filter(Boolean) : [],
      flightNo: String(leg.flightNo || ""),
      arrivesNextDay: Boolean(leg.arrivesNextDay),
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    /* Set by proxy.ts from the signed session, not by the page — a client that
       could assert its own role would be no check at all. */
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json(
        { error: "Your role cannot create bookings. Ask an administrator." },
        { status: 403 },
      );
    }

    const branchId = await resolveBranchIdOrDefault(req, companyId);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "A booking is required" }, { status: 400 });

    const bookingRef = String(body.bookingRef || "").trim();
    if (!bookingRef) {
      return NextResponse.json({ error: "A booking reference is required" }, { status: 400 });
    }

    /* Two files under one reference is how a booking gets invoiced twice — once
       against each — and the second invoice is the one nobody finds until the
       customer queries it. */
    const clash = await prisma.businessRecord.findFirst({
      where: { companyId, category: "travel_ticket", title: bookingRef },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json(
        { error: `Booking ${bookingRef} already exists. Give this one its own reference.` },
        { status: 409 },
      );
    }

    const passengers = readPassengers(body.passengers);
    const problems = validatePassengers(passengers);
    if (problems.length) {
      return NextResponse.json({ error: problems.join(" ") }, { status: 400 });
    }

    const supplier = String(body.supplier || "").trim();
    if (!supplier) {
      return NextResponse.json(
        { error: "An airline or consolidator is required — it is the account the payable lands in." },
        { status: 400 },
      );
    }

    const legs = readLegs(body.legs);
    if (!legs.length) {
      return NextResponse.json({ error: "A booking needs at least one flight" }, { status: 400 });
    }

    const status = String(body.status || "booked");
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: `A new booking cannot start as "${status}"` }, { status: 400 });
    }

    // Summed here, from the rows. See the note at the top of this file.
    const totals = totalPassengers(passengers);
    const route = describeRoute(legs);
    const travelDate = legs[0].date;

    const contact = (body.contact ?? {}) as Record<string, unknown>;
    const pnr = String(body.pnr || "").trim();

    const record = await prisma.businessRecord.create({
      data: {
        companyId,
        branchId: branchId || null,
        category: "travel_ticket",
        title: bookingRef,
        status,
        amount: totals.sale,
        date: travelDate ? new Date(travelDate) : null,
        data: {
          passenger: passengers[0]?.name || "",
          passengers,
          cost: totals.cost,
          paxCount: totals.count,
          paxSeats: totals.seats,
          route,
          pnr,
          // Kept in step with the supplier rather than entered beside it, so
          // every screen that reads `airline` keeps working and the two can
          // never disagree. The tickets desk does the same.
          airline: supplier,
          supplier,
          cabin: String(body.cabin || "economy"),
          legs,
          flightNo: legs.map((leg) => leg.flightNo).filter(Boolean).join(" / "),
          baggageKg: Number(body.baggageKg) || null,
          markup: Number(body.markup) || 0,
          paymentDue: String(body.paymentDue || "").slice(0, 10) || null,
          customerName: String(body.customerName || "").trim() || passengers[0]?.name || "",
          contactEmail: String(contact.email || "").trim(),
          contactPhone: String(contact.phone || "").trim(),
          contactAltPhone: String(contact.altPhone || "").trim(),
          notes: String(body.notes || "").trim(),
          /* Where the fare came from, kept with the booking.

             Months later, when the margin on this file is questioned, the
             difference between "the airline quoted this" and "we estimated it"
             is the whole answer — and by then nobody remembers. */
          fareSource: String(body.fareSource || "manual"),
          bookedVia: "flight_wizard",
        },
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelTicket",
      entityId: record.id,
      action: "CREATE",
      afterValues: record,
      description:
        `Booked ${bookingRef} — ${route}, ${totals.count} passenger${totals.count === 1 ? "" : "s"}, ` +
        `sale ${totals.sale.toLocaleString()}, cost ${totals.cost.toLocaleString()}`,
    });

    return NextResponse.json({ success: true, record, totals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save the booking" },
      { status: 500 },
    );
  }
}
