"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const firmFont = "'Outfit','Inter',sans-serif";
export const firmBg = "rgba(255,255,255,.03)";
export const firmBorder = "rgba(255,255,255,.07)";
export const firmMuted = "rgba(255,255,255,.58)";

export type FirmClient = {
  id: string;
  status: string;
  name: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  retainerAmt: number;
};

export type FirmProject = {
  id: string;
  status: string;
  name: string;
  client: string;
  type: string;
  startDate: string;
  endDate: string;
  fee: number;
  assignedTo: string;
};

export type FirmInvoice = {
  id: string;
  status: string;
  client: string;
  project: string;
  invoiceNo: string;
  amount: number;
  dueDate: string;
};

export type FirmTimesheet = {
  id: string;
  status: string;
  staffName: string;
  project: string;
  client: string;
  date: string;
  hours: number;
  rate: number;
  billable: string;
  notes: string;
  revenue: number;
};

export function mapFirmClients(records: BusinessRecord[]): FirmClient[] {
  return records.map((record) => ({
    id: record.id,
    status: String(record.status || "Active"),
    name: String(record.data?.name ?? record.title ?? ""),
    industry: String(record.data?.industry ?? ""),
    contactPerson: String(record.data?.contactPerson ?? ""),
    email: String(record.data?.email ?? ""),
    phone: String(record.data?.phone ?? ""),
    retainerAmt: Number(record.amount ?? 0),
  }));
}

export function mapFirmProjects(records: BusinessRecord[]): FirmProject[] {
  return records.map((record) => ({
    id: record.id,
    status: String(record.status || "Active"),
    name: String(record.data?.name ?? record.title ?? ""),
    client: String(record.data?.client ?? ""),
    type: String(record.data?.type ?? "Other"),
    startDate: String(record.data?.startDate ?? record.date ?? ""),
    endDate: String(record.data?.endDate ?? ""),
    fee: Number(record.amount ?? 0),
    assignedTo: String(record.data?.assignedTo ?? ""),
  }));
}

export function mapFirmBilling(records: BusinessRecord[]): FirmInvoice[] {
  return records.map((record) => ({
    id: record.id,
    status: String(record.status || "Draft"),
    client: String(record.data?.client ?? ""),
    project: String(record.data?.project ?? ""),
    invoiceNo: String(record.data?.invoiceNo ?? record.refId ?? ""),
    amount: Number(record.amount ?? 0),
    dueDate: String(record.data?.dueDate ?? ""),
  }));
}

export function mapFirmTimesheets(records: BusinessRecord[]): FirmTimesheet[] {
  return records.map((record) => ({
    id: record.id,
    status: String(record.status || "Billable"),
    staffName: String(record.data?.staffName ?? ""),
    project: String(record.data?.project ?? ""),
    client: String(record.data?.client ?? ""),
    date: String(record.data?.date ?? record.date ?? ""),
    hours: Number(record.data?.hours ?? 0),
    rate: Number(record.data?.rate ?? 0),
    billable: String(record.data?.billable ?? "Yes"),
    notes: String(record.data?.notes ?? ""),
    revenue: Number(record.amount ?? 0),
  }));
}
