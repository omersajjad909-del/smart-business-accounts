"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const travelAccent = "#38bdf8";

export type TravelControlCenter = {
  summary: {
    tickets: number;
    issuedTickets: number;
    pendingTickets: number;
    visaCases: number;
    activeVisaCases: number;
    monthlySales: number;
  };
  tickets: ReturnType<typeof mapTravelTicket>[];
  visas: ReturnType<typeof mapVisaCase>[];
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

export function mapTravelTicket(record: BusinessRecord) {
  return {
    id: record.id,
    booking: record.title,
    passenger: String(record.data?.passenger || ""),
    airline: String(record.data?.airline || ""),
    route: String(record.data?.route || ""),
    pnr: String(record.data?.pnr || ""),
    travelDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "quoted",
  };
}

export function mapVisaCase(record: BusinessRecord) {
  return {
    id: record.id,
    caseRef: record.title,
    applicant: String(record.data?.applicant || ""),
    country: String(record.data?.country || ""),
    passportNo: String(record.data?.passportNo || ""),
    submissionDate: String(record.date || "").slice(0, 10),
    amount: Number(record.amount || 0),
    status: record.status || "document_check",
  };
}
