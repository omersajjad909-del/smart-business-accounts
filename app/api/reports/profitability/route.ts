import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";
import { invoiceRevenue } from "@/lib/invoiceAmounts";

/**
 * Latest stock rate per item, in one query — this used to run one query per
 * invoice line.
 */
async function latestCost(companyId: string, itemIds: string[]) {
  if (!itemIds.length) return new Map<string, number>();
  const rates = await prisma.stockRate.findMany({
    where: { companyId, itemId: { in: [...new Set(itemIds)] } },
    orderBy: { createdAt: "desc" },
    select: { itemId: true, rate: true },
  });
  const map = new Map<string, number>();
  for (const r of rates) if (!map.has(r.itemId)) map.set(r.itemId, Number(r.rate) || 0);
  return map;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.VIEW_REPORTS,
      companyId
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const groupBy = searchParams.get("groupBy") || "customer"; // customer | product

    const fromDate = from ? new Date(from + "T00:00:00") : undefined;
    const toDate = to ? new Date(to + "T23:59:59.999") : undefined;

    if (groupBy === "customer") {
      // Profitability by Customer
      const salesInvoices = await prisma.salesInvoice.findMany({
        where: {
          date: { gte: fromDate, lte: toDate },
          companyId,
          deletedAt: null,
        },
        include: {
          customer: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      const costOf = await latestCost(companyId, salesInvoices.flatMap((inv) => inv.items.map((i) => i.itemId)));
      const customerProfit: Record<string, Any> = {};

      for (const invoice of salesInvoices) {
        const customerId = invoice.customerId;
        const customerName = invoice.customer?.name || "Unknown";

        if (!customerProfit[customerId]) {
          customerProfit[customerId] = {
            customerId,
            customerName,
            invoiceCount: 0,
            totalSales: 0,
            totalCost: 0,
            totalProfit: 0,
          };
        }

        customerProfit[customerId].invoiceCount += 1;
        // Tax excluded: GST collected is owed to the government, not sales.
        customerProfit[customerId].totalSales += invoiceRevenue(invoice);

        for (const item of invoice.items) {
          customerProfit[customerId].totalCost += (costOf.get(item.itemId) || 0) * item.qty;
        }
      }

      const result = Object.values(customerProfit).map((cp: any) => ({
        ...cp,
        totalProfit: cp.totalSales - cp.totalCost,
        profitMargin: cp.totalSales > 0 ? ((cp.totalSales - cp.totalCost) / cp.totalSales) * 100 : 0,
      }));

      return NextResponse.json(result);
    } else {
      // Profitability by Product
      const salesInvoiceItems = await prisma.salesInvoiceItem.findMany({
        where: {
          invoice: {
            date: { gte: fromDate, lte: toDate },
            companyId,
            deletedAt: null,
          },
        },
        include: {
          item: true,
          invoice: true,
        },
      });

      const costOf = await latestCost(companyId, salesInvoiceItems.map((i) => i.itemId));
      const productProfit: Record<string, Any> = {};

      for (const item of salesInvoiceItems) {
        const itemId = item.itemId;
        const itemName = item.item?.name || "Unknown";

        if (!productProfit[itemId]) {
          productProfit[itemId] = {
            itemId,
            itemName,
            quantitySold: 0,
            totalSales: 0,
            totalCost: 0,
            totalProfit: 0,
          };
        }

        productProfit[itemId].quantitySold += item.qty;
        productProfit[itemId].totalSales += item.amount;

        productProfit[itemId].totalCost += (costOf.get(itemId) || 0) * item.qty;
      }

      const result = Object.values(productProfit).map((pp: any) => ({
        ...pp,
        totalProfit: pp.totalSales - pp.totalCost,
        profitMargin: pp.totalSales > 0 ? ((pp.totalSales - pp.totalCost) / pp.totalSales) * 100 : 0,
        averagePrice: pp.quantitySold > 0 ? pp.totalSales / pp.quantitySold : 0,
        averageCost: pp.quantitySold > 0 ? pp.totalCost / pp.quantitySold : 0,
      }));

      return NextResponse.json(result);
    }
  } catch (e: any) {
    console.error("Profitability Report Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

