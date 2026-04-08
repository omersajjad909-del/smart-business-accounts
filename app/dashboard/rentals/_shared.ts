"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const rentalsAccent = "#60a5fa";

export function mapRentalItem(record: BusinessRecord) {
  return {
    id: record.id,
    item: record.title,
    sku: String(record.data?.sku || ""),
    category: String(record.data?.category || ""),
    quantity: Number(record.data?.quantity || 0),
    warehouse: String(record.data?.warehouse || ""),
    status: record.status || "available",
  };
}

export function mapRentalBooking(record: BusinessRecord) {
  return {
    id: record.id,
    booking: record.title,
    customer: String(record.data?.customer || ""),
    asset: String(record.data?.asset || ""),
    pickupDate: String(record.date || "").slice(0, 10),
    returnDate: String(record.data?.returnDate || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "reserved",
  };
}

export function mapRentalAgreement(record: BusinessRecord) {
  return {
    id: record.id,
    agreement: record.title,
    customer: String(record.data?.customer || ""),
    asset: String(record.data?.asset || ""),
    startDate: String(record.date || "").slice(0, 10),
    endDate: String(record.data?.endDate || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "draft",
  };
}

export function mapRentalMaintenance(record: BusinessRecord) {
  return {
    id: record.id,
    job: record.title,
    asset: String(record.data?.asset || ""),
    technician: String(record.data?.technician || ""),
    dueDate: String(record.date || "").slice(0, 10),
    cost: Number(record.amount || 0),
    status: record.status || "scheduled",
  };
}

export type RentalsControlCenter = {
  summary: {
    items: number;
    availableItems: number;
    bookings: number;
    activeBookings: number;
    agreements: number;
    activeAgreements: number;
    maintenanceJobs: number;
    dueMaintenance: number;
    bookingValue: number;
  };
  items: ReturnType<typeof mapRentalItem>[];
  bookings: ReturnType<typeof mapRentalBooking>[];
  agreements: ReturnType<typeof mapRentalAgreement>[];
  maintenance: ReturnType<typeof mapRentalMaintenance>[];
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
