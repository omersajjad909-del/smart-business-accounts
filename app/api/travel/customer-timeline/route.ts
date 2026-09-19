/**
 * GET /api/travel/customer-timeline — one customer's whole history.
 *
 * "You booked me last year" is a sentence every travel desk hears, and until
 * now answering it meant opening six screens: tickets, visas, hotels, trips,
 * invoices, receipts. Each desk knew its own part and nothing put them in
 * order.
 *
 * WHAT JOINS THEM
 *
 * The chart-of-accounts party. Every invoice is raised against one, every
 * receipt is received against one, and ensurePartyAccount has been quietly
 * creating them under the customer's own name all along. So the account is the
 * spine, and the desk records — which store a passenger or applicant name in
 * JSON rather than an account id — are matched on the name as a second pass.
 *
 * That name match is honest rather than clever: two different Ali Razas would
 * land on the same timeline. The page says so. Fixing it properly means the
 * desks carrying a traveller id, which is what the Traveler table now makes
 * possible and is a change for those desks to make.
 */

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

type Event = {
  at: string;
  kind: string;
  icon: string;
  title: string;
  detail: string;
  amount: number | null;
  href: string | null;
  tone: "money" | "service" | "note";
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const name = String(req.nextUrl.searchParams.get("customer") || "").trim().slice(0, 160);
    if (!name) return NextResponse.json({ error: "A customer is required" }, { status: 400 });

    const account = await prisma.account.findFirst({
      where: { companyId, name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true, phone: true, email: true },
    });

    const [trips, invoices, receipts, deskRecords, contact] = await Promise.all([
      prisma.booking.findMany({
        where: {
          companyId,
          OR: [
            { customerName: { equals: name, mode: "insensitive" } },
            ...(account ? [{ customerAccountId: account.id }] : []),
          ],
        },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),

      account
        ? prisma.salesInvoice.findMany({
            where: { companyId, customerId: account.id },
            orderBy: { date: "desc" },
            take: 100,
            select: { id: true, invoiceNo: true, date: true, total: true, reference: true },
          })
        : [],

      account
        ? prisma.paymentReceipt.findMany({
            where: { companyId, partyId: account.id, deletedAt: null },
            orderBy: { date: "desc" },
            take: 100,
            select: { id: true, receiptNo: true, date: true, amount: true, paymentMode: true, narration: true },
          })
        : [],

      /* The desks keep the person's name inside their JSON rather than an
         account id, so this is the one place a name match has to do. */
      prisma.businessRecord.findMany({
        where: {
          companyId,
          category: { in: ["travel_ticket", "travel_hotel", "visa_case", "travel_passport", "travel_transport", "travel_insurance", "travel_tour"] },
        },
        orderBy: { createdAt: "desc" },
        take: 400,
        select: { id: true, category: true, title: true, date: true, amount: true, status: true, data: true, createdAt: true },
      }),

      prisma.contact.findFirst({
        where: { companyId, name: { equals: name, mode: "insensitive" }, deletedAt: null },
        select: { id: true, name: true, phone: true, email: true },
      }),
    ]);

    const interactions = contact
      ? await prisma.interaction.findMany({
          where: { contactId: contact.id },
          orderBy: { date: "desc" },
          take: 50,
          select: { id: true, type: true, date: true, subject: true, description: true, outcome: true, nextFollowUp: true },
        })
      : [];

    const events: Event[] = [];

    for (const trip of trips) {
      events.push({
        at: iso(trip.createdAt),
        kind: "trip",
        icon: "🧳",
        title: `Trip ${trip.bookingNo} opened`,
        detail: `${trip.items.length} service${trip.items.length === 1 ? "" : "s"}${trip.travelDate ? `, travelling ${iso(trip.travelDate)}` : ""}`,
        amount: trip.saleTotal,
        href: "/dashboard/travel/trips",
        tone: "service",
      });
      if (trip.quotationNo) {
        events.push({
          at: iso(trip.updatedAt), kind: "quote", icon: "📄",
          title: `Quotation ${trip.quotationNo} sent`, detail: `For trip ${trip.bookingNo}`,
          amount: trip.saleTotal, href: "/dashboard/quotation", tone: "money",
        });
      }
    }

    for (const invoice of invoices) {
      events.push({
        at: iso(invoice.date), kind: "invoice", icon: "🧾",
        title: `Invoice ${invoice.invoiceNo}`,
        detail: invoice.reference ? `Against ${invoice.reference}` : "Sales invoice",
        amount: invoice.total, href: "/dashboard/sales-invoice", tone: "money",
      });
    }

    for (const receipt of receipts) {
      events.push({
        at: iso(receipt.date), kind: "payment", icon: "💵",
        title: `Payment received — ${receipt.receiptNo}`,
        detail: receipt.narration || receipt.paymentMode,
        amount: receipt.amount, href: "/dashboard/payment-receipts", tone: "money",
      });
    }

    const needle = name.toLowerCase();
    const DESK: Record<string, { icon: string; label: string; href: string; nameKeys: string[] }> = {
      travel_ticket: { icon: "✈️", label: "Airline ticket", href: "/dashboard/travel/tickets", nameKeys: ["passenger"] },
      travel_hotel: { icon: "🏨", label: "Hotel booking", href: "/dashboard/travel/hotel-packages", nameKeys: ["guestName"] },
      visa_case: { icon: "🛂", label: "Visa case", href: "/dashboard/travel/visas", nameKeys: ["applicant"] },
      travel_passport: { icon: "📕", label: "Passport service", href: "/dashboard/travel/passports", nameKeys: ["applicant", "holder", "name"] },
      travel_transport: { icon: "🚐", label: "Transport", href: "/dashboard/travel/transport", nameKeys: ["passenger"] },
      travel_insurance: { icon: "🛡", label: "Insurance", href: "/dashboard/travel/insurance", nameKeys: ["traveler"] },
      travel_tour: { icon: "🗺", label: "Tour", href: "/dashboard/travel/tours", nameKeys: ["leader", "tourName"] },
    };

    for (const record of deskRecords) {
      const desk = DESK[record.category];
      if (!desk) continue;
      const data = (record.data ?? {}) as Record<string, unknown>;
      const matched = desk.nameKeys.some((key) => String(data[key] || "").toLowerCase() === needle);
      if (!matched) continue;
      events.push({
        // A record with no service date still happened, so it sits where it
        // was entered rather than falling off the end of the timeline.
        at: iso(record.date) || iso(record.createdAt),
        kind: record.category, icon: desk.icon,
        title: `${desk.label} ${record.title}`,
        detail: String(data.route || data.country || data.destination || data.hotelName || record.status || ""),
        amount: record.amount, href: desk.href, tone: "service",
      });
    }

    for (const row of interactions) {
      events.push({
        at: iso(row.date), kind: "interaction", icon: "💬",
        title: `${row.type.toLowerCase()} — ${row.subject}`,
        detail: row.description.slice(0, 160),
        amount: null, href: "/dashboard/crm/interactions", tone: "note",
      });
    }

    // Newest first, which is the order somebody on the phone needs it in.
    events.sort((a, b) => b.at.localeCompare(a.at));

    const invoiced = invoices.reduce((sum, row) => sum + row.total, 0);
    const paid = receipts.reduce((sum, row) => sum + row.amount, 0);

    return NextResponse.json({
      customer: { name, account, contact },
      totals: {
        trips: trips.length,
        tripValue: trips.reduce((sum, trip) => sum + trip.saleTotal, 0),
        margin: trips.reduce((sum, trip) => sum + trip.marginTotal, 0),
        invoiced,
        paid,
        /* What is still owed. Invoices raised less receipts against the same
           party — the ledger's own answer, not a number kept alongside it. */
        outstanding: Math.round((invoiced - paid) * 100) / 100,
      },
      followUp: interactions.find((row) => row.nextFollowUp)?.nextFollowUp ?? null,
      events: events.slice(0, 200),
      /* Said out loud on the page: desk records are matched by name because
         that is all they store. */
      matchedByName: deskRecords.length > 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not build the timeline" },
      { status: 500 },
    );
  }
}
