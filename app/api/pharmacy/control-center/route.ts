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

  const [drugs, prescriptions, batches, purchases, sales] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "drug" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "pharmacy_prescription" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "drug_batch" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "drug_purchase" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "pharmacy_sale" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedDrugs = drugs.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    const stock = Number(data.stock || 0);
    const minStock = Number(data.minStock || 0);
    const expiryDate = String(data.expiryDate || "");
    return {
      id: record.id,
      name: record.title,
      category: String(data.category || "Tablet"),
      manufacturer: String(data.manufacturer || ""),
      batchNo: String(data.batchNo || ""),
      stock,
      minStock,
      unitPrice: Number(record.amount || 0),
      expiryDate,
      status: String(record.status || "in_stock"),
      isLow: stock <= minStock,
      isExpired: expiryDate ? new Date(expiryDate).getTime() < Date.now() : false,
    };
  });

  const mappedPrescriptions = prescriptions.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      patient: record.title,
      doctor: String(data.doctor || ""),
      drugs: String(data.drugs || ""),
      date: String(record.date || "").slice(0, 10),
      notes: String(data.notes || ""),
      status: String(record.status || "pending"),
    };
  });

  const mappedBatches = batches.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      medicine: record.title,
      batchNo: String(data.batchNo || ""),
      supplier: String(data.supplier || ""),
      quantity: Number(data.quantity || 0),
      costPerUnit: Number(record.amount || 0),
      expiryDate: String(data.expiryDate || ""),
      status: String(record.status || "active"),
      receivedDate: String(record.date || "").slice(0, 10),
    };
  });

  const mappedPurchases = purchases.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      medicine: record.title,
      supplier: String(data.supplier || ""),
      batchNo: String(data.batchNo || ""),
      quantity: Number(data.quantity || 0),
      unitCost: Number(record.amount || 0),
      totalCost: Number(data.totalCost || 0),
      receivedDate: String(record.date || "").slice(0, 10),
      status: String(record.status || "received"),
    };
  });

  const mappedSales = sales.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      medicine: record.title,
      customer: String(data.customer || "Walk-in"),
      quantity: Number(data.quantity || 0),
      amount: Number(record.amount || 0),
      paymentMethod: String(data.paymentMethod || "cash"),
      saleDate: String(record.date || "").slice(0, 10),
      status: String(record.status || "completed"),
    };
  });

  return NextResponse.json({
    summary: {
      medicines: mappedDrugs.length,
      lowStock: mappedDrugs.filter((item) => item.isLow).length,
      expired: mappedDrugs.filter((item) => item.isExpired).length,
      inventoryValue: mappedDrugs.reduce((sum, item) => sum + item.stock * item.unitPrice, 0),
      pendingPrescriptions: mappedPrescriptions.filter((item) => item.status !== "dispensed").length,
      dispensedPrescriptions: mappedPrescriptions.filter((item) => item.status === "dispensed").length,
      counterSales: mappedSales.length,
      counterRevenue: mappedSales.reduce((sum, item) => sum + item.amount, 0),
      purchaseSpend: mappedPurchases.reduce((sum, item) => sum + (item.totalCost || item.quantity * item.unitCost), 0),
      activeBatches: mappedBatches.filter((item) => item.status === "active").length,
    },
    drugs: mappedDrugs,
    prescriptions: mappedPrescriptions,
    batches: mappedBatches,
    purchases: mappedPurchases,
    sales: mappedSales,
  });
}
