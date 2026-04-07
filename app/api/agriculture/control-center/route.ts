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

  const [cropRecords, fieldRecords, livestockRecords, harvestRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "crop" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "field" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "livestock" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "harvest" }, orderBy: { createdAt: "desc" } }),
  ]);

  const crops = cropRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      name: row.title,
      field: String(data.field || ""),
      area: String(data.area || ""),
      plantDate: normalizeDate(row.date || row.createdAt).slice(0, 10),
      harvestDate: String(data.harvestDate || ""),
      expectedYield: Number(data.expectedYield || 0),
      status: String(row.status || "planted"),
    };
  });

  const fields = fieldRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      name: row.title,
      area: Number(data.area || 0),
      soilType: String(data.soilType || ""),
      irrigationType: String(data.irrigationType || ""),
      location: String(data.location || ""),
      status: String(row.status || "active"),
    };
  });

  const livestock = livestockRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      type: row.title,
      breed: String(data.breed || ""),
      count: Number(data.count || 1),
      dob: normalizeDate(row.date || row.createdAt).slice(0, 10),
      weight: Number(data.weight || 0),
      notes: String(data.notes || ""),
      status: String(row.status || "healthy"),
    };
  });

  const harvests = harvestRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    const quantity = Number(data.quantity || 0);
    const salePrice = Number(row.amount || 0);
    return {
      id: row.id,
      crop: row.title,
      field: String(data.field || ""),
      quantity,
      unit: String(data.unit || "kg"),
      salePrice,
      date: normalizeDate(row.date || row.createdAt).slice(0, 10),
      buyer: String(data.buyer || ""),
      revenue: quantity * salePrice,
    };
  });

  const totalArea = fields.reduce((sum, field) => sum + field.area, 0);
  const totalRevenue = harvests.reduce((sum, harvest) => sum + harvest.revenue, 0);
  const totalAnimals = livestock.reduce((sum, animal) => sum + animal.count, 0);
  const totalHarvestQty = harvests.reduce((sum, harvest) => sum + harvest.quantity, 0);
  const activeFields = fields.filter((field) => field.status === "active").length;

  return NextResponse.json({
    summary: {
      fields: fields.length,
      activeFields,
      totalArea,
      crops: crops.length,
      growingCrops: crops.filter((crop) => crop.status === "growing").length,
      failedCrops: crops.filter((crop) => crop.status === "failed").length,
      harvests: harvests.length,
      harvestQuantity: totalHarvestQty,
      harvestRevenue: totalRevenue,
      livestockGroups: livestock.length,
      livestockCount: totalAnimals,
      healthyAnimals: livestock.filter((animal) => animal.status === "healthy").reduce((sum, animal) => sum + animal.count, 0),
    },
    crops,
    fields,
    livestock,
    harvests,
  });
}
