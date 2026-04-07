import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : new Date().toISOString();
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

  const [vehicleRecords, driveRecords, dealRecords] = await Promise.all([
    prisma.businessRecord.findMany({
      where: { companyId, category: "auto_vehicle" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "showroom_test_drive" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "showroom_deal" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const vehicles = vehicleRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      make: String(data.make || ""),
      model: String(data.model || ""),
      year: String(data.year || ""),
      color: String(data.color || ""),
      type: String(data.type || "New"),
      vin: String(data.vin || ""),
      price: Number(row.amount || data.price || 0),
      status: String(row.status || "Available"),
    };
  });

  const testDrives = driveRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      customer: row.title,
      vehicleId: String(data.vehicleId || ""),
      vehicleLabel: String(data.vehicleLabel || ""),
      driveDate: normalizeDate(row.date || row.createdAt).slice(0, 10),
      phone: String(data.phone || ""),
      status: String(row.status || "scheduled"),
    };
  });

  const deals = dealRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      customer: row.title,
      vehicleId: String(data.vehicleId || ""),
      vehicleLabel: String(data.vehicleLabel || ""),
      amount: Number(row.amount || 0),
      financier: String(data.financier || "Direct"),
      status: String(row.status || "lead"),
    };
  });

  const availableVehicles = vehicles.filter((item) => item.status !== "Sold");
  const openDeals = deals.filter((item) => ["lead", "negotiation", "financed"].includes(item.status)).length;
  const wonDeals = deals.filter((item) => item.status === "won").length;
  const conversionRate = deals.length ? Math.round((wonDeals / deals.length) * 100) : 0;

  return NextResponse.json({
    summary: {
      vehicles: vehicles.length,
      availableVehicles: vehicles.filter((item) => item.status === "Available").length,
      reservedVehicles: vehicles.filter((item) => item.status === "Reserved").length,
      soldVehicles: vehicles.filter((item) => item.status === "Sold").length,
      inventoryValue: availableVehicles.reduce((sum, item) => sum + item.price, 0),
      soldValue: vehicles.filter((item) => item.status === "Sold").reduce((sum, item) => sum + item.price, 0),
      openDeals,
      wonDeals,
      lostDeals: deals.filter((item) => item.status === "lost").length,
      completedDrives: testDrives.filter((item) => item.status === "completed").length,
      scheduledDrives: testDrives.filter((item) => item.status === "scheduled").length,
      conversionRate,
    },
    vehicles,
    testDrives,
    deals,
  });
}
