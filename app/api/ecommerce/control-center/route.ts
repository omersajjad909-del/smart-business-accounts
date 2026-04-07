import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : new Date().toISOString();
}

export async function GET(req: NextRequest) {
  const role = normalizeRole(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [productRecords, orderRecords, returnRecords, shipmentRecords] = await Promise.all([
    prisma.businessRecord.findMany({ where: { companyId, category: "ecommerce_product" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "ecommerce_order" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "ecommerce_return" }, orderBy: { createdAt: "desc" } }),
    prisma.businessRecord.findMany({ where: { companyId, category: "ecommerce_shipment" }, orderBy: { createdAt: "desc" } }),
  ]);

  const products = productRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      name: row.title,
      category: String(data.category || ""),
      sku: String(data.sku || ""),
      price: Number(row.amount || 0),
      stock: Number(data.stock || 0),
      platform: String(data.platform || "Website"),
      sales: Number(data.sales || 0),
      status: String(row.status || "active"),
    };
  });

  const orders = orderRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      orderId: String(data.orderId || `ORD-${row.id.slice(-6).toUpperCase()}`),
      customer: row.title,
      phone: String(data.phone || ""),
      product: String(data.product || ""),
      productId: String(data.productId || ""),
      quantity: Number(data.quantity || 1),
      amount: Number(row.amount || 0),
      address: String(data.address || ""),
      platform: String(data.platform || "Website"),
      status: String(row.status || "pending"),
      createdAt: normalizeDate(row.createdAt),
    };
  });

  const returns = returnRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      returnNo: String(data.returnNo || `RET-${row.id.slice(-6).toUpperCase()}`),
      orderId: String(data.orderId || ""),
      customer: row.title,
      product: String(data.product || ""),
      qty: Number(data.qty || 1),
      amount: Number(row.amount || 0),
      reason: String(data.reason || ""),
      status: String(row.status || "pending"),
      method: String(data.method || ""),
      createdAt: normalizeDate(row.createdAt),
    };
  });

  const shipments = shipmentRecords.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      trackingNo: String(data.trackingNo || `SHP-${row.id.slice(-6).toUpperCase()}`),
      orderId: String(data.orderId || ""),
      customer: row.title,
      city: String(data.city || ""),
      courier: String(data.courier || "TCS"),
      weight: Number(data.weight || 0),
      charges: Number(row.amount || 0),
      expected: String(data.expected || normalizeDate(row.date || row.createdAt).slice(0, 10)),
      status: String(row.status || "processing"),
      createdAt: normalizeDate(row.createdAt),
    };
  });

  const grossSales = orders.reduce((sum, order) => sum + order.amount, 0);
  const deliveredOrders = orders.filter((order) => order.status === "delivered");
  const deliveredRevenue = deliveredOrders.reduce((sum, order) => sum + order.amount, 0);
  const refundValue = returns.filter((row) => row.status === "refunded").reduce((sum, row) => sum + row.amount, 0);
  const returnRate = orders.length ? Math.round((returns.length / orders.length) * 100) : 0;
  const deliveryRate = shipments.length ? Math.round((shipments.filter((row) => row.status === "delivered").length / shipments.length) * 100) : 0;

  return NextResponse.json({
    summary: {
      products: products.length,
      activeProducts: products.filter((product) => product.status === "active").length,
      lowStockProducts: products.filter((product) => product.stock > 0 && product.stock <= 5).length,
      orders: orders.length,
      activeOrders: orders.filter((order) => ["pending", "processing"].includes(order.status)).length,
      deliveredOrders: deliveredOrders.length,
      deliveredRevenue,
      grossSales,
      returns: returns.length,
      openReturns: returns.filter((row) => ["pending", "approved"].includes(row.status)).length,
      refundValue,
      shipments: shipments.length,
      inTransitShipments: shipments.filter((row) => ["processing", "dispatched", "in_transit"].includes(row.status)).length,
      deliveryRate,
      returnRate,
    },
    products,
    orders,
    returns,
    shipments,
  });
}
