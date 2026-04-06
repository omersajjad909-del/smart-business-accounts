"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const utilityAccent = "#38bdf8";

export function mapUtilityConnection(record: BusinessRecord) {
  return {
    id: record.id,
    account: record.title,
    customer: String(record.data?.customer || ""),
    area: String(record.data?.area || ""),
    tariff: String(record.data?.tariff || ""),
    status: record.status || "pending",
  };
}

export function mapUtilityMeter(record: BusinessRecord) {
  return {
    id: record.id,
    meter: record.title,
    account: String(record.data?.account || ""),
    readingDate: String(record.date || "").slice(0, 10),
    units: Number(record.data?.units || 0),
    status: record.status || "captured",
  };
}

export function mapUtilityBilling(record: BusinessRecord) {
  return {
    id: record.id,
    invoice: record.title,
    account: String(record.data?.account || ""),
    billingMonth: String(record.data?.billingMonth || ""),
    dueDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "open",
  };
}
