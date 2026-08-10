import type { BusinessRecord } from "@/lib/useBusinessRecords";

export type ManufacturingControlCenter = {
  summary: {
    bomCount: number;
    plannedProduction: number;
    runningProduction: number;
    completedProduction: number;
    openWorkOrders: number;
    blockedProduction: number;
    lowMaterials: number;
    materialValue: number;
    finishedQuantity: number;
    passedChecks: number;
    rejectedChecks: number;
  };
  boms: ManufacturingBom[];
  production: ManufacturingProductionOrder[];
  workOrders: ManufacturingWorkOrder[];
  materials: ManufacturingRawMaterial[];
  finishedGoods: ManufacturingFinishedGood[];
  qualityChecks: ManufacturingQualityCheck[];
};

export async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export type ManufacturingBom = {
  id: string;
  product: string;
  version: string;
  /** Legacy free-text material names — kept so pre-existing BOMs still render. */
  materials: string[];
  /** Structured lines against real items. Empty on BOMs made before costing. */
  lines: { itemId: string; qty: number }[];
  finishedItemId: string;
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
    lines: Array.isArray(record.data?.lines)
      ? (record.data.lines as { itemId?: unknown; qty?: unknown }[])
          .map((line) => ({ itemId: String(line?.itemId || ""), qty: Number(line?.qty) || 0 }))
          .filter((line) => line.itemId && line.qty > 0)
      : [],
    finishedItemId: String(record.data?.finishedItemId || ""),
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

// ── Real inventory ────────────────────────────────────────────────────────────
// Manufacturing used to keep raw materials in BusinessRecord, separate from the
// ItemNew rows purchasing and sales use, so the same physical sack of flour
// existed twice and neither copy knew the other's stock. Everything below reads
// the real inventory instead.

export type ManufacturingItem = {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  purchaseRate: number;
  rate: number;
  minStock: number;
  currentStock: number;
  unitCost: number;
  stockValue: number;
  isLow: boolean;
};

/** One material line of a BOM: a real item and how much of it a batch consumes. */
export type BomLineInput = { itemId: string; qty: number };

export type PricedBomLine = BomLineInput & {
  itemName: string;
  unit: string;
  unitCost: number;
  requiredQty: number;
  availableQty: number;
  lineCost: number;
};

export type ProductionRunQuote = {
  producedQty: number;
  remaining: number;
  lines: PricedBomLine[];
  totalCost: number;
  unitCost: number;
  shortages: PricedBomLine[];
  error?: string;
  needsBomLines?: boolean;
};

export async function loadManufacturingItems(category?: "RAW_MATERIAL" | "FINISHED"): Promise<ManufacturingItem[]> {
  const query = category ? `?category=${category}` : "";
  return fetchJson<ManufacturingItem[]>(`/api/manufacturing/items${query}`, []);
}

export async function quoteProductionRun(productionOrderId: string, qty?: number): Promise<ProductionRunQuote | null> {
  const params = new URLSearchParams({ productionOrderId });
  if (qty && qty > 0) params.set("qty", String(qty));
  try {
    const res = await fetch(`/api/manufacturing/production-orders/complete?${params}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) return { ...body, lines: [], shortages: [], totalCost: 0, unitCost: 0, producedQty: 0, remaining: 0 };
    return body as ProductionRunQuote;
  } catch {
    return null;
  }
}
