import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const ecommerceFont = "'Outfit','Inter',sans-serif";
export const ecommerceBg = "rgba(255,255,255,.03)";
export const ecommerceBorder = "rgba(255,255,255,.07)";
export const ecommerceMuted = "rgba(255,255,255,.5)";

export const platformOptions = ["Website", "Daraz", "Amazon", "Instagram", "Facebook", "TikTok Shop", "WhatsApp"];
export const returnReasons = ["Damaged", "Wrong Item", "Quality Issue", "Changed Mind", "Size Issue"];
export const courierOptions = ["TCS", "Leopards", "Rider", "Pakistan Post", "BlueEx", "Trax"];

export type EcommerceProductStatus = "active" | "inactive";
export type EcommerceOrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
export type EcommerceReturnStatus = "pending" | "approved" | "rejected" | "refunded";
export type EcommerceShipmentStatus = "processing" | "dispatched" | "in_transit" | "delivered" | "failed";

export type EcommerceProduct = {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  stock: number;
  platform: string;
  sales: number;
  status: EcommerceProductStatus;
};

export type EcommerceOrder = {
  id: string;
  orderId: string;
  customer: string;
  phone: string;
  product: string;
  productId: string;
  quantity: number;
  amount: number;
  address: string;
  platform: string;
  status: EcommerceOrderStatus;
  createdAt: string;
};

export type EcommerceReturn = {
  id: string;
  returnNo: string;
  orderId: string;
  customer: string;
  product: string;
  qty: number;
  amount: number;
  reason: string;
  status: EcommerceReturnStatus;
  method: string;
  createdAt: string;
};

export type EcommerceShipment = {
  id: string;
  trackingNo: string;
  orderId: string;
  customer: string;
  city: string;
  courier: string;
  weight: number;
  charges: number;
  expected: string;
  status: EcommerceShipmentStatus;
  createdAt: string;
};

export function toPkDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function mapEcommerceProducts(records: BusinessRecord[]): EcommerceProduct[] {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    category: String(record.data?.category || ""),
    sku: String(record.data?.sku || ""),
    price: Number(record.amount || 0),
    stock: Number(record.data?.stock || 0),
    platform: String(record.data?.platform || "Website"),
    sales: Number(record.data?.sales || 0),
    status: (record.status as EcommerceProductStatus) || "active",
  }));
}

export function mapEcommerceOrders(records: BusinessRecord[]): EcommerceOrder[] {
  return records.map((record) => ({
    id: record.id,
    orderId: String(record.data?.orderId || `ORD-${record.id.slice(-6).toUpperCase()}`),
    customer: record.title,
    phone: String(record.data?.phone || ""),
    product: String(record.data?.product || ""),
    productId: String(record.data?.productId || ""),
    quantity: Number(record.data?.quantity || 1),
    amount: Number(record.amount || 0),
    address: String(record.data?.address || ""),
    platform: String(record.data?.platform || "Website"),
    status: (record.status as EcommerceOrderStatus) || "pending",
    createdAt: record.createdAt,
  }));
}

export function mapEcommerceReturns(records: BusinessRecord[]): EcommerceReturn[] {
  return records.map((record) => ({
    id: record.id,
    returnNo: String(record.data?.returnNo || `RET-${record.id.slice(-6).toUpperCase()}`),
    orderId: String(record.data?.orderId || ""),
    customer: record.title,
    product: String(record.data?.product || ""),
    qty: Number(record.data?.qty || 1),
    amount: Number(record.amount || 0),
    reason: String(record.data?.reason || ""),
    status: (record.status as EcommerceReturnStatus) || "pending",
    method: String(record.data?.method || ""),
    createdAt: record.createdAt,
  }));
}

export function mapEcommerceShipments(records: BusinessRecord[]): EcommerceShipment[] {
  return records.map((record) => ({
    id: record.id,
    trackingNo: String(record.data?.trackingNo || `SHP-${record.id.slice(-6).toUpperCase()}`),
    orderId: String(record.data?.orderId || ""),
    customer: record.title,
    city: String(record.data?.city || ""),
    courier: String(record.data?.courier || "TCS"),
    weight: Number(record.data?.weight || 0),
    charges: Number(record.amount || 0),
    expected: String(record.data?.expected || todayIso()),
    status: (record.status as EcommerceShipmentStatus) || "processing",
    createdAt: record.createdAt,
  }));
}

export function ecommerceStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: "#34d399",
    inactive: "#6b7280",
    pending: "#f59e0b",
    processing: "#60a5fa",
    shipped: "#818cf8",
    delivered: "#34d399",
    cancelled: "#6b7280",
    returned: "#ef4444",
    approved: "#38bdf8",
    rejected: "#f87171",
    refunded: "#14b8a6",
    dispatched: "#38bdf8",
    in_transit: "#fbbf24",
    failed: "#f87171",
  };
  return colors[status] || "#a5b4fc";
}
