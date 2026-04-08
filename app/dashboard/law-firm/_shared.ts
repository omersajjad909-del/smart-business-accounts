"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const lawFont = "'Outfit','Inter',sans-serif";
export const lawBg = "rgba(255,255,255,.03)";
export const lawBorder = "rgba(255,255,255,.07)";
export const lawMuted = "rgba(255,255,255,.58)";

export type LawCase = {
  id: string;
  caseNo: string;
  title: string;
  client: string;
  type: string;
  court: string;
  fileDate: string;
  nextHearing: string;
  status: string;
  lawyer: string;
};

export type LawClient = {
  id: string;
  clientId: string;
  name: string;
  type: string;
  phone: string;
  email: string;
  city: string;
  totalCases: number;
  activeCases: number;
  totalBilled: number;
  outstanding: number;
  joined: string;
  status: string;
};

export type LegalInvoice = {
  id: string;
  invoiceId: string;
  caseId: string;
  client: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  disbursements: number;
  total: number;
  status: string;
  dueDate: string;
};

export type TimeEntry = {
  id: string;
  entryId: string;
  date: string;
  lawyer: string;
  caseId: string;
  caseTitle: string;
  task: string;
  hours: number;
  rate: number;
  amount: number;
  billable: boolean;
  billed: boolean;
};

export type LawControlCenter = {
  summary: {
    cases: number;
    activeCases: number;
    hearingsThisWeek: number;
    clients: number;
    outstanding: number;
    paidRevenue: number;
    totalBilled: number;
    billableHours: number;
    unbilledTime: number;
  };
  cases: LawCase[];
  clients: LawClient[];
  invoices: LegalInvoice[];
  entries: TimeEntry[];
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

export function mapLawCases(records: BusinessRecord[]): LawCase[] {
  return records.map((record) => ({
    id: record.id,
    caseNo: String(record.data?.caseNo || record.id),
    title: record.title,
    client: String(record.data?.client || ""),
    type: String(record.data?.type || "Civil"),
    court: String(record.data?.court || ""),
    fileDate: String(record.date || record.data?.fileDate || ""),
    nextHearing: String(record.data?.nextHearing || ""),
    status: String(record.status || "Active"),
    lawyer: String(record.data?.lawyer || ""),
  }));
}

export function mapLawClients(records: BusinessRecord[]): LawClient[] {
  return records.map((record) => ({
    id: record.id,
    clientId: String(record.data?.clientId || record.id),
    name: record.title,
    type: String(record.data?.type || "Individual"),
    phone: String(record.data?.phone || ""),
    email: String(record.data?.email || ""),
    city: String(record.data?.city || ""),
    totalCases: Number(record.data?.totalCases || 0),
    activeCases: Number(record.data?.activeCases || 0),
    totalBilled: Number(record.amount || record.data?.totalBilled || 0),
    outstanding: Number(record.data?.outstanding || 0),
    joined: String(record.date || record.data?.joined || ""),
    status: String(record.status || "Active"),
  }));
}

export function mapLawBilling(records: BusinessRecord[]): LegalInvoice[] {
  return records.map((record) => ({
    id: record.id,
    invoiceId: String(record.data?.invoiceId || record.id),
    caseId: String(record.data?.caseId || ""),
    client: record.title,
    description: String(record.data?.description || ""),
    hours: Number(record.data?.hours || 0),
    rate: Number(record.data?.rate || 0),
    amount: Number(record.data?.amount || 0),
    disbursements: Number(record.data?.disbursements || 0),
    total: Number(record.amount || record.data?.total || 0),
    status: String(record.status || "Draft"),
    dueDate: String(record.date || record.data?.dueDate || ""),
  }));
}

export function mapTimeEntries(records: BusinessRecord[]): TimeEntry[] {
  return records.map((record) => ({
    id: record.id,
    entryId: String(record.data?.entryId || record.id),
    date: String(record.date || record.data?.date || ""),
    lawyer: record.title,
    caseId: String(record.data?.caseId || ""),
    caseTitle: String(record.data?.caseTitle || ""),
    task: String(record.data?.task || ""),
    hours: Number(record.data?.hours || 0),
    rate: Number(record.data?.rate || 0),
    amount: Number(record.amount || record.data?.amount || 0),
    billable: Boolean(record.data?.billable),
    billed: String(record.status || "pending") === "billed",
  }));
}
