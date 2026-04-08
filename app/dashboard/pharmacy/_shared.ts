import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const pharmacyFont = "'Outfit','Inter',sans-serif";
export const pharmacyBg = "rgba(255,255,255,0.03)";
export const pharmacyBorder = "rgba(255,255,255,0.07)";
export const pharmacyMuted = "rgba(255,255,255,0.45)";

export type PharmacyDrug = ReturnType<typeof mapDrugRecords>[number];
export type PharmacyPrescription = ReturnType<typeof mapPrescriptionRecords>[number];
export type PharmacyBatch = ReturnType<typeof mapBatchRecords>[number];
export type PharmacyPurchase = ReturnType<typeof mapPurchaseRecords>[number];
export type PharmacyCounterSale = ReturnType<typeof mapCounterSaleRecords>[number];

export type PharmacyControlCenter = {
  summary: {
    medicines: number;
    lowStock: number;
    expired: number;
    inventoryValue: number;
    pendingPrescriptions: number;
    dispensedPrescriptions: number;
    counterSales: number;
    counterRevenue: number;
    purchaseSpend: number;
    activeBatches: number;
  };
  drugs: PharmacyDrug[];
  prescriptions: PharmacyPrescription[];
  batches: PharmacyBatch[];
  purchases: PharmacyPurchase[];
  sales: PharmacyCounterSale[];
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

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function mapDrugRecords(records: BusinessRecord[]) {
  return records.map((record) => {
    const stock = Number(record.data?.stock || 0);
    const minStock = Number(record.data?.minStock || 0);
    const expiryDate = String(record.data?.expiryDate || "");
    const isExpired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false;
    return {
      id: record.id,
      name: record.title,
      category: String(record.data?.category || "Tablet"),
      manufacturer: String(record.data?.manufacturer || ""),
      batchNo: String(record.data?.batchNo || ""),
      stock,
      minStock,
      unitPrice: Number(record.amount || 0),
      expiryDate,
      status: String(record.status || "in_stock"),
      isLow: stock <= minStock,
      isExpired,
    };
  });
}

export function mapPrescriptionRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    patient: record.title,
    doctor: String(record.data?.doctor || ""),
    drugs: String(record.data?.drugs || ""),
    date: String(record.date || "").slice(0, 10),
    notes: String(record.data?.notes || ""),
    status: String(record.status || "pending"),
  }));
}

export function mapBatchRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    medicine: record.title,
    batchNo: String(record.data?.batchNo || ""),
    supplier: String(record.data?.supplier || ""),
    quantity: Number(record.data?.quantity || 0),
    costPerUnit: Number(record.amount || 0),
    expiryDate: String(record.data?.expiryDate || ""),
    status: String(record.status || "active"),
    receivedDate: String(record.date || "").slice(0, 10),
  }));
}

export function mapPurchaseRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    medicine: record.title,
    supplier: String(record.data?.supplier || ""),
    batchNo: String(record.data?.batchNo || ""),
    quantity: Number(record.data?.quantity || 0),
    unitCost: Number(record.amount || 0),
    totalCost: Number(record.data?.totalCost || 0),
    receivedDate: String(record.date || "").slice(0, 10),
    status: String(record.status || "received"),
  }));
}

export function mapCounterSaleRecords(records: BusinessRecord[]) {
  return records.map((record) => ({
    id: record.id,
    medicine: record.title,
    customer: String(record.data?.customer || "Walk-in"),
    quantity: Number(record.data?.quantity || 0),
    amount: Number(record.amount || 0),
    paymentMethod: String(record.data?.paymentMethod || "cash"),
    saleDate: String(record.date || "").slice(0, 10),
    status: String(record.status || "completed"),
  }));
}
