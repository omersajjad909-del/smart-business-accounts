import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const realEstateFont = "'Outfit','Inter',sans-serif";
export const realEstateBg = "rgba(255,255,255,0.03)";
export const realEstateBorder = "rgba(255,255,255,0.07)";
export const realEstateMuted = "rgba(255,255,255,0.45)";

export type PropertyStatus = "vacant" | "rented" | "maintenance" | "for_sale";

export type RealEstateControlCenter = {
  summary: {
    properties: number;
    rentedProperties: number;
    vacantProperties: number;
    maintenanceProperties: number;
    tenants: number;
    activeTenants: number;
    leases: number;
    activeLeases: number;
    occupancyRate: number;
    collectedRent: number;
    pendingRent: number;
  };
  properties: ReturnType<typeof mapPropertyRecords>;
  tenants: ReturnType<typeof mapTenantRecords>;
  leases: ReturnType<typeof mapLeaseRecords>;
  rents: ReturnType<typeof mapRentRecords>;
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

export function mapPropertyRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    type: String(record.data?.type || "Apartment"),
    address: String(record.data?.address || ""),
    size: String(record.data?.size || ""),
    status: (record.status as PropertyStatus) || "vacant",
    rent: Number(record.amount || 0),
    tenant: String(record.data?.tenant || ""),
    leaseEnd: String(record.data?.leaseEnd || ""),
    rooms: Number(record.data?.rooms || 0),
  }));
}

export function mapTenantRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    phone: String(record.data?.phone || ""),
    email: String(record.data?.email || ""),
    cnic: String(record.data?.cnic || ""),
    property: String(record.data?.property || ""),
    unit: String(record.data?.unit || ""),
    rentAmount: Number(record.amount || record.data?.rentAmount || 0),
    depositPaid: Number(record.data?.depositPaid || 0),
    leaseStart: String(record.date || record.data?.leaseStart || ""),
    leaseEnd: String(record.data?.leaseEnd || ""),
    status: String(record.status || "active"),
  }));
}

export function mapLeaseRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    tenant: record.title,
    property: String(record.data?.property || ""),
    startDate: String(record.data?.startDate || ""),
    endDate: String(record.data?.endDate || ""),
    rentAmount: Number(record.amount || 0),
    deposit: Number(record.data?.deposit || 0),
    type: String(record.data?.type || "Residential"),
    status: String(record.status || "active"),
  }));
}

export function mapRentRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    tenant: record.title,
    property: String(record.data?.property || ""),
    amount: Number(record.amount || 0),
    month: String(record.data?.month || ""),
    dueDate: String(record.date || ""),
    notes: String(record.data?.notes || ""),
    status: String(record.status || "pending"),
  }));
}
