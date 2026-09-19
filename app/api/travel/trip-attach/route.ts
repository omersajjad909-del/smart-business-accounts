/**
 * /api/travel/trip-attach — put an existing desk record onto a trip.
 *
 * The verticals are not going anywhere. A ticket is still raised on the Airline
 * Tickets desk, a visa on the Visa desk, and everything those screens do — PNRs,
 * refunds, supplier settlement — goes on working exactly as it did. What was
 * missing was a way to say that this ticket and that visa are the same journey.
 *
 * So a BookingItem can point back at the record it came from, and the money
 * comes off that record rather than being typed a second time. Entering a price
 * twice is entering two prices, and the day they disagree nobody can say which
 * one the customer was quoted.
 */

import { NextRequest, NextResponse } from "next/server";

import { logAuditFromReq } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

/** Which desk produces which kind of service on a trip. */
const CATEGORY_TO_PRODUCT: Record<string, string> = {
  travel_ticket: "FLIGHT",
  travel_hotel: "HOTEL",
  visa_case: "VISA",
  travel_passport: "PASSPORT",
  travel_transport: "TRANSPORT",
  travel_insurance: "INSURANCE",
  travel_tour: "TOUR",
};

const CATEGORY_LABEL: Record<string, string> = {
  travel_ticket: "Airline ticket",
  travel_hotel: "Hotel booking",
  visa_case: "Visa case",
  travel_passport: "Passport service",
  travel_transport: "Transport",
  travel_insurance: "Insurance policy",
  travel_tour: "Tour",
};

/** What a desk record is worth, read from the record and never from the caller. */
function priceOf(record: { amount: number | null; data: unknown }) {
  const data = (record.data ?? {}) as Record<string, unknown>;
  return {
    sale: Math.max(0, Number(record.amount) || 0),
    cost: Math.max(0, Number(data.cost) || 0),
    supplierName: String(data.supplier || data.airline || data.insurer || data.hotelName || "") || null,
  };
}

/** A one-line description of the record, in the words its own desk uses. */
function describe(category: string, record: { title: string; data: unknown }) {
  const data = (record.data ?? {}) as Record<string, unknown>;
  const detail =
    category === "travel_ticket" ? [data.route, data.pnr].filter(Boolean).join(" · ")
    : category === "travel_hotel" ? [data.hotelName, data.destination].filter(Boolean).join(", ")
    : category === "visa_case" ? [data.country, data.applicant].filter(Boolean).join(" — ")
    : category === "travel_transport" ? [data.pickup, data.dropoff].filter(Boolean).join(" → ")
    : category === "travel_insurance" ? [data.destination, data.plan].filter(Boolean).join(" — ")
    : String(data.destination || data.tourName || "");
  return [record.title, detail].filter(Boolean).join(" — ").slice(0, 160);
}

/** Desk records not already on a trip. */
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const search = String(req.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);

    const records = await prisma.businessRecord.findMany({
      where: {
        companyId,
        category: { in: Object.keys(CATEGORY_TO_PRODUCT) },
        ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
        // A record that never carried a price is not a service anybody sold.
        amount: { gt: 0 },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, category: true, title: true, amount: true, date: true, data: true, status: true },
    });

    /* Already on a trip, so it is not offered again — the same ticket on two
       trips would be invoiced twice. */
    const taken = new Set(
      (await prisma.bookingItem.findMany({
        where: { sourceRecordId: { in: records.map((r) => r.id) } },
        select: { sourceRecordId: true },
      })).map((row) => row.sourceRecordId),
    );

    return NextResponse.json({
      records: records
        .filter((record) => !taken.has(record.id))
        .map((record) => {
          const price = priceOf(record);
          return {
            id: record.id,
            category: record.category,
            categoryLabel: CATEGORY_LABEL[record.category] || record.category,
            productType: CATEGORY_TO_PRODUCT[record.category],
            title: describe(record.category, record),
            status: record.status,
            date: record.date,
            ...price,
            margin: Math.round((price.sale - price.cost) * 100) / 100,
          };
        }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load services" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot change trips." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as { bookingId?: string; recordIds?: unknown } | null;
    const bookingId = String(body?.bookingId || "").trim();
    const recordIds = Array.isArray(body?.recordIds)
      ? Array.from(new Set(body.recordIds.map((id) => String(id || "").trim()).filter(Boolean))).slice(0, 50)
      : [];

    if (!bookingId || !recordIds.length) {
      return NextResponse.json({ error: "A trip and at least one service are required" }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({ where: { id: bookingId, companyId }, include: { items: true } });
    if (!booking) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    // The same reason the passenger route refuses: the invoice was raised for
    // a set of services, and adding to them underneath it would leave the
    // ledger charging for less than the trip now contains.
    if (booking.invoiceId) {
      return NextResponse.json(
        { error: `This trip is invoiced as ${booking.invoiceNo}. Credit the invoice before changing what is on it.` },
        { status: 409 },
      );
    }

    const records = await prisma.businessRecord.findMany({
      where: { companyId, id: { in: recordIds }, category: { in: Object.keys(CATEGORY_TO_PRODUCT) } },
    });
    if (!records.length) return NextResponse.json({ error: "None of those services were found" }, { status: 404 });

    const already = new Set(
      (await prisma.bookingItem.findMany({
        where: { sourceRecordId: { in: records.map((r) => r.id) } },
        select: { sourceRecordId: true },
      })).map((row) => row.sourceRecordId),
    );

    const fresh = records.filter((record) => !already.has(record.id));
    if (!fresh.length) {
      return NextResponse.json({ error: "Those services are already on a trip" }, { status: 409 });
    }

    await prisma.bookingItem.createMany({
      data: fresh.map((record) => {
        const price = priceOf(record);
        return {
          bookingId,
          productType: CATEGORY_TO_PRODUCT[record.category],
          title: describe(record.category, record),
          supplierName: price.supplierName,
          sale: price.sale,
          cost: price.cost,
          qty: 1,
          sourceCategory: record.category,
          sourceRecordId: record.id,
          status: record.status,
          serviceDate: record.date,
        };
      }),
    });

    // Re-summed from every line the trip now has, not added to the old total.
    const items = await prisma.bookingItem.findMany({ where: { bookingId } });
    const round = (n: number) => Math.round(n * 100) / 100;
    const saleTotal = round(items.reduce((sum, item) => sum + item.sale * item.qty, 0));
    const costTotal = round(items.reduce((sum, item) => sum + item.cost * item.qty, 0));

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { saleTotal, costTotal, marginTotal: round(saleTotal - costTotal) },
      include: { items: true },
    });

    await logAuditFromReq(req, {
      companyId,
      entity: "Booking",
      entityId: bookingId,
      action: "UPDATE",
      afterValues: updated,
      description: `Attached ${fresh.length} service${fresh.length === 1 ? "" : "s"} to trip ${booking.bookingNo}`,
    });

    return NextResponse.json({ success: true, attached: fresh.length, booking: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not attach the services" },
      { status: 500 },
    );
  }
}

/** Take a service back off a trip. The desk record itself is untouched. */
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) {
      return NextResponse.json({ error: "Your role cannot change trips." }, { status: 403 });
    }

    const itemId = String(req.nextUrl.searchParams.get("itemId") || "").trim();
    if (!itemId) return NextResponse.json({ error: "A service id is required" }, { status: 400 });

    const item = await prisma.bookingItem.findUnique({ where: { id: itemId }, include: { booking: true } });
    if (!item || item.booking.companyId !== companyId) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    if (item.booking.invoiceId) {
      return NextResponse.json(
        { error: `This trip is invoiced as ${item.booking.invoiceNo}. Credit the invoice before changing what is on it.` },
        { status: 409 },
      );
    }

    await prisma.bookingItem.delete({ where: { id: itemId } });

    const items = await prisma.bookingItem.findMany({ where: { bookingId: item.bookingId } });
    const round = (n: number) => Math.round(n * 100) / 100;
    const saleTotal = round(items.reduce((sum, row) => sum + row.sale * row.qty, 0));
    const costTotal = round(items.reduce((sum, row) => sum + row.cost * row.qty, 0));

    const booking = await prisma.booking.update({
      where: { id: item.bookingId },
      data: { saleTotal, costTotal, marginTotal: round(saleTotal - costTotal) },
      include: { items: true },
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove the service" },
      { status: 500 },
    );
  }
}
