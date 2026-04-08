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
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [propertyRecords, tenantRecords, leaseRecords, rentRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "property" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "tenant" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "lease" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "rent_payment" }, orderBy: { createdAt: "desc" } }),
  ]);

  const properties = propertyRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      name: record.title,
      type: String(data.type || "Apartment"),
      address: String(data.address || ""),
      size: String(data.size || ""),
      status: String(record.status || "vacant"),
      rent: Number(record.amount || 0),
      tenant: String(data.tenant || ""),
      leaseEnd: String(data.leaseEnd || ""),
      rooms: Number(data.rooms || 0),
    };
  });

  const tenants = tenantRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      name: record.title,
      phone: String(data.phone || ""),
      email: String(data.email || ""),
      cnic: String(data.cnic || ""),
      property: String(data.property || ""),
      unit: String(data.unit || ""),
      rentAmount: Number(record.amount || data.rentAmount || 0),
      depositPaid: Number(data.depositPaid || 0),
      leaseStart: String(record.date || data.leaseStart || ""),
      leaseEnd: String(data.leaseEnd || ""),
      status: String(record.status || "active"),
    };
  });

  const leases = leaseRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      tenant: record.title,
      property: String(data.property || ""),
      startDate: String(data.startDate || ""),
      endDate: String(data.endDate || ""),
      rentAmount: Number(record.amount || 0),
      deposit: Number(data.deposit || 0),
      type: String(data.type || "Residential"),
      status: String(record.status || "active"),
    };
  });

  const rents = rentRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      tenant: record.title,
      property: String(data.property || ""),
      amount: Number(record.amount || 0),
      month: String(data.month || ""),
      dueDate: String(record.date || ""),
      notes: String(data.notes || ""),
      status: String(record.status || "pending"),
    };
  });

  const rentedProperties = properties.filter((item) => item.status === "rented").length;

  return NextResponse.json({
    summary: {
      properties: properties.length,
      rentedProperties,
      vacantProperties: properties.filter((item) => item.status === "vacant").length,
      maintenanceProperties: properties.filter((item) => item.status === "maintenance").length,
      tenants: tenants.length,
      activeTenants: tenants.filter((item) => item.status === "active").length,
      leases: leases.length,
      activeLeases: leases.filter((item) => item.status === "active").length,
      occupancyRate: properties.length ? Math.round((rentedProperties / properties.length) * 100) : 0,
      collectedRent: rents.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
      pendingRent: rents.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.amount, 0),
    },
    properties,
    tenants,
    leases,
    rents,
  });
}
