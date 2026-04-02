import type { BusinessRecord } from "@/lib/useBusinessRecords";

export const distributionFont = "'Outfit','Inter',sans-serif";
export const distributionBg = "rgba(255,255,255,0.03)";
export const distributionBorder = "rgba(255,255,255,0.07)";

export const todayIso = () => new Date().toISOString().slice(0, 10);

export type RouteStatus = "active" | "inactive";
export type DeliveryStatus = "pending" | "dispatched" | "delivered" | "failed";
export type VanSaleStatus = "draft" | "submitted" | "settled";

export type DistributionRoute = {
  id: string;
  name: string;
  area: string;
  driver: string;
  vehicle: string;
  stops: number;
  status: RouteStatus;
};

export function mapDistributionRoutes(records: BusinessRecord[]): DistributionRoute[] {
  return records.map((record) => ({
    id: record.id,
    name: record.title,
    area: String(record.data?.area || ""),
    driver: String(record.data?.driver || ""),
    vehicle: String(record.data?.vehicle || ""),
    stops: Number(record.data?.stops || 0),
    status: (record.status as RouteStatus) || "active",
  }));
}

export function findRouteById(routes: DistributionRoute[], routeId: string) {
  return routes.find((route) => route.id === routeId) || null;
}
