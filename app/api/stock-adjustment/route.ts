import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { itemId, physicalQty, reason, date } = await req.json();

    if (!itemId || physicalQty == null) {
      return NextResponse.json({ error: "itemId and physicalQty required" }, { status: 400 });
    }

    const item = await prisma.itemNew.findFirst({ where: { id: itemId, companyId } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Get current stock level
    const agg = await prisma.inventoryTxn.aggregate({
      where: { itemId, companyId },
      _sum: { qty: true },
    });
    const currentQty = Number(agg._sum.qty ?? 0);
    const diff = Number(physicalQty) - currentQty;

    if (diff === 0) {
      return NextResponse.json({ message: "No adjustment needed — physical matches system count", diff: 0 });
    }

    const txn = await prisma.inventoryTxn.create({
      data: {
        companyId,
        type: "ADJUSTMENT",
        date: date ? new Date(date) : new Date(),
        itemId,
        qty: diff,
        rate: Number(item.rate || 0),
        amount: diff * Number(item.rate || 0),
        location: "MAIN",
      },
    });

    return NextResponse.json({
      success: true,
      diff,
      previousQty: currentQty,
      newQty: Number(physicalQty),
      txnId: txn.id,
      reason: reason || "Manual adjustment",
    });
  } catch (e: any) {
    console.error("Stock Adjustment Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
