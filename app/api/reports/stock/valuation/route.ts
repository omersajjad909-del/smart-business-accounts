import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const items = await prisma.itemNew.findMany({
      where: { companyId },
      select: {
        id: true, name: true, rate: true, purchaseRate: true,
        inventoryTxns: {
          where: { companyId },
          select: { qty: true, rate: true, date: true },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Category map from catalog_product business records
    const catalogRecs = await prisma.businessRecord.findMany({
      where: { companyId, category: "catalog_product" },
      select: { data: true },
    });
    const catMap = new Map<string, string>();
    for (const r of catalogRecs) {
      const d = r.data as any;
      if (d?.itemNewId && d?.category) catMap.set(d.itemNewId, d.category);
    }

    const rows = items.map(item => {
      // Separate purchases (positive) and sales (negative)
      const purchases: { qty: number; rate: number }[] = [];
      let totalSoldQty = 0;

      for (const t of item.inventoryTxns) {
        const q = Number(t.qty);
        if (q > 0) purchases.push({ qty: q, rate: Number(t.rate) });
        else if (q < 0) totalSoldQty += Math.abs(q);
      }

      const totalPurchasedQty = purchases.reduce((s, p) => s + p.qty, 0);
      const totalPurchasedAmt = purchases.reduce((s, p) => s + p.qty * p.rate, 0);
      const stockQty = totalPurchasedQty - totalSoldQty;

      if (stockQty <= 0) return null;

      // Weighted Average cost
      const avgCost = totalPurchasedQty > 0 ? totalPurchasedAmt / totalPurchasedQty : 0;

      // FIFO cost — consume oldest purchases first for sold qty, remaining is stock
      let remainingSold = totalSoldQty;
      const fifoLayers: { qty: number; rate: number }[] = purchases.map(p => ({ ...p }));
      for (const layer of fifoLayers) {
        if (remainingSold <= 0) break;
        const consume = Math.min(layer.qty, remainingSold);
        layer.qty -= consume;
        remainingSold -= consume;
      }
      const remainingLayers = fifoLayers.filter(l => l.qty > 0);
      const fifoAmt = remainingLayers.reduce((s, l) => s + l.qty * l.rate, 0);
      const fifoQty = remainingLayers.reduce((s, l) => s + l.qty, 0);
      const fifoCost = fifoQty > 0 ? fifoAmt / fifoQty : avgCost;

      const marketPrice = Number(item.rate) || 0;

      return {
        itemName:      item.name,
        category:      catMap.get(item.id) || "",
        stockQty,
        avgCost:       Math.round(avgCost),
        fifoCost:      Math.round(fifoCost),
        totalValueAvg: Math.round(stockQty * avgCost),
        totalValueFifo: Math.round(stockQty * fifoCost),
        marketPrice,
      };
    }).filter(Boolean);

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("STOCK VALUATION ERROR:", e);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
