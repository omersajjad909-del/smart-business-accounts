/**
 * GET /api/travel/attention — what is about to go wrong.
 *
 * Every one of these is a thing that is not a problem today and is an
 * expensive problem the week it lands: a passport with five months left, a
 * family flying on Tuesday with no driver against their transfer, a trip
 * travelling on Friday that nobody has invoiced. The desks each know their own
 * half of it; nothing was looking across all of them at once.
 *
 * Counted on the server in one round trip rather than by loading every record
 * into the browser and filtering it there.
 */

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

const DAY = 864e5;

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + DAY).toISOString().slice(0, 10);
    /* Six months is the rule carriers actually apply, and the passenger finds
       out at the check-in desk. */
    const sixMonths = new Date(now.getTime() + 183 * DAY);
    const inAWeek = new Date(now.getTime() + 7 * DAY);

    const [passports, trips, transport, insurance] = await Promise.all([
      prisma.traveler.findMany({
        where: { companyId, passportExpiry: { not: null, lte: sixMonths } },
        orderBy: { passportExpiry: "asc" },
        take: 20,
        select: { id: true, fullName: true, passportNo: true, passportExpiry: true },
      }),

      prisma.booking.findMany({
        where: { companyId, status: { notIn: ["completed", "cancelled"] } },
        orderBy: { travelDate: "asc" },
        take: 200,
        select: {
          id: true, bookingNo: true, customerName: true, status: true,
          travelDate: true, saleTotal: true, quotationNo: true, invoiceNo: true,
        },
      }),

      /* Transport and insurance still live on business records, so their dates
         are inside JSON and cannot be filtered in SQL. Both are small — a desk
         has tens of live transfers, not thousands — so they are read and
         filtered here rather than being given their own tables for the sake of
         one query. */
      prisma.businessRecord.findMany({
        where: { companyId, category: "travel_transport", status: { notIn: ["completed", "cancelled"] } },
        orderBy: { date: "asc" },
        take: 200,
        select: { id: true, title: true, date: true, data: true },
      }),

      prisma.businessRecord.findMany({
        where: { companyId, category: "travel_insurance", status: { in: ["issued", "active"] } },
        take: 200,
        select: { id: true, title: true, data: true },
      }),
    ]);

    const noDriver = transport
      .filter((row) => !String((row.data as Record<string, unknown>)?.driver || "").trim())
      .map((row) => ({
        id: row.id,
        title: row.title,
        when: row.date ? row.date.toISOString().slice(0, 10) : "",
        party: String((row.data as Record<string, unknown>)?.passenger || ""),
        // A transfer tomorrow with nobody against it is the urgent one; next
        // month's is a job for later in the week.
        urgent: row.date ? row.date.toISOString().slice(0, 10) <= tomorrow : false,
      }))
      .sort((a, b) => a.when.localeCompare(b.when))
      .slice(0, 20);

    const coverEnding = insurance
      .map((row) => ({
        id: row.id,
        title: row.title,
        traveler: String((row.data as Record<string, unknown>)?.traveler || ""),
        coverTo: String((row.data as Record<string, unknown>)?.coverTo || "").slice(0, 10),
      }))
      .filter((row) => row.coverTo && row.coverTo <= inAWeek.toISOString().slice(0, 10))
      .sort((a, b) => a.coverTo.localeCompare(b.coverTo))
      .slice(0, 20);

    const soon = trips.filter((trip) => trip.travelDate && trip.travelDate <= inAWeek);

    return NextResponse.json({
      asOf: today,
      passportsExpiring: {
        count: passports.length,
        rows: passports.map((row) => ({
          id: row.id,
          name: row.fullName,
          passportNo: row.passportNo,
          expiry: row.passportExpiry ? row.passportExpiry.toISOString().slice(0, 10) : null,
          expired: row.passportExpiry ? row.passportExpiry < now : false,
        })),
      },
      transfersWithoutDriver: { count: noDriver.length, urgent: noDriver.filter((r) => r.urgent).length, rows: noDriver },
      insuranceCoverEnding: { count: coverEnding.length, rows: coverEnding },
      trips: {
        /* A trip with a price and no quotation is a customer waiting on one. */
        unquoted: trips.filter((trip) => !trip.quotationNo && trip.saleTotal > 0).length,
        /* Travelling this week and not invoiced is money about to walk onto an
           aircraft. */
        travellingSoonUnpaid: soon.filter((trip) => !trip.invoiceNo).length,
        travellingSoon: soon.length,
        rows: soon.slice(0, 20).map((trip) => ({
          id: trip.id,
          bookingNo: trip.bookingNo,
          customerName: trip.customerName,
          status: trip.status,
          travelDate: trip.travelDate ? trip.travelDate.toISOString().slice(0, 10) : null,
          saleTotal: trip.saleTotal,
          invoiceNo: trip.invoiceNo,
          quotationNo: trip.quotationNo,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load alerts" },
      { status: 500 },
    );
  }
}
