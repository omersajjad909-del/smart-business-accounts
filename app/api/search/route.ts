import { NextRequest, NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { resolveBranchId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

const MAX_RESULTS = 8;

type AccountSearch = Prisma.AccountGetPayload<{
  select: {
    id: true;
    name: true;
    code: true;
    type: true;
    partyType: true;
  };
}>;

type ItemSearch = Prisma.ItemNewGetPayload<{
  select: {
    id: true;
    name: true;
    code: true;
    unit: true;
  };
}>;

function formatDate(date: Date | null | undefined) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString();
}

function formatAmount(amount: number | null | undefined) {
  if (typeof amount !== "number") return "0";
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = req.headers.get("x-company-id") || "";
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    if (!query || query.length < 2) {
      return NextResponse.json({
        contacts: [],
        opportunities: [],
        interactions: [],
        customers: [],
        suppliers: [],
        accounts: [],
        items: [],
        salesInvoices: [],
        purchaseInvoices: [],
        quotations: [],
        purchaseOrders: [],
        deliveryChallans: [],
        grns: [],
        paymentReceipts: [],
        saleReturns: [],
        vouchers: [],
      });
    }

    const branchId = await resolveBranchId(req, companyId);
    const branchWhere = branchId ? { branchId } : {};
    const contains = { contains: query, mode: "insensitive" as const };

    const [
      customers,
      suppliers,
      accounts,
      contacts,
      opportunities,
      interactions,
      items,
      salesInvoices,
      purchaseInvoices,
      quotations,
      purchaseOrders,
      deliveryChallans,
      grns,
      paymentReceipts,
      saleReturns,
      vouchers,
    ] = await Promise.all([
      prisma.account.findMany({
        where: {
          companyId,
          deletedAt: null,
          partyType: "CUSTOMER",
          OR: [{ name: contains }, { code: contains }],
        },
        take: MAX_RESULTS,
        select: { id: true, name: true, code: true, type: true, partyType: true },
      }),
      prisma.account.findMany({
        where: {
          companyId,
          deletedAt: null,
          partyType: "SUPPLIER",
          OR: [{ name: contains }, { code: contains }],
        },
        take: MAX_RESULTS,
        select: { id: true, name: true, code: true, type: true, partyType: true },
      }),
      prisma.account.findMany({
        where: {
          companyId,
          deletedAt: null,
          OR: [{ name: contains }, { code: contains }, { type: contains }, { partyType: contains }],
        },
        take: MAX_RESULTS,
        select: { id: true, name: true, code: true, type: true, partyType: true },
      }),
      prisma.contact.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...branchWhere,
          OR: [
            { name: contains },
            { email: contains },
            { phone: contains },
            { companyName: contains },
            { position: contains },
            { type: contains },
          ],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          position: true,
          type: true,
        },
      }),
      prisma.opportunity.findMany({
        where: {
          contact: {
            companyId,
            deletedAt: null,
            ...(branchId ? { branchId } : {}),
          },
          OR: [{ title: contains }, { description: contains }, { stage: contains }, { contact: { name: contains } }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          title: true,
          stage: true,
          value: true,
          expectedCloseDate: true,
          contact: { select: { name: true } },
        },
      }),
      prisma.interaction.findMany({
        where: {
          contact: {
            companyId,
            deletedAt: null,
            ...(branchId ? { branchId } : {}),
          },
          OR: [{ subject: contains }, { description: contains }, { type: contains }, { contact: { name: contains } }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          subject: true,
          type: true,
          date: true,
          contact: { select: { name: true } },
        },
      }),
      prisma.itemNew.findMany({
        where: {
          companyId,
          deletedAt: null,
          OR: [{ name: contains }, { code: contains }, { unit: contains }],
        },
        take: MAX_RESULTS,
        select: { id: true, name: true, code: true, unit: true },
      }),
      prisma.salesInvoice.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...branchWhere,
          OR: [{ invoiceNo: contains }, { customer: { name: contains } }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          invoiceNo: true,
          date: true,
          total: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.purchaseInvoice.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...branchWhere,
          OR: [{ invoiceNo: contains }, { supplier: { name: contains } }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          invoiceNo: true,
          date: true,
          total: true,
          supplier: { select: { name: true } },
        },
      }),
      prisma.quotation.findMany({
        where: {
          companyId,
          ...branchWhere,
          OR: [{ quotationNo: contains }, { customerName: contains }, { customer: { name: contains } }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          quotationNo: true,
          date: true,
          total: true,
          customerName: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          companyId,
          ...branchWhere,
          OR: [{ poNo: contains }, { remarks: contains }, { supplier: { name: contains } }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          poNo: true,
          date: true,
          status: true,
          supplier: { select: { name: true } },
        },
      }),
      prisma.deliveryChallan.findMany({
        where: {
          companyId,
          ...branchWhere,
          OR: [{ challanNo: contains }, { remarks: contains }, { customer: { name: contains } }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          challanNo: true,
          date: true,
          status: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.goodsReceiptNote.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...branchWhere,
          OR: [{ grnNo: contains }, { remarks: contains }, { supplier: { name: contains } }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          grnNo: true,
          date: true,
          status: true,
          supplier: { select: { name: true } },
        },
      }),
      prisma.paymentReceipt.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...branchWhere,
          OR: [{ receiptNo: contains }, { referenceNo: contains }, { narration: contains }, { party: { name: contains } }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          receiptNo: true,
          date: true,
          amount: true,
          party: { select: { name: true } },
          status: true,
        },
      }),
      prisma.saleReturn.findMany({
        where: {
          companyId,
          OR: [{ returnNo: contains }, { remarks: contains }, { customer: { name: contains } }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          returnNo: true,
          date: true,
          total: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.voucher.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...branchWhere,
          OR: [{ voucherNo: contains }, { narration: contains }, { type: contains }],
        },
        take: MAX_RESULTS,
        select: {
          id: true,
          voucherNo: true,
          type: true,
          date: true,
          narration: true,
        },
      }),
    ]);

    return NextResponse.json({
      contacts: contacts.map((row) => ({
        type: "contact",
        id: row.id,
        title: row.name,
        subtitle: `${row.type} - ${row.companyName}${row.position ? ` - ${row.position}` : ""}${
          row.phone ? ` - ${row.phone}` : ""
        }${row.email ? ` - ${row.email}` : ""}`,
        url: `/dashboard/crm/contacts`,
      })),
      opportunities: opportunities.map((row) => ({
        type: "opportunity",
        id: row.id,
        title: row.title,
        subtitle: `${row.contact?.name || "N/A"} - ${row.stage} - ${formatAmount(row.value)} - ${formatDate(
          row.expectedCloseDate
        )}`,
        url: `/dashboard/crm/opportunities`,
      })),
      interactions: interactions.map((row) => ({
        type: "interaction",
        id: row.id,
        title: row.subject,
        subtitle: `${row.contact?.name || "N/A"} - ${row.type} - ${formatDate(row.date)}`,
        url: `/dashboard/crm/interactions`,
      })),
      customers: customers.map((row: AccountSearch) => ({
        type: "customer",
        id: row.id,
        title: row.name,
        subtitle: `${row.code} - Customer`,
        url: `/dashboard/accounts`,
      })),
      suppliers: suppliers.map((row: AccountSearch) => ({
        type: "supplier",
        id: row.id,
        title: row.name,
        subtitle: `${row.code} - Supplier`,
        url: `/dashboard/accounts`,
      })),
      accounts: accounts.map((row: AccountSearch) => ({
        type: "account",
        id: row.id,
        title: row.name,
        subtitle: `${row.code} - ${row.type}${row.partyType ? ` (${row.partyType})` : ""}`,
        url: `/dashboard/accounts`,
      })),
      items: items.map((row: ItemSearch) => ({
        type: "item",
        id: row.id,
        title: row.name,
        subtitle: `${row.code} - ${row.unit}`,
        url: `/dashboard/items-new`,
      })),
      salesInvoices: salesInvoices.map((row) => ({
        type: "sales-invoice",
        id: row.id,
        title: row.invoiceNo,
        subtitle: `${row.customer?.name || "N/A"} - ${formatDate(row.date)} - ${formatAmount(row.total)}`,
        url: `/dashboard/sales-invoice?id=${row.id}`,
      })),
      purchaseInvoices: purchaseInvoices.map((row) => ({
        type: "purchase-invoice",
        id: row.id,
        title: row.invoiceNo,
        subtitle: `${row.supplier?.name || "N/A"} - ${formatDate(row.date)} - ${formatAmount(row.total)}`,
        url: `/dashboard/purchase-invoice?id=${row.id}`,
      })),
      quotations: quotations.map((row) => ({
        type: "quotation",
        id: row.id,
        title: row.quotationNo,
        subtitle: `${row.customer?.name || row.customerName || "N/A"} - ${formatDate(row.date)} - ${formatAmount(
          row.total
        )}`,
        url: `/dashboard/quotation?id=${row.id}`,
      })),
      purchaseOrders: purchaseOrders.map((row) => ({
        type: "purchase-order",
        id: row.id,
        title: row.poNo,
        subtitle: `${row.supplier?.name || "N/A"} - ${formatDate(row.date)} - ${row.status}`,
        url: `/dashboard/purchase-order?id=${row.id}`,
      })),
      deliveryChallans: deliveryChallans.map((row) => ({
        type: "delivery-challan",
        id: row.id,
        title: row.challanNo,
        subtitle: `${row.customer?.name || "N/A"} - ${formatDate(row.date)} - ${row.status}`,
        url: `/dashboard/delivery-challan?id=${row.id}`,
      })),
      grns: grns.map((row) => ({
        type: "grn",
        id: row.id,
        title: row.grnNo,
        subtitle: `${row.supplier?.name || "N/A"} - ${formatDate(row.date)} - ${row.status}`,
        url: `/dashboard/grn?id=${row.id}`,
      })),
      paymentReceipts: paymentReceipts.map((row) => ({
        type: "payment-receipt",
        id: row.id,
        title: row.receiptNo,
        subtitle: `${row.party?.name || "N/A"} - ${formatDate(row.date)} - ${formatAmount(row.amount)} (${row.status})`,
        url: `/dashboard/payment-receipts?id=${row.id}`,
      })),
      saleReturns: saleReturns.map((row) => ({
        type: "sale-return",
        id: row.id,
        title: row.returnNo,
        subtitle: `${row.customer?.name || "N/A"} - ${formatDate(row.date)} - ${formatAmount(row.total)}`,
        url: `/dashboard/sale-return?id=${row.id}`,
      })),
      vouchers: vouchers.map((row) => ({
        type: "voucher",
        id: row.id,
        title: row.voucherNo,
        subtitle: `${row.type} - ${formatDate(row.date)}${row.narration ? ` - ${row.narration}` : ""}`,
        url: row.type === "CPV" ? "/dashboard/cpv" : row.type === "CRV" ? "/dashboard/crv" : "/dashboard/jv",
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search failed";
    console.error("SEARCH ERROR:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
