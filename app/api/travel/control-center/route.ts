import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  const role = normalizeRole(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const [ticketRecords, visaRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "travel_ticket" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "visa_case" }, orderBy: { createdAt: "desc" } }),
  ]);

  const tickets = ticketRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      booking: record.title,
      passenger: String(data.passenger || ""),
      airline: String(data.airline || ""),
      route: String(data.route || ""),
      pnr: String(data.pnr || ""),
      travelDate: String(record.date || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "quoted"),
    };
  });

  const visas = visaRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      caseRef: record.title,
      applicant: String(data.applicant || ""),
      country: String(data.country || ""),
      passportNo: String(data.passportNo || ""),
      submissionDate: String(record.date || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "document_check"),
    };
  });

  return NextResponse.json({
    summary: {
      tickets: tickets.length,
      issuedTickets: tickets.filter((item) => item.status === "issued").length,
      pendingTickets: tickets.filter((item) => item.status === "quoted" || item.status === "booked").length,
      visaCases: visas.length,
      activeVisaCases: visas.filter((item) => item.status === "document_check" || item.status === "submitted").length,
      monthlySales: tickets.reduce((sum, item) => sum + item.amount, 0) + visas.reduce((sum, item) => sum + item.amount, 0),
    },
    tickets,
    visas,
  });
}
