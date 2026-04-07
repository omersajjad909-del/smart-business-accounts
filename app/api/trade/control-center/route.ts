import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function statusKey(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : new Date().toISOString();
}

export async function GET(req: NextRequest) {
  const role = statusKey(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [shipments, lcs, customs, costings, rebates] = await Promise.all([
    prisma.businessRecord.findMany({
      where: { companyId, category: "shipment" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "lc_tt" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "customs_clearance" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "import_costing" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "export_rebate" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const mappedShipments = shipments.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      ref: String(data.ref || row.title || ""),
      type: String(data.type || "Import"),
      counterparty: String(data.counterparty || ""),
      originPort: String(data.originPort || ""),
      destinationPort: String(data.destinationPort || ""),
      incoterm: String(data.incoterm || "FOB"),
      mode: String(data.mode || "Sea"),
      blAwbNo: String(data.blAwbNo || ""),
      eta: String(data.eta || ""),
      etd: String(data.etd || ""),
      hsCode: String(data.hsCode || ""),
      amount: Number(row.amount || 0),
      freightCost: Number(data.freightCost || 0),
      insurance: Number(data.insurance || 0),
      status: row.status || "BOOKING",
      date: normalizeDate(row.date || row.createdAt),
    };
  });

  const mappedLcs = lcs.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      refNo: String(data.refNo || row.title || ""),
      type: String(data.type || "LC"),
      direction: String(data.direction || "Import"),
      amount: Number(row.amount || 0),
      currency: String(data.currency || "USD"),
      issueDate: String(data.issueDate || row.date || "").slice(0, 10),
      expiryDate: String(data.expiryDate || ""),
      status: row.status || "DRAFT",
    };
  });

  const mappedCustoms = customs.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      declarationNo: String(data.declarationNo || row.title || ""),
      type: String(data.type || "Import"),
      shipperName: String(data.shipperName || ""),
      consigneeName: String(data.consigneeName || ""),
      totalPayable: Number(row.amount || data.totalPayable || 0),
      filingDate: String(data.filingDate || row.date || "").slice(0, 10),
      status: row.status || "FILED",
    };
  });

  const mappedCostings = costings.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      shipmentRef: String(data.shipmentRef || row.title || ""),
      supplier: String(data.supplier || ""),
      currency: String(data.currency || "USD"),
      goodsValue: Number(data.goodsValue || 0),
      freight: Number(data.freight || 0),
      customs: Number(data.customs || 0),
      insurance: Number(data.insurance || 0),
      clearing: Number(data.clearing || 0),
      otherCharges: Number(data.otherCharges || 0),
      landedCost: Number(row.amount || 0),
      units: Number(data.units || 0),
      landedPerUnit: Number(data.landedPerUnit || 0),
      status: String(row.status || "draft"),
      date: String(row.date || "").slice(0, 10),
    };
  });

  const mappedRebates = rebates.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      claimNo: String(data.claimNo || row.title || ""),
      invoiceRef: String(data.invoiceRef || ""),
      shipmentRef: String(data.shipmentRef || ""),
      scheme: String(data.scheme || "DLTL"),
      amount: Number(row.amount || 0),
      status: String(row.status || "filed"),
      date: String(row.date || "").slice(0, 10),
      notes: String(data.notes || ""),
    };
  });

  const summary = {
    shipmentCount: mappedShipments.length,
    activeLcCount: mappedLcs.filter((row) => !["SETTLED", "EXPIRED", "CANCELLED"].includes(statusKey(row.status))).length,
    openCustomsCount: mappedCustoms.filter((row) => statusKey(row.status) !== "CLEARED").length,
    rebateCount: mappedRebates.length,
    shipmentValue: mappedShipments.reduce((sum, row) => sum + row.amount, 0),
    lcValue: mappedLcs.reduce((sum, row) => sum + row.amount, 0),
    landedCost: mappedCostings.reduce((sum, row) => sum + row.landedCost, 0),
    rebateValue: mappedRebates.reduce((sum, row) => sum + row.amount, 0),
    openCustomsPayable: mappedCustoms
      .filter((row) => statusKey(row.status) !== "CLEARED")
      .reduce((sum, row) => sum + row.totalPayable, 0),
    shipmentFreight: mappedShipments.reduce((sum, row) => sum + row.freightCost, 0),
  };

  return NextResponse.json({
    summary,
    shipments: mappedShipments,
    lcs: mappedLcs,
    customs: mappedCustoms,
    costings: mappedCostings,
    rebates: mappedRebates,
  });
}
