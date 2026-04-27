import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    // Use DeliveryChallan as order fulfillment proxy — challans represent dispatched orders
    const challans = await prisma.deliveryChallan.findMany({
      where: { companyId },
      include: {
        customer: { select: { name: true } },
        items: { select: { qty: true, rate: true } },
      },
      orderBy: { date: "desc" },
      take: 200,
    });

    // Also fetch sales invoices to match challans
    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null },
      select: { customerId: true, date: true, total: true, invoiceNo: true },
    });

    const rows = challans.map((ch) => {
      const value = ch.items.reduce((s, i) => s + i.qty * (i.rate || 0), 0);
      const status = ch.status === "INVOICED" ? "FULFILLED" : ch.status === "DELIVERED" ? "DELIVERED" : "PENDING";

      return {
        orderId: ch.challanNo,
        customerName: ch.customer?.name || "Unknown",
        orderDate: ch.date,
        promisedDate: null,
        fulfilledDate: ch.status === "INVOICED" ? ch.date : null,
        status,
        daysVariance: 0,
        value,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("ORDER FULFILLMENT ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
