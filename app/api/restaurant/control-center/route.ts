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

  const [menu, tables, kitchenOrders, recipes, orders, reservations] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "menu_item" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "restaurant_table" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "kitchen_order" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "recipe" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "restaurant_order" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "restaurant_reservation" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mappedMenu = menu.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, name: record.title, category: String(data.category || "Mains"), price: Number(record.amount || 0), cost: Number(data.cost || 0), available: record.status !== "inactive" };
  });
  const mappedTables = tables.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, number: Number(data.number || 0), capacity: Number(data.capacity || 4), status: String(record.status || "available") };
  });
  const mappedKitchenOrders = kitchenOrders.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, orderId: String(data.orderId || record.title), table: String(data.table || ""), priority: String(data.priority || "medium"), status: String(record.status || "pending"), items: String(data.items || "").split(",").map((item) => item.trim()).filter(Boolean) };
  });
  const mappedRecipes = recipes.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    const totalCost = Number(data.totalCost || 0);
    const sellingPrice = Number(record.amount || 0);
    return { id: record.id, name: record.title, category: String(data.category || "Mains"), servings: Number(data.servings || 1), totalCost, sellingPrice, margin: sellingPrice > 0 ? Math.round(((sellingPrice - totalCost) / sellingPrice) * 100) : 0 };
  });
  const mappedOrders = orders.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, orderNo: String(data.orderNo || record.title), tableRef: String(data.tableRef || ""), serviceMode: String(data.serviceMode || "dine_in"), itemsSummary: String(data.itemsSummary || ""), total: Number(record.amount || 0), status: String(record.status || "draft"), guests: Number(data.guests || 1), date: String(record.date || "").slice(0, 10) };
  });
  const mappedReservations = reservations.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return { id: record.id, guestName: record.title, phone: String(data.phone || ""), tableRef: String(data.tableRef || ""), guests: Number(data.guests || 1), reservationDate: String(record.date || "").slice(0, 10), status: String(record.status || "booked") };
  });

  const salesValue = mappedOrders.reduce((sum, order) => sum + order.total, 0);
  const avgRecipeMargin = mappedRecipes.length ? Math.round(mappedRecipes.reduce((sum, item) => sum + item.margin, 0) / mappedRecipes.length) : 0;
  const cancellationRate = mappedReservations.length ? Math.round((mappedReservations.filter((row) => row.status === "cancelled").length / mappedReservations.length) * 100) : 0;

  return NextResponse.json({
    summary: {
      menuItems: mappedMenu.length,
      activeTables: mappedTables.filter((table) => table.status === "occupied" || table.status === "reserved").length,
      occupiedTables: mappedTables.filter((table) => table.status === "occupied").length,
      kitchenOrders: mappedKitchenOrders.length,
      readyOrders: mappedKitchenOrders.filter((order) => order.status === "ready").length,
      openOrders: mappedOrders.filter((order) => order.status !== "closed").length,
      salesValue,
      avgRecipeMargin,
      reservations: mappedReservations.length,
      cancellationRate,
    },
    menu: mappedMenu,
    tables: mappedTables,
    kitchenOrders: mappedKitchenOrders,
    recipes: mappedRecipes,
    orders: mappedOrders,
    reservations: mappedReservations,
  });
}
