"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export type ManufacturingBom = {
  id: string;
  product: string;
  version: string;
  materials: string[];
  unitCost: number;
  yieldUnits: number;
};

export type ManufacturingProductionOrder = {
  id: string;
  orderId: string;
  product: string;
  quantity: number;
  completed: number;
  plannedDate: string;
  assignedTo: string;
  notes: string;
  status: string;
  bomId: string;
  bomVersion: string;
};

export type ManufacturingWorkOrder = {
  id: string;
  workOrderId: string;
  title: string;
  machine: string;
  operator: string;
  priority: string;
  scheduledDate: string;
  estimatedHours: number;
  status: string;
  linkedProductionOrderId: string;
};

export type ManufacturingRawMaterial = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  supplier: string;
  status: string;
  isLow: boolean;
};

export type ManufacturingFinishedGood = {
  id: string;
  batchNo: string;
  product: string;
  quantity: number;
  warehouse: string;
  productionOrderId: string;
  productionDate: string;
  status: string;
};

export type ManufacturingQualityCheck = {
  id: string;
  inspectionNo: string;
  itemName: string;
  stage: string;
  inspector: string;
  result: string;
  notes: string;
  checkedDate: string;
};

export function mapBomRecord(record: BusinessRecord): ManufacturingBom {
  return {
    id: record.id,
    product: record.title,
    version: String(record.data?.version || "v1.0"),
    materials: String(record.data?.materials || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    unitCost: record.amount || 0,
    yieldUnits: Number(record.data?.yield || 1),
  };
}

export function mapProductionOrderRecord(record: BusinessRecord): ManufacturingProductionOrder {
  return {
    id: record.id,
    orderId: String(record.data?.orderId || record.title),
    product: record.title,
    quantity: Number(record.data?.quantity || 1),
    completed: Number(record.data?.completed || 0),
    plannedDate: record.date?.split("T")[0] || "",
    assignedTo: String(record.data?.assignedTo || ""),
    notes: String(record.data?.notes || ""),
    status: record.status || "planned",
    bomId: String(record.data?.bomId || ""),
    bomVersion: String(record.data?.bomVersion || ""),
  };
}

export function mapWorkOrderRecord(record: BusinessRecord): ManufacturingWorkOrder {
  return {
    id: record.id,
    workOrderId: String(record.data?.workOrderId || record.title),
    title: record.title,
    machine: String(record.data?.machine || ""),
    operator: String(record.data?.operator || ""),
    priority: String(record.data?.priority || "medium"),
    scheduledDate: record.date?.split("T")[0] || "",
    estimatedHours: Number(record.data?.estimatedHours || 1),
    status: record.status || "open",
    linkedProductionOrderId: String(record.data?.linkedProductionOrderId || ""),
  };
}

export function mapRawMaterialRecord(record: BusinessRecord): ManufacturingRawMaterial {
  const currentStock = Number(record.data?.currentStock || 0);
  const minStock = Number(record.data?.minStock || 10);
  return {
    id: record.id,
    name: record.title,
    unit: String(record.data?.unit || "kg"),
    currentStock,
    minStock,
    unitCost: record.amount || 0,
    supplier: String(record.data?.supplier || ""),
    status: record.status || "available",
    isLow: currentStock <= minStock,
  };
}

export function mapFinishedGoodsRecord(record: BusinessRecord): ManufacturingFinishedGood {
  return {
    id: record.id,
    batchNo: String(record.data?.batchNo || record.title),
    product: record.title,
    quantity: Number(record.data?.quantity || 0),
    warehouse: String(record.data?.warehouse || "Main Warehouse"),
    productionOrderId: String(record.data?.productionOrderId || ""),
    productionDate: record.date?.split("T")[0] || "",
    status: record.status || "available",
  };
}

export function mapQualityCheckRecord(record: BusinessRecord): ManufacturingQualityCheck {
  return {
    id: record.id,
    inspectionNo: String(record.data?.inspectionNo || record.title),
    itemName: record.title,
    stage: String(record.data?.stage || "final"),
    inspector: String(record.data?.inspector || ""),
    result: String(record.status || "pending"),
    notes: String(record.data?.notes || ""),
    checkedDate: record.date?.split("T")[0] || "",
  };
}
