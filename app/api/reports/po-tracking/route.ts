import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const pos = await prisma.purchaseOrder.findMany({
      where: { companyId },
      include: {
        supplier: { select: { name: true } },
        items: { select: { qty: true, rate: true, invoicedQty: true } },
        goodsReceiptNotes: {
          select: { date: true, status: true },
          orderBy: { date: "desc" },
          take: 1,
        },
      },
      orderBy: { date: "desc" },
    });

    const rows = pos.map((po) => {
      const totalValue = po.items.reduce((s, i) => s + i.qty * i.rate, 0);
      const receivedValue = po.items.reduce((s, i) => s + i.invoicedQty * i.rate, 0);
      const pendingValue = totalValue - receivedValue;
      const latestGrn = po.goodsReceiptNotes[0];
      const receivedDate = latestGrn?.date || null;

      let status = po.status;
      if (pendingValue <= 0) status = "FULLY_RECEIVED";
      else if (receivedValue > 0) status = "PARTIAL";

      return {
        poNumber: po.poNo,
        supplierName: po.supplier?.name || "Unknown",
        poDate: po.date,
        expectedDate: null,
        receivedDate,
        totalValue,
        receivedValue,
        pendingValue,
        status,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("PO TRACKING ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
