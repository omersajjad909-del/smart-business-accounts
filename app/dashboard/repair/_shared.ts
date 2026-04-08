"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const repairAccent = "#38bdf8";

export type RepairControlCenter = {
  summary: {
    jobs: number;
    activeJobs: number;
    readyJobs: number;
    technicians: number;
    activeTechnicians: number;
    partsCost: number;
    warrantyClaims: number;
    warrantyExposure: number;
  };
  jobs: ReturnType<typeof mapRepairJob>[];
  technicians: ReturnType<typeof mapRepairTechnician>[];
  parts: ReturnType<typeof mapRepairPart>[];
  warranties: ReturnType<typeof mapRepairWarranty>[];
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

export function mapRepairJob(record: BusinessRecord) {
  return {
    id: record.id,
    job: record.title,
    customer: String(record.data?.customer || ""),
    device: String(record.data?.device || ""),
    dueDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "diagnosis",
  };
}

export function mapRepairTechnician(record: BusinessRecord) {
  return {
    id: record.id,
    technician: record.title,
    specialty: String(record.data?.specialty || ""),
    phone: String(record.data?.phone || ""),
    workload: String(record.data?.workload || ""),
    status: record.status || "active",
  };
}

export function mapRepairPart(record: BusinessRecord) {
  return {
    id: record.id,
    part: record.title,
    job: String(record.data?.job || ""),
    quantity: Number(record.data?.quantity || 0),
    supplier: String(record.data?.supplier || ""),
    cost: Number(record.amount || 0),
    status: record.status || "available",
  };
}

export function mapRepairWarranty(record: BusinessRecord) {
  return {
    id: record.id,
    claim: record.title,
    customer: String(record.data?.customer || ""),
    device: String(record.data?.device || ""),
    expiryDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "covered",
  };
}
