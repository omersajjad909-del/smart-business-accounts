"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const eventsAccent = "#fb7185";

export type EventsControlCenter = {
  summary: {
    bookings: number;
    confirmedBookings: number;
    tentativeBookings: number;
    vendors: number;
    activeVendors: number;
    budgetLines: number;
    plannedSpend: number;
    pipelineValue: number;
  };
  bookings: ReturnType<typeof mapEventBooking>[];
  vendors: ReturnType<typeof mapEventVendor>[];
  budgets: ReturnType<typeof mapEventBudget>[];
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

export function mapEventBooking(record: BusinessRecord) {
  return {
    id: record.id,
    booking: record.title,
    client: String(record.data?.client || ""),
    package: String(record.data?.package || ""),
    eventDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "tentative",
  };
}

export function mapEventVendor(record: BusinessRecord) {
  return {
    id: record.id,
    vendor: record.title,
    service: String(record.data?.service || ""),
    contact: String(record.data?.contact || ""),
    city: String(record.data?.city || ""),
    status: record.status || "active",
  };
}

export function mapEventBudget(record: BusinessRecord) {
  return {
    id: record.id,
    event: record.title,
    category: String(record.data?.category || ""),
    owner: String(record.data?.owner || ""),
    dueDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "planned",
  };
}
