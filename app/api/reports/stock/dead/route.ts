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

    const threshold = Math.max(1, Number(new URL(req.url).searchParams.get("threshold") || "90"));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - threshold);

    const items = await prisma.itemNew.findMany({
      where: { companyId },
      select: {
        id: true, name: true,
        inventoryTxns: {
          where: { companyId },
          select: { qty: true, rate: true, date: true },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const catalogRecs = await prisma.businessRecord.findMany({
      where: { companyId, category: "catalog_product" },
      select: { data: true },
    });
    const catMap = new Map<string, string>();
    const catStockMap = new Map<string, { stock: number; costPrice: number }>();
    for (const r of catalogRecs) {
      const d = r.data as any;
      if (d?.itemNewId) {
        if (d.category) catMap.set(d.itemNewId, d.category);
        catStockMap.set(d.itemNewId, { stock: Number(d.stock) || 0, costPrice: Number(d.costPrice) || 0 });
      }
    }

    const today = new Date();
    const rows = items.map(item => {
      let stockQty = 0;
      let totalPurchasedQty = 0;
      let totalPurchasedAmt = 0;
      let lastSaleDate: string | undefined;
      let firstPurchaseDate: string | undefined;

      for (const t of item.inventoryTxns) {
        const q = Number(t.qty);
        const d = t.date ? new Date(t.date) : null;
        if (q > 0) {
          stockQty += q;
          totalPurchasedQty += q;
          totalPurchasedAmt += q * Number(t.rate);
          if (!firstPurchaseDate && d) firstPurchaseDate = d.toISOString().slice(0, 10);
        } else if (q < 0) {
          stockQty -= Math.abs(q);
          if (d) {
            const iso = d.toISOString().slice(0, 10);
            if (!lastSaleDate || iso > lastSaleDate) lastSaleDate = iso;
          }
        }
      }

      // For items with no purchase txns, fall back to catalog_product data.stock
      const catEntry = catStockMap.get(item.id);
      if (totalPurchasedQty === 0 && catEntry && catEntry.stock > 0) {
        stockQty = catEntry.stock;
        totalPurchasedQty = catEntry.stock;
        totalPurchasedAmt = catEntry.stock * (catEntry.costPrice || Number(item.purchaseRate) || 0);
      }

      if (stockQty <= 0) return null;

      // Dead if no sale within threshold days
      const lastSaleDt = lastSaleDate ? new Date(lastSaleDate) : null;
      const daysSinceLastSale = lastSaleDt
        ? Math.floor((today.getTime() - lastSaleDt.getTime()) / 86_400_000)
        : (firstPurchaseDate ? Math.floor((today.getTime() - new Date(firstPurchaseDate).getTime()) / 86_400_000) : 9999);

      if (daysSinceLastSale < threshold) return null;

      const avgCost = totalPurchasedQty > 0 ? totalPurchasedAmt / totalPurchasedQty : 0;

      return {
        itemName:          item.name,
        category:          catMap.get(item.id) || "",
        stockQty,
        stockValue:        Math.round(stockQty * avgCost),
        lastSaleDate,
        daysSinceLastSale,
        purchaseDate:      firstPurchaseDate,
      };
    }).filter(Boolean);

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("DEAD STOCK ERROR:", e);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
