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

    const periodParam = new URL(req.url).searchParams.get("period") || "quarter";
    const daysInPeriod = periodParam === "month" ? 30 : periodParam === "year" ? 365 : 90;

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - daysInPeriod);
    periodStart.setHours(0, 0, 0, 0);

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

    const rows = items.map(item => {
      let openingStock = 0;   // qty before period start
      let closingStock = 0;   // qty at end (now)
      let cogsQty = 0;
      let cogsAmt = 0;
      let hasTxns = false;
      // Track avg cost for COGS calculation
      let runningQty = 0;
      let runningAmt = 0;

      for (const t of item.inventoryTxns) {
        const q = Number(t.qty);
        const r = Number(t.rate);
        const d = t.date ? new Date(t.date) : null;
        const inPeriod = d && d >= periodStart;

        if (q > 0) {
          hasTxns = true;
          if (!inPeriod) openingStock += q;
          closingStock += q;
          runningQty += q;
          runningAmt += q * r;
        } else if (q < 0) {
          hasTxns = true;
          if (!inPeriod) openingStock -= Math.abs(q);
          closingStock -= Math.abs(q);
          if (inPeriod) {
            cogsQty += Math.abs(q);
            const avgRate = runningQty > 0 ? runningAmt / runningQty : r;
            cogsAmt += Math.abs(q) * avgRate;
          }
          runningQty = Math.max(0, runningQty - Math.abs(q));
          runningAmt = runningQty > 0 ? runningAmt * (runningQty / (runningQty + Math.abs(q))) : 0;
        }
      }

      // Fall back to catalog_product data.stock for items with no InventoryTxn records
      if (!hasTxns) {
        const catEntry = catStockMap.get(item.id);
        if (catEntry && catEntry.stock > 0) {
          closingStock = catEntry.stock;
          // Opening stock = closing stock (no in-period txns known)
          openingStock = catEntry.stock;
        }
      }

      if (openingStock <= 0 && closingStock <= 0 && cogsQty === 0) return null;

      const avgInventory = (Math.max(0, openingStock) + Math.max(0, closingStock)) / 2;
      const turnoverRatio = avgInventory > 0 ? cogsAmt / avgInventory : 0;
      const daysOnHand = turnoverRatio > 0 ? Math.round(daysInPeriod / turnoverRatio) : 0;

      return {
        itemName:      item.name,
        category:      catMap.get(item.id) || "",
        openingStock:  Math.max(0, openingStock),
        closingStock:  Math.max(0, closingStock),
        cogs:          Math.round(cogsAmt),
        avgInventory:  Math.round(avgInventory),
        turnoverRatio: Math.round(turnoverRatio * 100) / 100,
        daysOnHand,
      };
    }).filter(Boolean);

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("STOCK TURNOVER ERROR:", e);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
