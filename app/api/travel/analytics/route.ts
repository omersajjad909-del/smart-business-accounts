import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

const STATUS_COLORS: Record<string, string> = {
  quoted: "#fbbf24", booked: "#60a5fa", issued: "#34d399", confirmed: "#34d399",
  checked_in: "#38bdf8", checked_out: "#a78bfa", completed: "#34d399",
  departed: "#f97316", enquiry: "#fbbf24", document_check: "#fbbf24",
  submitted: "#60a5fa", approved: "#34d399", rejected: "#f87171",
  cancelled: "#6b7280", pending: "#fbbf24", processing: "#60a5fa",
  settled: "#34d399", disputed: "#f87171",
};

function getStatusColor(s: string) { return STATUS_COLORS[s] || "#94a3b8"; }

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const [ticketRec, visaRec, hotelRec, tourRec, settlementRec] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_ticket" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "visa_case" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_hotel" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_tour" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_settlement" }, orderBy: { createdAt: "desc" } }),
  ]);

  function d(r: typeof ticketRec[0]) { return (r.data || {}) as Record<string, unknown>; }

  const ticketRevenue = ticketRec.reduce((s, r) => s + Number(r.amount || 0), 0);
  const ticketCost = ticketRec.reduce((s, r) => s + Number(d(r).cost || 0), 0);
  const visaRevenue = visaRec.reduce((s, r) => s + Number(r.amount || 0), 0);
  const visaCost = visaRec.reduce((s, r) => s + Number(d(r).cost || 0), 0);
  const hotelRevenue = hotelRec.reduce((s, r) => s + Number(r.amount || 0), 0);
  const hotelCost = hotelRec.reduce((s, r) => s + Number(d(r).cost || 0), 0);
  const tourRevenue = tourRec.reduce((s, r) => s + Number(r.amount || 0), 0);
  const tourCost = tourRec.reduce((s, r) => s + Number(d(r).cost || 0), 0);

  const totalRevenue = ticketRevenue + visaRevenue + hotelRevenue + tourRevenue;
  const totalCost = ticketCost + visaCost + hotelCost + tourCost;
  const totalMargin = totalRevenue - totalCost;
  const supplierExposure = settlementRec.reduce((s, r) => s + Number(r.amount || 0), 0);

  const allRecords = [
    ...ticketRec.map(r => ({ r, type: "Airline Ticket", amount: Number(r.amount || 0), ref: r.title, customer: String(d(r).passenger || ""), status: r.status || "quoted" })),
    ...visaRec.map(r => ({ r, type: "Visa Case", amount: Number(r.amount || 0), ref: r.title, customer: String(d(r).applicant || ""), status: r.status || "document_check" })),
    ...hotelRec.map(r => ({ r, type: "Hotel Booking", amount: Number(r.amount || 0), ref: r.title, customer: String(d(r).guestName || ""), status: r.status || "quoted" })),
    ...tourRec.map(r => ({ r, type: "Group Tour", amount: Number(r.amount || 0), ref: r.title, customer: String(d(r).leader || ""), status: r.status || "enquiry" })),
  ].sort((a, b) => new Date(b.r.createdAt).getTime() - new Date(a.r.createdAt).getTime());

  // Count pending invoices (no invoiceNo set)
  const pendingInvoices = allRecords.filter(a => !String(d(a.r).invoiceNo || "")).length;
  const pendingSettlements = settlementRec.filter(r => r.status === "pending").length;

  // Top suppliers from settlements
  const supplierMap = new Map<string, { exposure: number; count: number }>();
  for (const r of settlementRec) {
    const name = String(d(r).supplierName || "Unknown");
    const existing = supplierMap.get(name) || { exposure: 0, count: 0 };
    supplierMap.set(name, { exposure: existing.exposure + Number(r.amount || 0), count: existing.count + 1 });
  }
  const topSuppliers = Array.from(supplierMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 8);

  // Status breakdown per module
  function statusBreakdown(records: typeof ticketRec, module: string) {
    const map = new Map<string, number>();
    for (const r of records) { const s = r.status || "unknown"; map.set(s, (map.get(s) || 0) + 1); }
    return { module, statuses: Array.from(map.entries()).map(([status, count]) => ({ status, count, color: getStatusColor(status) })) };
  }

  return NextResponse.json({
    summary: { totalRevenue, totalCost, totalMargin, tickets: ticketRec.length, visas: visaRec.length, hotels: hotelRec.length, tours: tourRec.length, passports: 0, pendingInvoices, pendingSettlements, supplierExposure },
    byModule: [
      { module: "Airline Tickets", count: ticketRec.length, revenue: ticketRevenue, cost: ticketCost, color: "#38bdf8" },
      { module: "Visa Cases", count: visaRec.length, revenue: visaRevenue, cost: visaCost, color: "#a78bfa" },
      { module: "Hotel Packages", count: hotelRec.length, revenue: hotelRevenue, cost: hotelCost, color: "#a78bfa" },
      { module: "Group Tours", count: tourRec.length, revenue: tourRevenue, cost: tourCost, color: "#f97316" },
    ].filter(m => m.count > 0),
    recentActivity: allRecords.slice(0, 15).map(a => ({ id: a.r.id, ref: a.ref, type: a.type, customer: a.customer, amount: a.amount, status: a.status, color: getStatusColor(a.status) })),
    topSuppliers,
    statusBreakdown: [
      statusBreakdown(ticketRec, "Airline Tickets"),
      statusBreakdown(visaRec, "Visa Cases"),
      statusBreakdown(hotelRec, "Hotel Packages"),
      statusBreakdown(tourRec, "Group Tours"),
      statusBreakdown(settlementRec, "Settlements"),
    ].filter(m => m.statuses.length > 0),
  });
}
