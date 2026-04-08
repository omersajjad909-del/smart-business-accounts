import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const maintenanceAccent = "#34d399";
export const maintenanceBg = "rgba(15,23,42,.72)";
export const maintenanceBorder = "rgba(52,211,153,.18)";
export const maintenanceMuted = "rgba(226,232,240,.65)";
export const maintenanceFont = "'Outfit','Inter',sans-serif";

export type MaintenanceContract = ReturnType<typeof mapMaintenanceContract>;
export type MaintenanceSchedule = ReturnType<typeof mapMaintenanceSchedule>;
export type MaintenancePart = ReturnType<typeof mapMaintenancePart>;
export type MaintenanceJob = ReturnType<typeof mapMaintenanceJob>;

export type MaintenanceControlCenter = {
  summary: {
    contracts: number;
    activeContracts: number;
    renewalDue: number;
    schedules: number;
    scheduledVisits: number;
    completedVisits: number;
    jobs: number;
    openJobs: number;
    urgentJobs: number;
    parts: number;
    lowStockParts: number;
    contractValue: number;
  };
  contracts: MaintenanceContract[];
  schedules: MaintenanceSchedule[];
  jobs: MaintenanceJob[];
  parts: MaintenancePart[];
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

export function mapMaintenanceContract(record: BusinessRecord) {
  return {
    id: record.id,
    contract: record.title,
    client: String(record.data?.client || ""),
    asset: String(record.data?.asset || ""),
    visitsPerYear: Number(record.data?.visitsPerYear || 0),
    value: Number(record.amount || 0),
    renewalDate: String(record.date || "").slice(0, 10),
    status: record.status || "active",
  };
}

export function mapMaintenanceSchedule(record: BusinessRecord) {
  return {
    id: record.id,
    visit: record.title,
    client: String(record.data?.client || ""),
    site: String(record.data?.site || ""),
    team: String(record.data?.team || ""),
    visitType: String(record.data?.visitType || ""),
    scheduledDate: String(record.date || "").slice(0, 10),
    status: record.status || "scheduled",
  };
}

export function mapMaintenancePart(record: BusinessRecord) {
  return {
    id: record.id,
    part: record.title,
    job: String(record.data?.job || ""),
    supplier: String(record.data?.supplier || ""),
    quantity: Number(record.data?.quantity || 0),
    reorderLevel: Number(record.data?.reorderLevel || 0),
    cost: Number(record.amount || 0),
    status: record.status || "available",
  };
}

export function mapMaintenanceJob(record: BusinessRecord) {
  return {
    id: record.id,
    job: record.title,
    client: String(record.data?.client || ""),
    technician: String(record.data?.assignedTo || ""),
    priority: String(record.data?.priority || ""),
    scheduledDate: String(record.date || "").slice(0, 10),
    status: record.status || "Pending",
  };
}
