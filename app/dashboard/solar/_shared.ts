"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const solarAccent = "#fbbf24";

export type SolarControlCenter = {
  summary: {
    projects: number;
    liveProjects: number;
    commissionedProjects: number;
    equipmentItems: number;
    lowStockEquipment: number;
    amcContracts: number;
    pendingVisits: number;
    pipelineBudget: number;
  };
  projects: ReturnType<typeof mapSolarProject>[];
  equipment: ReturnType<typeof mapSolarEquipment>[];
  amc: ReturnType<typeof mapSolarAmc>[];
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

export function mapSolarProject(record: BusinessRecord) {
  return {
    id: record.id,
    project: record.title,
    customer: String(record.data?.customer || ""),
    site: String(record.data?.site || ""),
    capacity: Number(record.data?.capacityKw || 0),
    deadline: String(record.data?.deadline || "").slice(0, 10),
    budget: Number(record.amount || 0),
    status: record.status || "planned",
  };
}

export function mapSolarEquipment(record: BusinessRecord) {
  return {
    id: record.id,
    item: record.title,
    sku: String(record.data?.sku || ""),
    quantity: Number(record.data?.quantity || 0),
    reorderLevel: Number(record.data?.reorderLevel || 0),
    warehouse: String(record.data?.warehouse || ""),
    status: record.status || "in_stock",
  };
}

export function mapSolarAmc(record: BusinessRecord) {
  return {
    id: record.id,
    contract: record.title,
    customer: String(record.data?.customer || ""),
    nextVisit: String(record.date || "").slice(0, 10),
    technician: String(record.data?.technician || ""),
    value: Number(record.amount || 0),
    status: record.status || "scheduled",
  };
}
