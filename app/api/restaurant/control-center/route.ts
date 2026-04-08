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

  const mappedMenu = menu.map((record) => ({ id: record.id, name: record.title, category: String((record.data || {})["category"] || "Mains"), price: Number(record.amount || 0), cost: Number((record.data || {})["cost"] || 0), available: record.status !== "inactive" }));
  const mappedTables = tables.map((record) => ({ id: record.id, number: Number((record.data || {})["number"] || 0), capacity: Number((record.data || {})["capacity"] || 4), status: String(record.status || "available") }));
  const mappedKitchenOrders = kitchenOrders.map((record) => ({ id: record.id, orderId: String((record.data || {})["orderId"] || record.title), table: String((record.data || {})["table"] || ""), priority: String((record.data || {})["priority"] || "medium"), status: String(record.status || "pending"), items: String((record.data || {})["items"] || "").split(",").map((item) => item.trim()).filter(Boolean) }));
  const mappedRecipes = recipes.map((record) => {
    const totalCost = Number((record.data || {})["totalCost"] || 0);
    const sellingPrice = Number(record.amount || 0);
    return { id: record.id, name: record.title, category: String((record.data || {})["category"] || "Mains"), servings: Number((record.data || {})["servings"] || 1), totalCost, sellingPrice, margin: sellingPrice > 0 ? Math.round(((sellingPrice - totalCost) / sellingPrice) * 100) : 0 };
  });
  const mappedOrders = orders.map((record) => ({ id: record.id, orderNo: String((record.data || {})["orderNo"] || record.title), tableRef: String((record.data || {})["tableRef"] || ""), serviceMode: String((record.data || {})["serviceMode"] || "dine_in"), itemsSummary: String((record.data || {})["itemsSummary"] || ""), total: Number(record.amount || 0), status: String(record.status || "draft"), guests: Number((record.data || {})["guests"] || 1), date: record.date?.split("T")[0] || "" }));
  const mappedReservations = reservations.map((record) => ({ id: record.id, guestName: record.title, phone: String((record.data || {})["phone"] || ""), tableRef: String((record.data || {})["tableRef"] || ""), guests: Number((record.data || {})["guests"] || 1), reservationDate: record.date?.split("T")[0] || "", status: String(record.status || "booked") }));

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
