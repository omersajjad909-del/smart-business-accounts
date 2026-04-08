import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const serviceFont = "'Outfit','Inter',sans-serif";
export const serviceBg = "rgba(255,255,255,0.03)";
export const serviceBorder = "rgba(255,255,255,0.07)";
export const serviceMuted = "rgba(255,255,255,.55)";

export type ServiceCatalogItem = {
  id: string;
  name: string;
  billingType: string;
  rate: number;
  turnaroundDays: number;
  scope: string;
};

export type ServiceProject = {
  id: string;
  projectCode: string;
  name: string;
  client: string;
  manager: string;
  dueDate: string;
  budget: number;
  status: string;
};

export type ServiceDelivery = {
  id: string;
  deliveryNo: string;
  projectCode: string;
  client: string;
  milestone: string;
  dueDate: string;
  status: string;
};

export type ServiceTimesheet = {
  id: string;
  entryNo: string;
  projectCode: string;
  consultant: string;
  billableHours: number;
  billingRate: number;
  workDate: string;
  status: string;
};

export type ServicesControlCenter = {
  summary: {
    catalog: number;
    activeProjects: number;
    completedProjects: number;
    deliveries: number;
    overdueDeliveries: number;
    reviewDeliveries: number;
    timesheets: number;
    draftTimesheets: number;
    billableHours: number;
    billableValue: number;
    activeClients: number;
  };
  catalog: ServiceCatalogItem[];
  projects: ServiceProject[];
  deliveries: ServiceDelivery[];
  timesheets: ServiceTimesheet[];
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

export function mapServiceCatalogRecord(record: BusinessRecord): ServiceCatalogItem {
  return {
    id: record.id,
    name: record.title,
    billingType: String(record.data?.billingType || "fixed"),
    rate: record.amount || 0,
    turnaroundDays: Number(record.data?.turnaroundDays || 0),
    scope: String(record.data?.scope || ""),
  };
}

export function mapServiceProjectRecord(record: BusinessRecord): ServiceProject {
  return {
    id: record.id,
    projectCode: String(record.data?.projectCode || record.title),
    name: record.title,
    client: String(record.data?.client || ""),
    manager: String(record.data?.manager || ""),
    dueDate: record.date?.split("T")[0] || "",
    budget: record.amount || 0,
    status: record.status || "active",
  };
}

export function mapServiceDeliveryRecord(record: BusinessRecord): ServiceDelivery {
  return {
    id: record.id,
    deliveryNo: String(record.data?.deliveryNo || record.title),
    projectCode: String(record.data?.projectCode || ""),
    client: String(record.data?.client || ""),
    milestone: record.title,
    dueDate: record.date?.split("T")[0] || "",
    status: record.status || "planned",
  };
}

export function mapServiceTimesheetRecord(record: BusinessRecord): ServiceTimesheet {
  return {
    id: record.id,
    entryNo: String(record.data?.entryNo || record.title),
    projectCode: String(record.data?.projectCode || ""),
    consultant: String(record.data?.consultant || ""),
    billableHours: Number(record.data?.billableHours || 0),
    billingRate: record.amount || 0,
    workDate: record.date?.split("T")[0] || "",
    status: record.status || "draft",
  };
}
