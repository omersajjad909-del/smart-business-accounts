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

  const [bookings, vendors, budgets] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "event_booking" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "event_vendor" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "event_budget" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedBookings = bookings.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      booking: record.title,
      client: String(data.client || ""),
      package: String(data.package || ""),
      eventDate: String(record.date || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "tentative"),
    };
  });
  const mappedVendors = vendors.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      vendor: record.title,
      service: String(data.service || ""),
      contact: String(data.contact || ""),
      city: String(data.city || ""),
      status: String(record.status || "active"),
    };
  });
  const mappedBudgets = budgets.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      event: record.title,
      category: String(data.category || ""),
      owner: String(data.owner || ""),
      dueDate: String(record.date || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "planned"),
    };
  });

  return NextResponse.json({
    summary: {
      bookings: mappedBookings.length,
      confirmedBookings: mappedBookings.filter((item) => item.status === "confirmed").length,
      tentativeBookings: mappedBookings.filter((item) => item.status === "tentative").length,
      vendors: mappedVendors.length,
      activeVendors: mappedVendors.filter((item) => item.status === "active").length,
      budgetLines: mappedBudgets.length,
      plannedSpend: mappedBudgets.reduce((sum, item) => sum + item.amount, 0),
      pipelineValue: mappedBookings.reduce((sum, item) => sum + item.amount, 0),
    },
    bookings: mappedBookings,
    vendors: mappedVendors,
    budgets: mappedBudgets,
  });
}
