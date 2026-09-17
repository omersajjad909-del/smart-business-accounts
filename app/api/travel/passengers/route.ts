/**
 * POST /api/travel/passengers — save the passengers on a booking.
 *
 * The booking's sale value and supplier cost are written from the passenger
 * rows, never taken from the request. A client that can post its own total is a
 * client that can post a total which is not the sum of its lines, and the first
 * time those disagree there is no way to tell which one was right.
 *
 * Refused once the booking has been invoiced. The invoice was raised for a
 * value; changing the passengers underneath it would leave the ledger charging
 * for a party that no longer exists. Refund it and raise it again — that path
 * exists, and it leaves a trail.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { readPassengers, totalPassengers, validatePassengers } from "@/lib/travelPassengers";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);
const ALLOWED = new Set(["travel_ticket", "travel_tour"]);

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const recordId = String(body?.recordId || "").trim();
    if (!recordId) return NextResponse.json({ error: "recordId is required" }, { status: 400 });

    const record = await prisma.businessRecord.findFirst({ where: { id: recordId, companyId } });
    if (!record) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!ALLOWED.has(record.category)) {
      return NextResponse.json({ error: "This document does not carry passengers" }, { status: 400 });
    }

    const data = (record.data ?? {}) as Record<string, unknown>;
    if (data.invoiceId) {
      return NextResponse.json(
        {
          error:
            `This booking is already invoiced as ${String(data.invoiceNo || "an invoice")}. ` +
            "Refund it first — changing the passengers under a raised invoice would leave the " +
            "ledger charging for a party that no longer exists.",
        },
        { status: 409 },
      );
    }

    const passengers = readPassengers(body?.passengers);
    const problems = validatePassengers(passengers);
    if (problems.length) {
      return NextResponse.json({ error: problems.join(" ") }, { status: 400 });
    }

    const totals = totalPassengers(passengers);

    const updated = await prisma.businessRecord.update({
      where: { id: record.id },
      data: {
        // Derived here, from the rows. See the note at the top.
        amount: totals.sale,
        data: {
          ...data,
          passengers,
          cost: totals.cost,
          paxCount: totals.count,
          paxSeats: totals.seats,
          // The lead passenger still names the file, so every screen that shows
          // one name goes on showing a sensible one.
          passenger: passengers[0]?.name || String(data.passenger || ""),
        },
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelPassengers",
      entityId: record.id,
      action: "UPDATE",
      afterValues: { passengers, totals },
      description: `Set ${totals.count} passengers on ${record.title} — sale ${totals.sale.toLocaleString()}, cost ${totals.cost.toLocaleString()}`,
    });

    return NextResponse.json({ success: true, totals, record: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save passengers" },
      { status: 500 },
    );
  }
}
