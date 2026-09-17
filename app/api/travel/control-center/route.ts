import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { bookingMoney, readBooking } from "@/lib/umrahBooking";
import { readDeparture, seatPosition } from "@/lib/umrahPackage";

/** How far ahead "about to fly" reaches. A visa is filed inside this window. */
const SOON_DAYS = 30;

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const [ticketRec, visaRec, hotelRec, tourRec, settlementRec, passportRec, departureRec, bookingRec] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_ticket" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessRecord.findMany({ where: { companyId, category: "visa_case" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_hotel" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_tour" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_settlement" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessRecord.count({ where: { companyId, category: "travel_passport" } }),
    // The group business. Not capped: seats left and money owed are totals, and
    // a total of the twenty most recent rows is not a total of anything.
    prisma.businessRecord.findMany({ where: { companyId, category: "umrah_departure" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "umrah_booking" } }),
  ]);

  function d(record: typeof ticketRec[0]) { return (record.data || {}) as Record<string, unknown>; }

  const tickets = ticketRec.map(r => ({ id: r.id, booking: r.title, passenger: String(d(r).passenger || ""), airline: String(d(r).airline || ""), route: String(d(r).route || ""), pnr: String(d(r).pnr || ""), supplier: String(d(r).supplier || d(r).airline || ""), travelDate: String(r.date || "").slice(0, 10), amount: Number(r.amount || 0), cost: Number(d(r).cost || 0), status: r.status || "quoted", invoiceNo: String(d(r).invoiceNo || ""), settlementRef: String(d(r).settlementRef || "") }));
  const visas = visaRec.map(r => ({ id: r.id, caseRef: r.title, applicant: String(d(r).applicant || ""), country: String(d(r).country || ""), supplier: String(d(r).supplier || d(r).embassy || ""), passportNo: String(d(r).passportNo || ""), submissionDate: String(r.date || "").slice(0, 10), amount: Number(r.amount || 0), cost: Number(d(r).cost || 0), status: r.status || "document_check", invoiceNo: String(d(r).invoiceNo || ""), settlementRef: String(d(r).settlementRef || "") }));
  const hotels = hotelRec.map(r => ({ id: r.id, bookingRef: r.title, guestName: String(d(r).guestName || ""), hotelName: String(d(r).hotelName || ""), destination: String(d(r).destination || ""), checkIn: String(r.date || "").slice(0, 10), checkOut: String(d(r).checkOut || "").slice(0, 10), supplier: String(d(r).supplier || ""), amount: Number(r.amount || 0), cost: Number(d(r).cost || 0), status: r.status || "quoted", invoiceNo: String(d(r).invoiceNo || ""), settlementRef: String(d(r).settlementRef || "") }));
  const tours = tourRec.map(r => ({ id: r.id, tourRef: r.title, tourName: String(d(r).tourName || ""), destination: String(d(r).destination || ""), departureDate: String(r.date || "").slice(0, 10), pax: Number(d(r).pax || 1), leader: String(d(r).leader || ""), supplier: String(d(r).supplier || ""), amount: Number(r.amount || 0), cost: Number(d(r).cost || 0), status: r.status || "enquiry", invoiceNo: String(d(r).invoiceNo || ""), settlementRef: String(d(r).settlementRef || "") }));
  const settlements = settlementRec.map(r => ({ id: r.id, settlementRef: r.title, supplierName: String(d(r).supplierName || ""), customerName: String(d(r).customerName || ""), sourceTitle: String(d(r).sourceTitle || ""), invoiceNo: String(d(r).invoiceNo || ""), dueDate: String(r.date || "").slice(0, 10), amount: Number(r.amount || 0), status: r.status || "pending" }));

  const totalSales =
    tickets.reduce((s, x) => s + x.amount, 0) +
    visas.reduce((s, x) => s + x.amount, 0) +
    hotels.reduce((s, x) => s + x.amount, 0) +
    tours.reduce((s, x) => s + x.amount, 0);

  /* ── The group business ──
     The four numbers a Hajj or Umrah operator opens the dashboard for. Worked
     out here as well as on the Travel page, from the same two helpers, so the
     dashboard and the module can never show the owner different figures. */
  const today = new Date().toISOString().slice(0, 10);
  const liveBookings = bookingRec
    .map((r) => {
      const booking = readBooking(r.data);
      return { refId: r.refId || booking.departureId, booking, money: bookingMoney(booking, today) };
    })
    .filter((x) => x.booking.status !== "cancelled");

  const paxByDeparture = new Map<string, number>();
  for (const b of liveBookings) {
    if (!b.refId) continue;
    paxByDeparture.set(b.refId, (paxByDeparture.get(b.refId) || 0) + b.money.pax);
  }

  let seatsLeft = 0;
  const departureDates = new Map<string, string>();
  for (const r of departureRec) {
    const dep = readDeparture(r.data);
    departureDates.set(r.id, dep.departureDate);
    // Only trips still ahead. Seats on a departure that has flown are not
    // stock — nobody can sell them.
    if (dep.departureDate && dep.departureDate < today) continue;
    seatsLeft += seatPosition(dep.seats, paxByDeparture.get(r.id) || 0).left;
  }

  const owedByPilgrims = liveBookings.reduce((s, b) => s + b.money.balance, 0);
  const overdueFromPilgrims = liveBookings.reduce((s, b) => s + b.money.overdue, 0);
  const flyingSoonPax = liveBookings.reduce((s, b) => {
    const date = departureDates.get(b.refId || "") || "";
    if (!date) return s;
    const days = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86_400_000);
    return days >= 0 && days <= SOON_DAYS ? s + b.money.pax : s;
  }, 0);

  /* Files flying inside the window that are not straight — an unpaid balance,
     or a pilgrim with no passport number. Neither appears in any ledger and
     both stop the trip, so this is the counter worth putting on a dashboard. */
  const notReady = liveBookings.filter((b) => {
    const date = departureDates.get(b.refId || "") || "";
    if (!date) return false;
    const days = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86_400_000);
    if (days < 0 || days > SOON_DAYS) return false;
    return b.money.balance > 0.01 || b.booking.pilgrims.some((p) => !p.passportNo.trim());
  }).length;

  return NextResponse.json({
    summary: {
      seatsLeft,
      owedByPilgrims: Math.round(owedByPilgrims),
      overdueFromPilgrims: Math.round(overdueFromPilgrims),
      flyingSoonPax,
      notReady,
      openDepartures: departureRec.length,
      groupBookings: liveBookings.length,
      tickets: tickets.length,
      issuedTickets: tickets.filter(x => x.status === "issued").length,
      pendingTickets: tickets.filter(x => x.status === "quoted" || x.status === "booked").length,
      visaCases: visas.length,
      activeVisaCases: visas.filter(x => x.status === "document_check" || x.status === "submitted").length,
      hotels: hotels.length,
      confirmedHotels: hotels.filter(x => x.status === "confirmed" || x.status === "checked_in").length,
      tours: tours.length,
      confirmedTours: tours.filter(x => x.status === "confirmed" || x.status === "departed").length,
      settlements: settlements.length,
      pendingSettlements: settlements.filter(x => x.status === "pending").length,
      monthlySales: totalSales,
      supplierExposure: settlements.reduce((s, x) => s + x.amount, 0),
      passports: passportRec,
    },
    tickets,
    visas,
    hotels,
    tours,
    settlements,
  });
}
