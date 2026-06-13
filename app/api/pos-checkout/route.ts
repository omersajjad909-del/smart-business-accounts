import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const { items, date, total, taxAmt, discount, payMethod } = body as {
      items: { itemNewId: string; name: string; qty: number; rate: number }[];
      date?: string;
      total?: number;
      taxAmt?: number;
      discount?: number;
      payMethod?: string;
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

    // ── Step 3: GL Voucher ───────────────────────────────────────────────────
    const saleTotal = total ?? items.reduce((s, i) => s + i.qty * i.rate, 0);
    try {
      const salesAcc = await prisma.account.findFirst({
        where: { companyId, name: { contains: "Sales", mode: "insensitive" } },
      });
      const method = (payMethod || "cash").toLowerCase();
      let debitAcc = await prisma.account.findFirst({
        where: { companyId, name: { contains: method === "card" ? "Card" : "Cash", mode: "insensitive" } },
      });
      if (!debitAcc) {
        debitAcc = await prisma.account.findFirst({
          where: { companyId, name: { contains: "Cash", mode: "insensitive" } },
        });
      }
      if (salesAcc && debitAcc) {
        const count = await prisma.voucher.count({ where: { type: "SI", companyId } });
        await prisma.voucher.create({
          data: {
            companyId,
            voucherNo: `POS-${count + 1}`,
            type: "SI",
            date: txnDate,
            narration: `POS Sale`,
            entries: {
              create: [
                { companyId, accountId: debitAcc.id, amount: saleTotal },
                { companyId, accountId: salesAcc.id, amount: -saleTotal },
              ],
            },
          },
        });
      }
    } catch (glErr) {
      console.error("POS GL Voucher error (non-fatal):", glErr);
    }

    return NextResponse.json({ success: true, txns: created.length });
  } catch (e: any) {
    console.error("POS-CHECKOUT ERROR:", e);
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 });
  }
}
