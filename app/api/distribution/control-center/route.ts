import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  const role = normalizeRole(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const [routeRecords, deliveryRecords, vanSalesRecords, stockRecords, collectionRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "distribution_route" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "delivery" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "van_sale" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "van_stock" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "distribution_collection" }, orderBy: { createdAt: "desc" } }),
  ]);

  const routes = routeRecords.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, name: record.title, area: String(data.area || ""), driver: String(data.driver || ""), vehicle: String(data.vehicle || ""), stops: Number(data.stops || 0), status: String(record.status || "active") };
  });

  const routeMetrics = routes.map((route) => {
    const deliveries = deliveryRecords.filter((record) => String(((record.data || {}) as Record<string, unknown>).routeId || "") === route.id);
    const vanSales = vanSalesRecords.filter((record) => String(((record.data || {}) as Record<string, unknown>).routeId || "") === route.id);
    const stockLoads = stockRecords.filter((record) => String(((record.data || {}) as Record<string, unknown>).routeId || "") === route.id);
    const collections = collectionRecords.filter((record) => String(((record.data || {}) as Record<string, unknown>).routeId || "") === route.id);

    const revenue = vanSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
    const collected = collections.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const loadedQty = stockLoads.reduce((sum, load) => sum + Number((((load.data || {}) as Record<string, unknown>).loadQty) || 0), 0);
    const soldQty = stockLoads.reduce((sum, load) => sum + Number((((load.data || {}) as Record<string, unknown>).soldQty) || 0), 0);
    const failed = deliveries.filter((record) => record.status === "failed").length;

    return {
      id: route.id,
      route: route.name,
      area: route.area,
      driver: route.driver,
      deliveries: deliveries.length,
      delivered: deliveries.filter((record) => record.status === "delivered").length,
      revenue,
      collected,
      loadedQty,
      soldQty,
      failed,
      recoveryRate: revenue > 0 ? Math.round((collected / revenue) * 100) : 0,
    };
  });

  const vanRevenue = vanSalesRecords.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
  const collections = collectionRecords.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const loadedQty = stockRecords.reduce((sum, load) => sum + Number((((load.data || {}) as Record<string, unknown>).loadQty) || 0), 0);
  const soldQty = stockRecords.reduce((sum, load) => sum + Number((((load.data || {}) as Record<string, unknown>).soldQty) || 0), 0);

  return NextResponse.json({
    summary: {
      routes: routes.length,
      activeRoutes: routes.filter((row) => row.status === "active").length,
      deliveries: deliveryRecords.length,
      delivered: deliveryRecords.filter((row) => row.status === "delivered").length,
      failed: deliveryRecords.filter((row) => row.status === "failed").length,
      vanRevenue,
      collections,
      loadedQty,
      soldQty,
      recoveryRate: vanRevenue > 0 ? Math.round((collections / vanRevenue) * 100) : 0,
    },
    routes,
    routeMetrics,
  });
}
