"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const printingAccent = "#60a5fa";

export function mapPrintOrder(record: BusinessRecord) {
  return {
    id: record.id,
    order: record.title,
    client: String(record.data?.client || ""),
    specs: String(record.data?.specs || ""),
    quantity: Number(record.data?.quantity || 0),
    dueDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "queued",
  };
}

export function mapPrintStock(record: BusinessRecord) {
  return {
    id: record.id,
    item: record.title,
    category: String(record.data?.category || ""),
    quantity: Number(record.data?.quantity || 0),
    reorderLevel: Number(record.data?.reorderLevel || 0),
    supplier: String(record.data?.supplier || ""),
    status: record.status || "available",
  };
}

export function mapPrintDelivery(record: BusinessRecord) {
  return {
    id: record.id,
    dispatch: record.title,
    client: String(record.data?.client || ""),
    courier: String(record.data?.courier || ""),
    destination: String(record.data?.destination || ""),
    deliveredAt: String(record.date || "").slice(0, 10),
    status: record.status || "ready",
  };
}
