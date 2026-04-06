"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const repairAccent = "#38bdf8";

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
