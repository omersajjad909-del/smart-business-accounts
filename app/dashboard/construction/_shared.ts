import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const constructionFont = "'Outfit','Inter',sans-serif";
export const constructionBg = "rgba(255,255,255,0.03)";
export const constructionBorder = "rgba(255,255,255,0.07)";
export const constructionMuted = "rgba(255,255,255,0.45)";

export type ConstructionProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type ConstructionSiteStatus = "active" | "inactive" | "maintenance";
export type ConstructionMaterialStatus = "in_stock" | "issued" | "consumed";
export type SubcontractorStatus = "active" | "closed" | "on_hold";
export type ConstructionBillingStatus = "draft" | "submitted" | "approved" | "paid";
export type ConstructionExpenseStatus = "open" | "approved" | "posted";
export type ConstructionPaymentStatus = "scheduled" | "released" | "cleared";

export type ConstructionControlCenter = {
  summary: {
    projects: number;
    activeProjects: number;
    sites: number;
    activeSites: number;
    materialValue: number;
    lowStockMaterials: number;
    subcontractors: number;
    contractExposure: number;
    boqItems: number;
    certifiedBilling: number;
    expenses: number;
    contractorPayments: number;
  };
  projects: ReturnType<typeof mapConstructionProjects>;
  sites: ReturnType<typeof mapConstructionSites>;
  materials: ReturnType<typeof mapConstructionMaterials>;
  subcontractors: ReturnType<typeof mapSubcontractors>;
  boq: ReturnType<typeof mapBoqRecords>;
  billing: ReturnType<typeof mapConstructionBilling>;
  expenses: ReturnType<typeof mapConstructionExpenses>;
  payments: ReturnType<typeof mapConstructionPayments>;
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

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function mapConstructionProjects(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    client: String(record.data?.client || ""),
    budget: Number(record.amount || 0),
    spent: Number(record.data?.spent || 0),
    startDate: String(record.date || "").slice(0, 10),
    endDate: String(record.data?.endDate || ""),
    location: String(record.data?.location || ""),
    progress: Number(record.data?.progress || 0),
    site: String(record.data?.site || ""),
    status: (record.status as ConstructionProjectStatus) || "planning",
  }));
}

export function mapConstructionSites(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    location: String(record.data?.location || ""),
    supervisor: String(record.data?.supervisor || ""),
    workers: Number(record.data?.workers || 0),
    phone: String(record.data?.phone || ""),
    status: (record.status as ConstructionSiteStatus) || "active",
  }));
}

export function mapConstructionMaterials(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    unit: String(record.data?.unit || "bags"),
    quantity: Number(record.data?.quantity || 0),
    unitCost: Number(record.amount || 0),
    supplier: String(record.data?.supplier || ""),
    site: String(record.data?.site || ""),
    project: String(record.data?.project || ""),
    status: (record.status as ConstructionMaterialStatus) || "in_stock",
  }));
}

export function mapSubcontractors(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    trade: String(record.data?.trade || ""),
    phone: String(record.data?.phone || ""),
    contractValue: Number(record.amount || 0),
    paid: Number(record.data?.paid || 0),
    project: String(record.data?.project || ""),
    site: String(record.data?.site || ""),
    status: (record.status as SubcontractorStatus) || "active",
  }));
}

export function mapBoqRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    project: record.title,
    item: String(record.data?.item || ""),
    site: String(record.data?.site || ""),
    unit: String(record.data?.unit || "sqft"),
    quantity: Number(record.data?.quantity || 0),
    unitRate: Number(record.amount || 0),
    billedQuantity: Number(record.data?.billedQuantity || 0),
    status: String(record.status || "open"),
  }));
}

export function mapConstructionBilling(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    project: record.title,
    client: String(record.data?.client || ""),
    site: String(record.data?.site || ""),
    invoiceNo: String(record.data?.invoiceNo || ""),
    progress: Number(record.data?.progress || 0),
    certifiedValue: Number(record.amount || 0),
    date: String(record.date || "").slice(0, 10),
    status: (record.status as ConstructionBillingStatus) || "draft",
  }));
}

export function mapConstructionExpenses(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    title: record.title,
    site: String(record.data?.site || ""),
    project: String(record.data?.project || ""),
    category: String(record.data?.category || ""),
    vendor: String(record.data?.vendor || ""),
    amount: Number(record.amount || 0),
    date: String(record.date || "").slice(0, 10),
    status: (record.status as ConstructionExpenseStatus) || "open",
  }));
}

export function mapConstructionPayments(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    subcontractor: record.title,
    project: String(record.data?.project || ""),
    site: String(record.data?.site || ""),
    reference: String(record.data?.reference || ""),
    amount: Number(record.amount || 0),
    date: String(record.date || "").slice(0, 10),
    status: (record.status as ConstructionPaymentStatus) || "scheduled",
  }));
}
