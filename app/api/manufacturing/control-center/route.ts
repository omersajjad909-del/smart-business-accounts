import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { getStockOnHand, getAverageCosts } from "@/lib/manufacturingPosting";

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
    prisma.itemNew.findMany({
      where: { companyId, deletedAt: null, category: "RAW_MATERIAL" },
      select: { id: true, name: true, unit: true, minStock: true, purchaseRate: true },
      orderBy: { name: "asc" },
    }),
    prisma.businessRecord.findMany({ where: { companyId, category: "finished_good_batch" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "quality_check" }, orderBy: { createdAt: "desc" } }),
  ]);

  const boms = bom.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      product: record.title,
      version: String(data.version || "v1.0"),
      materials: String(data.materials || "").split(",").map((item) => item.trim()).filter(Boolean),
      unitCost: Number(record.amount || 0),
      yieldUnits: Number(data.yield || 1),
    };
  });
  const mappedProduction = production.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      orderId: String(data.orderId || record.title),
      product: record.title,
      quantity: Number(data.quantity || 1),
      completed: Number(data.completed || 0),
      plannedDate: String(record.date || "").slice(0, 10),
      assignedTo: String(data.assignedTo || ""),
      notes: String(data.notes || ""),
      status: String(record.status || "planned"),
      bomId: String(data.bomId || ""),
      bomVersion: String(data.bomVersion || ""),
    };
  });
  const mappedWorkOrders = workOrders.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      workOrderId: String(data.workOrderId || record.title),
      title: record.title,
      machine: String(data.machine || ""),
      operator: String(data.operator || ""),
      priority: String(data.priority || "medium"),
      scheduledDate: String(record.date || "").slice(0, 10),
      estimatedHours: Number(data.estimatedHours || 1),
      status: String(record.status || "open"),
      linkedProductionOrderId: String(data.linkedProductionOrderId || ""),
    };
  });
  // Raw materials are real inventory now: stock and cost are derived from
  // InventoryTxn rather than read off a hand-typed BusinessRecord field, so this
  // panel agrees with the stock reports and the Raw Material Stock account.
  const materialIds = materials.map((item) => item.id);
  const [materialStock, materialCosts] = await Promise.all([
    getStockOnHand(prisma, companyId, materialIds),
    getAverageCosts(prisma, companyId, materialIds),
  ]);
  const mappedMaterials = materials.map((item) => {
    const currentStock = materialStock.get(item.id) ?? 0;
    const unitCost = materialCosts.get(item.id) ?? item.purchaseRate;
    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      currentStock,
      minStock: item.minStock,
      unitCost,
      supplier: "",
      status: currentStock <= item.minStock ? "low_stock" : "available",
      isLow: currentStock <= item.minStock,
    };
  });

  const mappedFinishedGoods = finishedGoods.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      batchNo: String(data.batchNo || record.title),
      product: record.title,
      quantity: Number(data.quantity || 0),
      warehouse: String(data.warehouse || "Main Warehouse"),
      productionOrderId: String(data.productionOrderId || ""),
      productionDate: String(record.date || "").slice(0, 10),
      status: String(record.status || "available"),
    };
  });
  const mappedQualityChecks = qualityChecks.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      inspectionNo: String(data.inspectionNo || record.title),
      itemName: record.title,
      stage: String(data.stage || "final"),
      inspector: String(data.inspector || ""),
      result: String(record.status || "pending"),
      notes: String(data.notes || ""),
      checkedDate: String(record.date || "").slice(0, 10),
    };
  });

  return NextResponse.json({
    summary: {
      bomCount: boms.length,
      plannedProduction: mappedProduction.filter((item) => item.status === "planned").length,
      runningProduction: mappedProduction.filter((item) => item.status === "in_progress" || item.status === "running").length,
      completedProduction: mappedProduction.filter((item) => item.status === "completed").length,
      openWorkOrders: mappedWorkOrders.filter((item) => item.status !== "completed").length,
      blockedProduction: mappedProduction.filter((item) => (item.status === "in_progress" || item.status === "running") && mappedWorkOrders.some((work) => work.linkedProductionOrderId === item.orderId && work.status !== "completed")).length,
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
