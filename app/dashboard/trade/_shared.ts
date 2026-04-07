"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const tradeFont = "'Outfit','Inter',sans-serif";
export const tradeBg = "rgba(255,255,255,.03)";
export const tradeBorder = "rgba(255,255,255,.07)";
export const tradeMuted = "rgba(255,255,255,.45)";

export async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export type TradeShipment = ReturnType<typeof mapShipmentRecords>[number];
export type TradeLc = ReturnType<typeof mapTradeLcRecords>[number];
export type TradeCustoms = ReturnType<typeof mapCustomsRecords>[number];
export type TradeCosting = ReturnType<typeof mapImportCostingRecords>[number];
export type TradeRebate = ReturnType<typeof mapRebateRecords>[number];

export type TradeControlCenter = {
  summary: {
    shipmentCount: number;
    activeLcCount: number;
    openCustomsCount: number;
    rebateCount: number;
    shipmentValue: number;
    lcValue: number;
    landedCost: number;
    rebateValue: number;
    openCustomsPayable: number;
    shipmentFreight: number;
  };
  shipments: TradeShipment[];
  lcs: TradeLc[];
  customs: TradeCustoms[];
  costings: TradeCosting[];
  rebates: TradeRebate[];
};

export function mapShipmentRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    ref: String(record.data?.ref || record.title || ""),
    type: String(record.data?.type || "Import"),
    counterparty: String(record.data?.counterparty || ""),
    originPort: String(record.data?.originPort || ""),
    destinationPort: String(record.data?.destinationPort || ""),
    incoterm: String(record.data?.incoterm || "FOB"),
    mode: String(record.data?.mode || "Sea"),
    blAwbNo: String(record.data?.blAwbNo || ""),
    eta: String(record.data?.eta || ""),
    etd: String(record.data?.etd || ""),
    hsCode: String(record.data?.hsCode || ""),
    amount: Number(record.amount || 0),
    freightCost: Number(record.data?.freightCost || 0),
    insurance: Number(record.data?.insurance || 0),
    status: String(record.status || "BOOKING"),
  }));
}

export function mapTradeLcRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    refNo: String(record.data?.refNo || record.title || ""),
    type: String(record.data?.type || "LC"),
    direction: String(record.data?.direction || "Import"),
    amount: Number(record.amount || 0),
    currency: String(record.data?.currency || "USD"),
    issueDate: String(record.date || record.data?.issueDate || "").slice(0, 10),
    expiryDate: String(record.data?.expiryDate || ""),
    status: String(record.status || "DRAFT"),
  }));
}

export function mapCustomsRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    declarationNo: String(record.data?.declarationNo || record.title || ""),
    type: String(record.data?.type || "Import"),
    shipperName: String(record.data?.shipperName || ""),
    consigneeName: String(record.data?.consigneeName || ""),
    totalPayable: Number(record.amount || record.data?.totalPayable || 0),
    filingDate: String(record.date || record.data?.filingDate || "").slice(0, 10),
    status: String(record.status || "FILED"),
  }));
}

export function mapImportCostingRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    shipmentRef: record.title,
    supplier: String(record.data?.supplier || ""),
    currency: String(record.data?.currency || "USD"),
    goodsValue: Number(record.data?.goodsValue || 0),
    freight: Number(record.data?.freight || 0),
    customs: Number(record.data?.customs || 0),
    insurance: Number(record.data?.insurance || 0),
    clearing: Number(record.data?.clearing || 0),
    otherCharges: Number(record.data?.otherCharges || 0),
    landedCost: Number(record.amount || 0),
    units: Number(record.data?.units || 0),
    landedPerUnit: Number(record.data?.landedPerUnit || 0),
    status: String(record.status || "draft"),
    date: String(record.date || "").slice(0, 10),
  }));
}

export function mapRebateRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    claimNo: record.title,
    invoiceRef: String(record.data?.invoiceRef || ""),
    shipmentRef: String(record.data?.shipmentRef || ""),
    scheme: String(record.data?.scheme || "DLTL"),
    amount: Number(record.amount || 0),
    status: String(record.status || "filed"),
    date: String(record.date || "").slice(0, 10),
    notes: String(record.data?.notes || ""),
  }));
}
