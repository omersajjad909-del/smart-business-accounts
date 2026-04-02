"use client";

import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const agricultureFont = "'Outfit','Inter',sans-serif";
export const agricultureBg = "rgba(255,255,255,.03)";
export const agricultureBorder = "rgba(255,255,255,.07)";
export const agricultureMuted = "rgba(255,255,255,.58)";

export type CropStatus = "planted" | "growing" | "harvested" | "failed";
export type FieldStatus = "active" | "fallow";
export type LivestockStatus = "healthy" | "watch";

export type CropRow = {
  id: string;
  name: string;
  field: string;
  area: string;
  plantDate: string;
  harvestDate: string;
  expectedYield: number;
  status: CropStatus;
};

export type FieldRow = {
  id: string;
  name: string;
  area: number;
  soilType: string;
  irrigationType: string;
  location: string;
  status: FieldStatus;
};

export type LivestockRow = {
  id: string;
  type: string;
  breed: string;
  count: number;
  dob: string;
  weight: number;
  notes: string;
  status: LivestockStatus;
};

export type HarvestRow = {
  id: string;
  crop: string;
  field: string;
  quantity: number;
  unit: string;
  salePrice: number;
  date: string;
  buyer: string;
  revenue: number;
};

export function mapCrops(records: BusinessRecord[]): CropRow[] {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    field: String(record.data?.field || ""),
    area: String(record.data?.area || ""),
    plantDate: String(record.date || "").slice(0, 10),
    harvestDate: String(record.data?.harvestDate || ""),
    expectedYield: Number(record.data?.expectedYield || 0),
    status: (record.status as CropStatus) || "planted",
  }));
}

export function mapFields(records: BusinessRecord[]): FieldRow[] {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    area: Number(record.data?.area || 0),
    soilType: String(record.data?.soilType || ""),
    irrigationType: String(record.data?.irrigationType || ""),
    location: String(record.data?.location || ""),
    status: (record.status as FieldStatus) || "active",
  }));
}

export function mapLivestock(records: BusinessRecord[]): LivestockRow[] {
  return records.map((record) => ({
    id: record.id,
    type: record.title,
    breed: String(record.data?.breed || ""),
    count: Number(record.data?.count || 1),
    dob: String(record.date || "").slice(0, 10),
    weight: Number(record.data?.weight || 0),
    notes: String(record.data?.notes || ""),
    status: (record.status as LivestockStatus) || "healthy",
  }));
}

export function mapHarvest(records: BusinessRecord[]): HarvestRow[] {
  return records.map((record) => {
    const quantity = Number(record.data?.quantity || 0);
    const salePrice = Number(record.amount || 0);
    return {
      id: record.id,
      crop: record.title,
      field: String(record.data?.field || ""),
      quantity,
      unit: String(record.data?.unit || "kg"),
      salePrice,
      date: String(record.date || "").slice(0, 10),
      buyer: String(record.data?.buyer || ""),
      revenue: quantity * salePrice,
    };
  });
}
