import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const autoFont = "'Outfit','Inter',sans-serif";
export const autoBg = "rgba(255,255,255,.03)";
export const autoBorder = "rgba(255,255,255,.07)";
export const autoMuted = "rgba(255,255,255,.56)";

export async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export type ShowroomVehicleStatus = "Available" | "Reserved" | "Sold";
export type TestDriveStatus = "scheduled" | "completed" | "cancelled";
export type DealStatus = "lead" | "negotiation" | "financed" | "won" | "lost";

export type ShowroomVehicle = {
  id: string;
  make: string;
  model: string;
  year: string;
  color: string;
  type: string;
  vin: string;
  price: number;
  status: ShowroomVehicleStatus;
};

export type ShowroomTestDrive = {
  id: string;
  customer: string;
  vehicleId: string;
  vehicleLabel: string;
  driveDate: string;
  phone: string;
  status: TestDriveStatus;
};

export type ShowroomDeal = {
  id: string;
  customer: string;
  vehicleId: string;
  vehicleLabel: string;
  amount: number;
  financier: string;
  status: DealStatus;
};

export type AutomotiveControlCenter = {
  summary: {
    vehicles: number;
    availableVehicles: number;
    reservedVehicles: number;
    soldVehicles: number;
    inventoryValue: number;
    soldValue: number;
    openDeals: number;
    wonDeals: number;
    lostDeals: number;
    completedDrives: number;
    scheduledDrives: number;
    conversionRate: number;
  };
  vehicles: ShowroomVehicle[];
  testDrives: ShowroomTestDrive[];
  deals: ShowroomDeal[];
};

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function mapShowroomVehicles(records: BusinessRecord[]): ShowroomVehicle[] {
  return records.map((record) => ({
    id: record.id,
    make: String(record.data?.make || ""),
    model: String(record.data?.model || ""),
    year: String(record.data?.year || ""),
    color: String(record.data?.color || ""),
    type: String(record.data?.type || "New"),
    vin: String(record.data?.vin || ""),
    price: Number(record.amount || record.data?.price || 0),
    status: (record.status as ShowroomVehicleStatus) || "Available",
  }));
}

export function mapShowroomTestDrives(records: BusinessRecord[]): ShowroomTestDrive[] {
  return records.map((record) => ({
    id: record.id,
    customer: record.title,
    vehicleId: String(record.data?.vehicleId || ""),
    vehicleLabel: String(record.data?.vehicleLabel || ""),
    driveDate: String(record.date || record.data?.driveDate || todayIso()),
    phone: String(record.data?.phone || ""),
    status: (record.status as TestDriveStatus) || "scheduled",
  }));
}

export function mapShowroomDeals(records: BusinessRecord[]): ShowroomDeal[] {
  return records.map((record) => ({
    id: record.id,
    customer: record.title,
    vehicleId: String(record.data?.vehicleId || ""),
    vehicleLabel: String(record.data?.vehicleLabel || ""),
    amount: Number(record.amount || 0),
    financier: String(record.data?.financier || "Direct"),
    status: (record.status as DealStatus) || "lead",
  }));
}

export function autoStatusColor(status: string) {
  const colors: Record<string, string> = {
    Available: "#34d399",
    Reserved: "#f59e0b",
    Sold: "#ef4444",
    scheduled: "#60a5fa",
    completed: "#34d399",
    cancelled: "#6b7280",
    lead: "#60a5fa",
    negotiation: "#c084fc",
    financed: "#f59e0b",
    won: "#34d399",
    lost: "#ef4444",
  };
  return colors[status] || "#a78bfa";
}
