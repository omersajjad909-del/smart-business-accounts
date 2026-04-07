import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function statusKey(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : new Date().toISOString();
}

export async function GET(req: NextRequest) {
  const role = statusKey(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [
    salesSummary,
    purchaseSummary,
    salesInvoices,
    purchaseInvoices,
    salesOrders,
    warehouses,
    transfers,
    priceLists,
    creditLimits,
    customerAccounts,
    supplierAccounts,
  ] = await Promise.all([
    prisma.salesInvoice.aggregate({
      where: { companyId, deletedAt: null },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.purchaseInvoice.aggregate({
      where: { companyId, deletedAt: null },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { date: "desc" },
      take: 8,
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        total: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { date: "desc" },
      take: 8,
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        total: true,
        supplier: { select: { name: true } },
      },
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "sales_order" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "warehouse" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "stock_transfer" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "price_list" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.businessRecord.findMany({
      where: { companyId, category: "credit_limit" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.account.findMany({
      where: { companyId, deletedAt: null, partyType: "CUSTOMER" },
      orderBy: { openDebit: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        city: true,
        phone: true,
        openDebit: true,
        openCredit: true,
        creditDays: true,
        creditLimit: true,
      },
    }),
    prisma.account.findMany({
      where: { companyId, deletedAt: null, partyType: "SUPPLIER" },
      orderBy: { openCredit: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        city: true,
        phone: true,
        openDebit: true,
        openCredit: true,
        creditDays: true,
        creditLimit: true,
      },
    }),
  ]);

  const mappedWarehouses = warehouses.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      name: row.title,
      location: String(data.location || ""),
      status: row.status || "ACTIVE",
      itemsCount: Number(data.itemsCount || 0),
      stockValue: Number(row.amount || 0),
      capacity: Number(data.capacity || 0),
      capacityUsed: Number(data.capacityUsed || 0),
    };
  });

  const mappedTransfers = transfers.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      item: String(data.item || row.title || ""),
      from: String(data.from || ""),
      to: String(data.to || ""),
      qty: Number(data.qty || 0),
      status: row.status || "COMPLETED",
      date: normalizeDate(row.date || row.createdAt),
    };
  });

  const mappedSalesOrders = salesOrders.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      orderNo: String(data.orderNo || row.title || ""),
      customerName: String(data.customerName || ""),
      amount: Number(row.amount || 0),
      status: row.status || "PENDING",
      date: normalizeDate(row.date || row.createdAt),
    };
  });

  const mappedPriceLists = priceLists.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      id: row.id,
      name: row.title,
      type: String(data.type || "Wholesale"),
      discount: Number(data.discount || 0),
      status: row.status || "DRAFT",
      itemCount: items.length,
      notes: String(data.notes || ""),
    };
  });

  const mappedCreditLimits = creditLimits.map((row) => {
    const data = (row.data || {}) as Record<string, unknown>;
    const limit = Number(data.limit || row.amount || 0);
    const used = Number(data.used || 0);
    const utilization = limit > 0 ? (used / limit) * 100 : 0;
    return {
      id: row.id,
      customerName: row.title,
      limit,
      used,
      available: Math.max(0, limit - used),
      utilization,
      status: utilization > 100 ? "EXCEEDED" : utilization > 80 ? "WARNING" : "OK",
    };
  });

  const summary = {
    totalRevenue: Number(salesSummary._sum.total || 0),
    totalPurchases: Number(purchaseSummary._sum.total || 0),
    totalReceivable: customerAccounts.reduce(
      (sum, row) => sum + Math.max(Number(row.openDebit || 0) - Number(row.openCredit || 0), 0),
      0
    ),
    totalPayable: supplierAccounts.reduce(
      (sum, row) => sum + Math.max(Number(row.openCredit || 0) - Number(row.openDebit || 0), 0),
      0
    ),
    totalSalesInvoices: salesSummary._count._all,
    totalPurchaseInvoices: purchaseSummary._count._all,
    totalSalesOrders: mappedSalesOrders.length,
    pendingSalesOrders: mappedSalesOrders.filter((row) => statusKey(row.status) === "PENDING").length,
    activeWarehouses: mappedWarehouses.filter((row) => statusKey(row.status) === "ACTIVE").length,
    totalStockValue: mappedWarehouses.reduce((sum, row) => sum + row.stockValue, 0),
    totalSkuCoverage: mappedWarehouses.reduce((sum, row) => sum + row.itemsCount, 0),
    activeTransfers: mappedTransfers.filter((row) => ["PENDING", "IN_TRANSIT"].includes(statusKey(row.status))).length,
    highUtilizationSites: mappedWarehouses.filter((row) => row.capacity > 0 && row.capacityUsed / row.capacity >= 0.8).length,
    activePriceLists: mappedPriceLists.filter((row) => statusKey(row.status) === "ACTIVE").length,
    customersOverLimit: mappedCreditLimits.filter((row) => row.status === "EXCEEDED").length,
  };

  return NextResponse.json({
    summary,
    warehouses: mappedWarehouses,
    transfers: mappedTransfers,
    salesOrders: mappedSalesOrders,
    salesInvoices: salesInvoices.map((row) => ({
      ...row,
      customerName: row.customer?.name || "",
      date: normalizeDate(row.date),
    })),
    purchaseInvoices: purchaseInvoices.map((row) => ({
      ...row,
      supplierName: row.supplier?.name || "",
      date: normalizeDate(row.date),
    })),
    priceLists: mappedPriceLists,
    creditLimits: mappedCreditLimits,
    topCustomers: customerAccounts.map((row) => ({
      ...row,
      receivable: Math.max(Number(row.openDebit || 0) - Number(row.openCredit || 0), 0),
    })),
    topSuppliers: supplierAccounts.map((row) => ({
      ...row,
      payable: Math.max(Number(row.openCredit || 0) - Number(row.openDebit || 0), 0),
    })),
  });
}
