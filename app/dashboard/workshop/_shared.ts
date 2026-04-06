"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const workshopAccent = "#f59e0b";

export function mapWorkshopJob(record: BusinessRecord) {
  return {
    id: record.id,
    job: record.title,
    customer: String(record.data?.customer || ""),
    vehicle: String(record.data?.vehicle || ""),
    promisedDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "open",
  };
}

export function mapWorkshopMechanic(record: BusinessRecord) {
  return {
    id: record.id,
    mechanic: record.title,
    specialty: String(record.data?.specialty || ""),
    phone: String(record.data?.phone || ""),
    bay: String(record.data?.bay || ""),
    status: record.status || "active",
  };
}

export function mapWorkshopPart(record: BusinessRecord) {
  return {
    id: record.id,
    part: record.title,
    job: String(record.data?.job || ""),
    quantity: Number(record.data?.quantity || 0),
    supplier: String(record.data?.supplier || ""),
    cost: Number(record.amount || 0),
    status: record.status || "issued",
  };
}

export function mapWorkshopWarranty(record: BusinessRecord) {
  return {
    id: record.id,
    claim: record.title,
    vehicle: String(record.data?.vehicle || ""),
    customer: String(record.data?.customer || ""),
    expiryDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "active",
  };
}
