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

  const [bom, production, workOrders, materials, finishedGoods, qualityChecks] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "bom" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "production_order" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "work_order" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "raw_material" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "finished_good_batch" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "quality_check" }, orderBy: { createdAt: "desc" } }),
  ]);

  const boms = bom.map((record) => ({
    id: record.id,
    product: record.title,
    version: String((record.data || {})["version"] || "v1.0"),
    materials: String((record.data || {})["materials"] || "").split(",").map((item) => item.trim()).filter(Boolean),
    unitCost: Number(record.amount || 0),
    yieldUnits: Number((record.data || {})["yield"] || 1),
  }));
  const mappedProduction = production.map((record) => ({
    id: record.id,
    orderId: String((record.data || {})["orderId"] || record.title),
    product: record.title,
    quantity: Number((record.data || {})["quantity"] || 1),
    completed: Number((record.data || {})["completed"] || 0),
    plannedDate: record.date?.split("T")[0] || "",
    assignedTo: String((record.data || {})["assignedTo"] || ""),
    notes: String((record.data || {})["notes"] || ""),
    status: String(record.status || "planned"),
    bomId: String((record.data || {})["bomId"] || ""),
    bomVersion: String((record.data || {})["bomVersion"] || ""),
  }));
  const mappedWorkOrders = workOrders.map((record) => ({
    id: record.id,
    workOrderId: String((record.data || {})["workOrderId"] || record.title),
    title: record.title,
    machine: String((record.data || {})["machine"] || ""),
    operator: String((record.data || {})["operator"] || ""),
    priority: String((record.data || {})["priority"] || "medium"),
    scheduledDate: record.date?.split("T")[0] || "",
    estimatedHours: Number((record.data || {})["estimatedHours"] || 1),
    status: String(record.status || "open"),
    linkedProductionOrderId: String((record.data || {})["linkedProductionOrderId"] || ""),
  }));
  const mappedMaterials = materials.map((record) => {
    const currentStock = Number((record.data || {})["currentStock"] || 0);
    const minStock = Number((record.data || {})["minStock"] || 10);
    return {
      id: record.id,
      name: record.title,
      unit: String((record.data || {})["unit"] || "kg"),
      currentStock,
      minStock,
      unitCost: Number(record.amount || 0),
      supplier: String((record.data || {})["supplier"] || ""),
      status: String(record.status || "available"),
      isLow: currentStock <= minStock,
    };
  });
  const mappedFinishedGoods = finishedGoods.map((record) => ({
    id: record.id,
    batchNo: String((record.data || {})["batchNo"] || record.title),
    product: record.title,
    quantity: Number((record.data || {})["quantity"] || 0),
    warehouse: String((record.data || {})["warehouse"] || "Main Warehouse"),
    productionOrderId: String((record.data || {})["productionOrderId"] || ""),
    productionDate: record.date?.split("T")[0] || "",
    status: String(record.status || "available"),
  }));
  const mappedQualityChecks = qualityChecks.map((record) => ({
    id: record.id,
    inspectionNo: String((record.data || {})["inspectionNo"] || record.title),
    itemName: record.title,
    stage: String((record.data || {})["stage"] || "final"),
    inspector: String((record.data || {})["inspector"] || ""),
    result: String(record.status || "pending"),
    notes: String((record.data || {})["notes"] || ""),
    checkedDate: record.date?.split("T")[0] || "",
  }));

  return NextResponse.json({
    summary: {
      bomCount: boms.length,
      plannedProduction: mappedProduction.filter((item) => item.status === "planned").length,
      runningProduction: mappedProduction.filter((item) => item.status === "in_progress").length,
      completedProduction: mappedProduction.filter((item) => item.status === "completed").length,
      openWorkOrders: mappedWorkOrders.filter((item) => item.status !== "completed").length,
      blockedProduction: mappedProduction.filter((item) => item.status === "in_progress" && mappedWorkOrders.some((work) => work.linkedProductionOrderId === item.orderId && work.status !== "completed")).length,
      lowMaterials: mappedMaterials.filter((item) => item.isLow).length,
      materialValue: mappedMaterials.reduce((sum, item) => sum + item.currentStock * item.unitCost, 0),
      finishedQuantity: mappedFinishedGoods.reduce((sum, item) => sum + item.quantity, 0),
      passedChecks: mappedQualityChecks.filter((item) => item.result === "passed").length,
      rejectedChecks: mappedQualityChecks.filter((item) => item.result === "rejected").length,
    },
    boms,
    production: mappedProduction,
    workOrders: mappedWorkOrders,
    materials: mappedMaterials,
    finishedGoods: mappedFinishedGoods,
    qualityChecks: mappedQualityChecks,
  });
}
