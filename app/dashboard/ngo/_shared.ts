"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const ngoFont = "'Outfit','Inter',sans-serif";
export const ngoBg = "rgba(255,255,255,.03)";
export const ngoBorder = "rgba(255,255,255,.07)";
export const ngoMuted = "rgba(255,255,255,.58)";

export type DonorRow = {
  id: string;
  donorId: string;
  name: string;
  phone: string;
  email: string;
  type: string;
  totalDonated: number;
  lastDonation: number;
  frequency: string;
  status: string;
  category: string;
};

export type GrantRow = {
  id: string;
  grantNo: string;
  title: string;
  donor: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string;
  purpose: string;
  spent: number;
  status: string;
  reportDue?: string;
};

export type BeneficiaryRow = {
  id: string;
  benefId: string;
  name: string;
  cnic: string;
  phone: string;
  address: string;
  category: string;
  assistance: string[];
  monthlyAid: number;
  status: string;
  enrollDate: string;
};

export type FundRow = {
  id: string;
  name: string;
  purpose: string;
  balance: number;
  totalReceived: number;
  totalSpent: number;
  donors: number;
  status: string;
};

export type FundTransactionRow = {
  id: string;
  fund: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  reference: string;
};

export type NgoControlCenter = {
  summary: {
    donors: number;
    beneficiaries: number;
    totalRaised: number;
    donorRaised: number;
    grantBook: number;
    fundBalance: number;
    pendingReports: number;
    activeGrants: number;
    monthlyAid: number;
    transactions: number;
  };
  donors: DonorRow[];
  grants: GrantRow[];
  beneficiaries: BeneficiaryRow[];
  funds: FundRow[];
  transactions: FundTransactionRow[];
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

export function mapDonors(records: BusinessRecord[]): DonorRow[] {
  return records.map((record) => ({
    id: record.id,
    donorId: String(record.data?.donorId || record.id),
    name: record.title,
    phone: String(record.data?.phone || ""),
    email: String(record.data?.email || ""),
    type: String(record.data?.type || "individual"),
    totalDonated: Number(record.amount || record.data?.totalDonated || 0),
    lastDonation: Number(record.data?.lastDonation || 0),
    frequency: String(record.data?.frequency || "monthly"),
    status: String(record.status || "active"),
    category: String(record.data?.category || ""),
  }));
}

export function mapGrants(records: BusinessRecord[]): GrantRow[] {
  return records.map((record) => ({
    id: record.id,
    grantNo: String(record.data?.grantNo || record.id),
    title: record.title,
    donor: String(record.data?.donor || ""),
    amount: Number(record.amount || record.data?.amount || 0),
    currency: String(record.data?.currency || "PKR"),
    startDate: String(record.date || record.data?.startDate || ""),
    endDate: String(record.data?.endDate || ""),
    purpose: String(record.data?.purpose || ""),
    spent: Number(record.data?.spent || 0),
    status: String(record.status || "active"),
    reportDue: record.data?.reportDue ? String(record.data.reportDue) : undefined,
  }));
}

export function mapBeneficiaries(records: BusinessRecord[]): BeneficiaryRow[] {
  return records.map((record) => ({
    id: record.id,
    benefId: String(record.data?.benefId || record.id),
    name: record.title,
    cnic: String(record.data?.cnic || ""),
    phone: String(record.data?.phone || ""),
    address: String(record.data?.address || ""),
    category: String(record.data?.category || "family"),
    assistance: Array.isArray(record.data?.assistance) ? (record.data?.assistance as string[]) : [],
    monthlyAid: Number(record.amount || record.data?.monthlyAid || 0),
    status: String(record.status || "active"),
    enrollDate: String(record.date || record.data?.enrollDate || ""),
  }));
}

export function mapFunds(records: BusinessRecord[]): FundRow[] {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    purpose: String(record.data?.purpose || ""),
    balance: Number(record.amount || record.data?.balance || 0),
    totalReceived: Number(record.data?.totalReceived || 0),
    totalSpent: Number(record.data?.totalSpent || 0),
    donors: Number(record.data?.donors || 0),
    status: String(record.status || "active"),
  }));
}

export function mapFundTransactions(records: BusinessRecord[]): FundTransactionRow[] {
  return records.map((record) => ({
    id: record.id,
    fund: String(record.data?.fund || ""),
    type: String(record.status || "receipt"),
    amount: Number(record.amount || 0),
    description: record.title,
    date: String(record.date || ""),
    reference: String(record.data?.reference || ""),
  }));
}
