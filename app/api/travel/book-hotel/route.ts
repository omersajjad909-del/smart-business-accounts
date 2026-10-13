/**
 * POST /api/travel/book-hotel — a hotel reservation as a file the accounts see.
 *
 * Writes the same travel_hotel record the Hotel & Package desk has always kept,
 * so invoicing, settlement and the customer timeline go on working untouched.
 * The totals are not taken on trust: nights and margin are worked out here from
 * the dates and the two prices, and a stay that ends before it starts is
 * refused rather than saved as a negative number of nights.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveBranchIdOrDefault, resolveCompanyId } from "@/lib/tenant";
import { raiseTravelSettlement, type RaisedSettlement } from "@/lib/travel/settlement";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);
const ALLOWED_STATUS = new Set(["quoted", "confirmed"]);
const MEAL_PLANS = new Set(["room_only", "with_breakfast", "half_board", "full_board", "all_inclusive"]);

const day = (value: unknown) => String(value ?? "").slice(0, 10);
const text = (value: unknown) => String(value ?? "").trim();

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot create bookings. Ask an administrator." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "A booking is required" }, { status: 400 });

    const bookingRef = text(body.bookingRef);
    const guestName = text(body.guestName);
    const hotelName = text(body.hotelName);
    const supplier = text(body.supplier) || hotelName;
    const checkIn = day(body.checkIn);
    const checkOut = day(body.checkOut);
    const status = text(body.status) || "confirmed";
    const rooms = Math.max(1, Math.floor(Number(body.rooms) || 1));
    const sale = Number(body.sale) || 0;
    const cost = Number(body.cost) || 0;

    const problems: string[] = [];
    if (!bookingRef) problems.push("A booking reference is required.");
    if (!guestName) problems.push("A guest name is required.");
    if (!hotelName) problems.push("A hotel is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) problems.push("Check-in and check-out dates are required.");
    else if (checkOut <= checkIn) problems.push("Check-out must be after check-in.");
    if (sale <= 0) problems.push("A sale price is required.");
    if (cost < 0) problems.push("Supplier cost cannot be negative.");
    if (!ALLOWED_STATUS.has(status)) problems.push(`A new booking cannot start as "${status}".`);
    if (problems.length) return NextResponse.json({ error: problems.join(" ") }, { status: 400 });

    const clash = await prisma.businessRecord.findFirst({
      where: { companyId, category: "travel_hotel", title: bookingRef },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json({ error: `Booking ${bookingRef} already exists. Give this one its own reference.` }, { status: 409 });
    }

    const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
    const mealPlan = MEAL_PLANS.has(text(body.mealPlan)) ? text(body.mealPlan) : "room_only";
    const branchId = await resolveBranchIdOrDefault(req, companyId);

    const record = await prisma.businessRecord.create({
      data: {
        companyId,
        branchId: branchId || null,
        category: "travel_hotel",
        title: bookingRef,
        status,
        amount: sale,
        date: new Date(checkIn),
        data: {
          guestName,
          customerName: text(body.customerName) || guestName,
          hotelName,
          destination: text(body.destination),
          checkOut,
          nights,
          rooms,
          guests: Math.max(1, Math.floor(Number(body.guests) || 1)),
          roomType: text(body.roomType),
          mealPlan,
          supplier,
          supplierRef: text(body.supplierRef),
          cost,
          paymentDue: day(body.paymentDue) || null,
          contactPhone: text(body.contactPhone),
          notes: text(body.notes),
          bookedVia: "hotel_wizard",
        },
      },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "TravelHotel",
      entityId: record.id,
      action: "CREATE",
      afterValues: record,
      description: `Booked ${bookingRef} — ${hotelName}, ${nights} night${nights === 1 ? "" : "s"}, sale ${sale.toLocaleString()}, cost ${cost.toLocaleString()}`,
    });

    /* A confirmed room is owed to the hotel from today; a quote holds nothing.
       The booking is saved either way — a settlement that cannot be raised is
       reported beside it, not allowed to undo it. */
    let settlement: RaisedSettlement | null = null;
    let settlementWarning = "";
    if (status === "confirmed") {
      try {
        settlement = await raiseTravelSettlement(req, companyId, record.id);
      } catch (settleError) {
        settlementWarning = settleError instanceof Error ? settleError.message : "Settlement could not be raised";
      }
    }

    return NextResponse.json({ success: true, record, nights, settlement, settlementWarning });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save the booking" },
      { status: 500 },
    );
  }
}
