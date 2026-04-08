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

  const [items, bookings, agreements, maintenance] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "rental_item" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "rental_booking" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "rental_agreement" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "rental_maintenance" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedItems = items.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      item: record.title,
      sku: String(data.sku || ""),
      category: String(data.category || ""),
      quantity: Number(data.quantity || 0),
      warehouse: String(data.warehouse || ""),
      status: String(record.status || "available"),
    };
  });

  const mappedBookings = bookings.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      booking: record.title,
      customer: String(data.customer || ""),
      asset: String(data.asset || ""),
      pickupDate: String(record.date || "").slice(0, 10),
      returnDate: String(data.returnDate || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "reserved"),
    };
  });

  const mappedAgreements = agreements.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      agreement: record.title,
      customer: String(data.customer || ""),
      asset: String(data.asset || ""),
      startDate: String(record.date || "").slice(0, 10),
      endDate: String(data.endDate || "").slice(0, 10),
      amount: Number(record.amount || 0),
      status: String(record.status || "draft"),
    };
  });

  const mappedMaintenance = maintenance.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      job: record.title,
      asset: String(data.asset || ""),
      technician: String(data.technician || ""),
      dueDate: String(record.date || "").slice(0, 10),
      cost: Number(record.amount || 0),
      status: String(record.status || "scheduled"),
    };
  });

  return NextResponse.json({
    summary: {
      items: mappedItems.length,
      availableItems: mappedItems.filter((item) => item.status === "available").length,
      bookings: mappedBookings.length,
      activeBookings: mappedBookings.filter((item) => item.status === "reserved" || item.status === "out").length,
      agreements: mappedAgreements.length,
      activeAgreements: mappedAgreements.filter((item) => item.status === "active").length,
      maintenanceJobs: mappedMaintenance.length,
      dueMaintenance: mappedMaintenance.filter((item) => item.status === "scheduled" || item.status === "due").length,
      bookingValue: mappedBookings.reduce((sum, item) => sum + item.amount, 0),
    },
    items: mappedItems,
    bookings: mappedBookings,
    agreements: mappedAgreements,
    maintenance: mappedMaintenance,
  });
}
