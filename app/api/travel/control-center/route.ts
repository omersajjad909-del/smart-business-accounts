import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const [ticketRec, visaRec, hotelRec, tourRec, settlementRec, passportRec] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_ticket" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessRecord.findMany({ where: { companyId, category: "visa_case" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_hotel" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_tour" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_settlement" }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessRecord.count({ where: { companyId, category: "travel_passport" } }),
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

  return NextResponse.json({
    summary: {
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
