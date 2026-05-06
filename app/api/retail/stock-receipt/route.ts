import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// POST /api/retail/stock-receipt
// Creates an InventoryTxn (PURCHASE) and returns the new running stock qty.
// The caller is responsible for saving the stock_receipt business_record.
export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const { itemNewId, qty, costPrice, date } = body as {
      itemNewId: string;
      qty: number;
      costPrice: number;
      date?: string;
    };

    if (!itemNewId) return NextResponse.json({ error: "itemNewId required" }, { status: 400 });
    if (!qty || qty <= 0) return NextResponse.json({ error: "qty must be > 0" }, { status: 400 });

    const txnDate = date ? new Date(date) : new Date();

    await prisma.inventoryTxn.create({
      data: {
        companyId,
        type: "PURCHASE",
        date: txnDate,
        itemId: itemNewId,
        qty: qty,
        rate: costPrice || 0,
        amount: qty * (costPrice || 0),
        location: "MAIN",
      },
    });

    // Return new running stock for this item
    const agg = await prisma.inventoryTxn.aggregate({
      where: { itemId: itemNewId, companyId },
      _sum: { qty: true },
    });

    return NextResponse.json({ success: true, newStock: agg._sum.qty ?? 0 });
  } catch (e: any) {
    console.error("STOCK-RECEIPT ERROR:", e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
