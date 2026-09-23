/**
 * /api/travel/invoice-print — a travel invoice, in travel's own words.
 *
 * The ledger side of a travel sale is an ordinary SalesInvoice, and that is
 * right: an air ticket owes the customer money the same way a bag of cement
 * does. But the document the customer receives should not read like cement.
 * This assembles the printable form from whatever the sale actually was — a
 * ticket, a trip, or a seat on a departure — leaving the accounting alone.
 *
 * It reads; it never writes. The invoice already exists by the time anybody
 * prints it.
 */

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import {
  buildPackageInvoice,
  buildTicketInvoice,
  buildTripInvoice,
  type TravelInvoiceDoc,
} from "@/lib/travel/invoicePrint";
import { readBooking } from "@/lib/umrahBooking";
import { readDeparture } from "@/lib/umrahPackage";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string {
  return String(value ?? "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const params = req.nextUrl.searchParams;
    const kind = str(params.get("kind"));
    const id = str(params.get("id"));
    if (!kind || !id) return NextResponse.json({ error: "A kind and an id are required" }, { status: 400 });

    let doc: TravelInvoiceDoc | null = null;
    let partyName = "";
    let invoiceNo = "";
    let date = "";
    let total = 0;

    if (kind === "ticket") {
      const record = await prisma.businessRecord.findFirst({
        where: { id, companyId, category: "travel_ticket" },
      });
      if (!record) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      const data = asRecord(record.data);

      doc = buildTicketInvoice({
        bookingRef: record.title,
        pnr: str(data.pnr),
        route: str(data.route),
        airline: str(data.airline) || str(data.supplier),
        travelDate: str(data.travelDate) || (record.date ? record.date.toISOString() : ""),
        cabin: str(data.cabin),
        baggageKg: Number(data.baggageKg) || null,
        flightNo: str(data.flightNo),
        amount: Number(record.amount) || 0,
        paxCount: Number(data.paxCount) || 0,
        passenger: str(data.passenger),
        passengers: Array.isArray(data.passengers)
          ? (data.passengers as Record<string, unknown>[]).map((p) => ({
              name: str(p.name),
              passport: str(p.passport),
              type: str(p.type),
              ticketNo: str(p.ticketNo),
            }))
          : [],
      });
      // The party who pays is not always the passenger — a company sending staff.
      partyName = str(data.customerName) || str(data.passenger);
      invoiceNo = str(data.invoiceNo);
      date = record.date ? record.date.toISOString().slice(0, 10) : "";
      total = Number(record.amount) || 0;
    }

    if (kind === "trip") {
      const booking = await prisma.booking.findFirst({
        where: { id, companyId },
        include: { items: true, travelers: true },
      });
      if (!booking) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

      const travelerIds = booking.travelers.map((row) => row.travelerId);
      const travellers = travelerIds.length
        ? (await prisma.traveler.findMany({
            where: { companyId, id: { in: travelerIds } },
            select: { fullName: true },
          })).map((row) => row.fullName)
        : [];

      doc = buildTripInvoice({
        bookingNo: booking.bookingNo,
        customerName: booking.customerName,
        travelDate: booking.travelDate ? booking.travelDate.toISOString() : null,
        returnDate: null,
        travellers,
        items: booking.items.map((item) => ({
          productType: item.productType,
          title: item.title,
          supplierName: item.supplierName,
          sale: item.sale,
          qty: item.qty,
          data: asRecord(item.data),
        })),
      });
      partyName = booking.customerName;
      invoiceNo = str(booking.invoiceNo);
      date = booking.travelDate ? booking.travelDate.toISOString().slice(0, 10) : "";
      total = Number(booking.saleTotal) || 0;
    }

    if (kind === "package") {
      const record = await prisma.businessRecord.findFirst({
        where: { id, companyId, category: "umrah_booking" },
      });
      if (!record) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      const booking = readBooking(record.data);

      /* The departure holds the hotels and the group's flights — everyone on
         it shares them, which is what a departure is — so they are read from
         there rather than copied onto every booking. */
      const departureRecord = booking.departureId
        ? await prisma.businessRecord.findFirst({
            where: { id: booking.departureId, companyId, category: "umrah_departure" },
          })
        : null;
      const departure = departureRecord ? readDeparture(departureRecord.data) : null;

      doc = buildPackageInvoice({
        bookingRef: booking.bookingNo,
        departureTitle: booking.departureTitle || departure?.title || "",
        tripNumber: departure?.tripNumber,
        kind: departure?.kind || "umrah",
        departureDate: departure?.departureDate,
        returnDate: departure?.returnDate,
        legs: (departure?.legs ?? []).map((leg) => ({
          city: leg.city,
          hotelName: leg.hotelName,
          nights: leg.nights,
        })),
        pilgrims: booking.pilgrims.map((person) => ({
          name: person.name,
          passportNo: person.passportNo,
          // Everyone in the party took the same sharing option; it is the
          // booking that was priced, not each pilgrim separately.
          roomType: booking.occupancy ? `${booking.occupancy}-sharing` : "",
          sellPrice: booking.pricePerPilgrim,
        })),
        instalments: booking.instalments
          // Only what has actually been received. A due date is not a payment.
          .filter((row) => row.paidDate)
          .map((row) => ({ date: row.paidDate, amount: row.amount, note: row.receiptNo })),
        arrivalFlight: departure?.arrivalFlight,
        returnFlight: departure?.returnFlight,
      });
      partyName = booking.partyName;
      invoiceNo = str(booking.invoiceNo);
      date = departure?.departureDate || "";
      total = booking.pilgrims.length * (Number(booking.pricePerPilgrim) || 0);
    }

    if (!doc) return NextResponse.json({ error: `Unknown kind "${kind}"` }, { status: 400 });

    return NextResponse.json({ doc, partyName, invoiceNo, date, total });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not build the invoice" },
      { status: 500 },
    );
  }
}
