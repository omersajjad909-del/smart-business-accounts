import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const restaurantFont = "'Outfit','Inter',sans-serif";
export const restaurantBg = "rgba(255,255,255,0.03)";
export const restaurantBorder = "rgba(255,255,255,0.07)";
export const restaurantMuted = "rgba(255,255,255,.45)";

export type RestaurantTableStatus = "available" | "occupied" | "reserved" | "cleaning";
export type KitchenOrderStatus = "pending" | "preparing" | "ready" | "served";
export type RestaurantOrderStatus = "draft" | "confirmed" | "in_kitchen" | "served" | "closed";
export type ReservationStatus = "booked" | "confirmed" | "arrived" | "cancelled";

export type RestaurantMenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  available: boolean;
};

export type RestaurantTable = {
  id: string;
  number: number;
  capacity: number;
  status: RestaurantTableStatus;
};

export type KitchenOrder = {
  id: string;
  orderId: string;
  table: string;
  priority: string;
  status: KitchenOrderStatus;
  items: string[];
};

export type RecipeCosting = {
  id: string;
  name: string;
  category: string;
  servings: number;
  totalCost: number;
  sellingPrice: number;
  margin: number;
};

export type RestaurantOrder = {
  id: string;
  orderNo: string;
  tableRef: string;
  serviceMode: string;
  itemsSummary: string;
  total: number;
  status: RestaurantOrderStatus;
  guests: number;
  date: string;
};

export type RestaurantReservation = {
  id: string;
  guestName: string;
  phone: string;
  tableRef: string;
  guests: number;
  reservationDate: string;
  status: ReservationStatus;
};

export type RestaurantControlCenter = {
  summary: {
    menuItems: number;
    activeTables: number;
    occupiedTables: number;
    kitchenOrders: number;
    readyOrders: number;
    openOrders: number;
    salesValue: number;
    avgRecipeMargin: number;
    reservations: number;
    cancellationRate: number;
  };
  menu: RestaurantMenuItem[];
  tables: RestaurantTable[];
  kitchenOrders: KitchenOrder[];
  recipes: RecipeCosting[];
  orders: RestaurantOrder[];
  reservations: RestaurantReservation[];
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

export function mapRestaurantMenuRecords(records: BusinessRecord[]): RestaurantMenuItem[] {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    category: String(record.data?.category || "Mains"),
    price: record.amount || 0,
    cost: Number(record.data?.cost || 0),
    available: record.status !== "inactive",
  }));
}

export function mapRestaurantTableRecords(records: BusinessRecord[]): RestaurantTable[] {
  return records.map((record) => ({
    id: record.id,
    number: Number(record.data?.number || 0),
    capacity: Number(record.data?.capacity || 4),
    status: (record.status as RestaurantTableStatus) || "available",
  }));
}

export function mapKitchenOrderRecords(records: BusinessRecord[]): KitchenOrder[] {
  return records.map((record) => ({
    id: record.id,
    orderId: String(record.data?.orderId || record.title),
    table: String(record.data?.table || ""),
    priority: String(record.data?.priority || "medium"),
    status: (record.status as KitchenOrderStatus) || "pending",
    items: String(record.data?.items || "").split(",").map((item) => item.trim()).filter(Boolean),
  }));
}

export function mapRecipeRecords(records: BusinessRecord[]): RecipeCosting[] {
  return records.map((record) => {
    const totalCost = Number(record.data?.totalCost || 0);
    const sellingPrice = record.amount || 0;
    return {
      id: record.id,
      name: record.title,
      category: String(record.data?.category || "Mains"),
      servings: Number(record.data?.servings || 1),
      totalCost,
      sellingPrice,
      margin: sellingPrice > 0 ? Math.round(((sellingPrice - totalCost) / sellingPrice) * 100) : 0,
    };
  });
}

export function mapRestaurantOrderRecords(records: BusinessRecord[]): RestaurantOrder[] {
  return records.map((record) => ({
    id: record.id,
    orderNo: String(record.data?.orderNo || record.title),
    tableRef: String(record.data?.tableRef || ""),
    serviceMode: String(record.data?.serviceMode || "dine_in"),
    itemsSummary: String(record.data?.itemsSummary || ""),
    total: record.amount || 0,
    status: (record.status as RestaurantOrderStatus) || "draft",
    guests: Number(record.data?.guests || 1),
    date: record.date?.split("T")[0] || "",
  }));
}

export function mapRestaurantReservationRecords(records: BusinessRecord[]): RestaurantReservation[] {
  return records.map((record) => ({
    id: record.id,
    guestName: record.title,
    phone: String(record.data?.phone || ""),
    tableRef: String(record.data?.tableRef || ""),
    guests: Number(record.data?.guests || 1),
    reservationDate: record.date?.split("T")[0] || "",
    status: (record.status as ReservationStatus) || "booked",
  }));
}
