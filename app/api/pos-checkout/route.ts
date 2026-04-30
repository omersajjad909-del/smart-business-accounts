import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// POST /api/pos-checkout
// 1. Validate stock for each item (using InventoryTxn sum)
// 2. Create InventoryTxn SALE entries to deduct stock
export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const { items, date } = body as {
      items: { itemNewId: string; name: string; qty: number; rate: number }[];
      date?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items required" }, { status: 400 });
    }

    // ── Step 1: Stock check ──────────────────────────────────────────────────
    for (const i of items) {
      if (!i.itemNewId) continue;
      const agg = await prisma.inventoryTxn.aggregate({
        where: { itemId: i.itemNewId, companyId },
        _sum: { qty: true },
      });
      const available = agg._sum.qty ?? 0;
      if (available < i.qty) {
        return NextResponse.json(
          { error: `Insufficient stock for "${i.name}". Available: ${available}, Required: ${i.qty}` },
          { status: 400 }
        );
      }
    }

    // ── Step 2: Deduct stock ─────────────────────────────────────────────────
    const txnDate = date ? new Date(date) : new Date();
    const created: string[] = [];

    for (const i of items) {
      if (!i.itemNewId) continue;
      const txn = await prisma.inventoryTxn.create({
        data: {
          companyId,
          type: "SALE",
          date: txnDate,
          itemId: i.itemNewId,
          qty: -i.qty,
          rate: i.rate,
          amount: i.qty * i.rate,
          location: "MAIN",
        },
      });
      created.push(txn.id);
    }

    return NextResponse.json({ success: true, txns: created.length });
  } catch (e: any) {
    console.error("POS-CHECKOUT ERROR:", e);
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 });
  }
}
