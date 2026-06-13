import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { type, itemId, qty, rate, amount, location, date } = await req.json();
    if (!type || !itemId || qty == null) {
      return NextResponse.json({ error: "type, itemId and qty required" }, { status: 400 });
    }

    const item = await prisma.itemNew.findFirst({ where: { id: itemId, companyId } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const txn = await prisma.inventoryTxn.create({
      data: {
        companyId,
        type,
        date: date ? new Date(date) : new Date(),
        itemId,
        qty: Number(qty),
        rate: Number(rate ?? item.rate ?? 0),
        amount: Number(amount ?? Math.abs(qty) * Number(rate ?? item.rate ?? 0)),
        location: location || "MAIN",
      },
    });

    return NextResponse.json({ success: true, id: txn.id });
  } catch (e: any) {
    console.error("InventoryTxn POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
