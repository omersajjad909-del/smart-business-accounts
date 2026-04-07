import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeDate(value: Date | null | undefined) {
  if (!value) return new Date().toISOString();
  return value.toISOString();
}

export async function GET(req: NextRequest) {
  const role = (req.headers.get("x-user-role") || "").toUpperCase();
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const [
    quotations,
    salesInvoices,
    purchaseOrders,
    purchaseInvoices,
    challans,
    saleReturns,
    outwards,
    grns,
    receipts,
    accounts,
    items,
  ] = await Promise.all([
    prisma.quotation.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        quotationNo: true,
        date: true,
        total: true,
        status: true,
        customerName: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { date: "desc" },
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        total: true,
        driverName: true,
        vehicleNo: true,
        customerName: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        poNo: true,
        date: true,
        status: true,
        approvalStatus: true,
        supplier: { select: { name: true } },
        items: { select: { qty: true, rate: true } },
      },
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { date: "desc" },
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        total: true,
        supplier: { select: { name: true } },
      },
    }),
    prisma.deliveryChallan.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        challanNo: true,
        date: true,
        status: true,
        driverName: true,
        vehicleNo: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.saleReturn.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        returnNo: true,
        date: true,
        total: true,
        customer: { select: { name: true } },
        invoice: { select: { invoiceNo: true } },
      },
    }),
    prisma.outward.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        outwardNo: true,
        date: true,
        driverName: true,
        vehicleNo: true,
        customer: { select: { name: true } },
        items: { select: { qty: true } },
      },
    }),
    prisma.goodsReceiptNote.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        grnNo: true,
        date: true,
        status: true,
        supplier: { select: { name: true } },
        po: { select: { poNo: true } },
      },
    }),
    prisma.paymentReceipt.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { date: "desc" },
      select: {
        id: true,
        receiptNo: true,
        date: true,
        amount: true,
        paymentMode: true,
        status: true,
        party: { select: { name: true } },
      },
    }),
    prisma.account.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        partyType: true,
        city: true,
        phone: true,
        openDebit: true,
        openCredit: true,
        creditDays: true,
        creditLimit: true,
      },
    }),
    prisma.itemNew.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unit: true,
        description: true,
        inventoryTxns: {
          where: { companyId },
          select: { qty: true, rate: true },
        },
      },
    }),
  ]);

  const stock = items.map((item) => {
    let stockQty = 0;
    let stockValue = 0;
    for (const txn of item.inventoryTxns) {
      stockQty += Number(txn.qty || 0);
      stockValue += Number(txn.qty || 0) * Number(txn.rate || 0);
    }
    return {
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      description: item.description || "",
      stockQty,
      stockValue: stockQty <= 0 ? 0 : Math.round(stockValue),
    };
  });

  const summary = {
    sales: salesInvoices.reduce((sum, row) => sum + Number(row.total || 0), 0),
    purchases: purchaseInvoices.reduce((sum, row) => sum + Number(row.total || 0), 0),
    profit:
      salesInvoices.reduce((sum, row) => sum + Number(row.total || 0), 0) -
      purchaseInvoices.reduce((sum, row) => sum + Number(row.total || 0), 0),
    customers: accounts.filter((row) => String(row.partyType || "").toUpperCase() === "CUSTOMER").length,
    overdueReceivables: accounts
      .filter((row) => String(row.partyType || "").toUpperCase() === "CUSTOMER")
      .reduce((sum, row) => sum + Math.max(Number(row.openDebit || 0) - Number(row.openCredit || 0), 0), 0),
    overdueReceivablesCount: accounts
      .filter((row) => String(row.partyType || "").toUpperCase() === "CUSTOMER")
      .filter((row) => Math.max(Number(row.openDebit || 0) - Number(row.openCredit || 0), 0) > 0).length,
    lowStockCount: stock.filter((row) => Number(row.stockQty || 0) <= 5).length,
  };

  return NextResponse.json({
    summary,
    quotations: quotations.map((row) => ({ ...row, date: normalizeDate(row.date) })),
    salesInvoices: salesInvoices.map((row) => ({
      ...row,
      customerName: row.customerName || row.customer?.name || "",
      date: normalizeDate(row.date),
    })),
    purchaseOrders: purchaseOrders.map((row) => ({ ...row, date: normalizeDate(row.date) })),
    purchaseInvoices: purchaseInvoices.map((row) => ({ ...row, date: normalizeDate(row.date) })),
    challans: challans.map((row) => ({ ...row, date: normalizeDate(row.date) })),
    saleReturns: saleReturns.map((row) => ({ ...row, date: normalizeDate(row.date) })),
    outwards: outwards.map((row) => ({ ...row, date: normalizeDate(row.date) })),
    grns: grns.map((row) => ({ ...row, date: normalizeDate(row.date) })),
    receipts: receipts.map((row) => ({ ...row, date: normalizeDate(row.date) })),
    accounts,
    stock,
  });
}
