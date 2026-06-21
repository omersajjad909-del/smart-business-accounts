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

    const { searchParams } = new URL(req.url);
    const days = Math.max(1, Number(searchParams.get("days") || "90"));

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);

    // All items with their inventory transactions
    const items = await prisma.itemNew.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        unit: true,
        inventoryTxns: {
          where: { companyId },
          select: { qty: true, rate: true, type: true, date: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Build itemNewId → { category, stock, costPrice } from catalog_product business_records
    const catalogRecords = await prisma.businessRecord.findMany({
      where: { companyId, category: "catalog_product" },
      select: { data: true },
    });
    const categoryMap = new Map<string, string>();
    const catalogStockMap = new Map<string, number>();
    for (const rec of catalogRecords) {
      const d = rec.data as any;
      if (d?.itemNewId) {
        if (d.category) categoryMap.set(d.itemNewId, d.category);
        if (d.stock != null) catalogStockMap.set(d.itemNewId, Number(d.stock) || 0);
      }
    }

    const rows = items
      .map(item => {
        let totalIn = 0;
        let totalOut = 0;
        let qtySoldInPeriod = 0;
        let lastSaleDate: string | undefined;

        for (const txn of item.inventoryTxns) {
          const q = Number(txn.qty || 0);
          if (q > 0) {
            totalIn += q;
          } else if (q < 0) {
            totalOut += Math.abs(q);
            // Check if this sale is within the analysis period
            const txnDate = txn.date ? new Date(txn.date) : null;
            if (txnDate && txnDate >= periodStart) {
              qtySoldInPeriod += Math.abs(q);
              const iso = txnDate.toISOString().slice(0, 10);
              if (!lastSaleDate || iso > lastSaleDate) lastSaleDate = iso;
            }
          }
        }

        // Fall back to catalog_product data.stock for items with no purchase txns recorded
        const txnStock = totalIn - totalOut;
        const stockQty = totalIn === 0 ? (catalogStockMap.get(item.id) ?? 0) : txnStock;

        // Turnover days: how many days to sell current stock at current rate
        // avgDailySales = qtySoldInPeriod / days
        // turnoverDays = stockQty / avgDailySales = stockQty * days / qtySoldInPeriod
        let turnoverDays = 0;
        if (qtySoldInPeriod > 0 && stockQty > 0) {
          turnoverDays = Math.round((stockQty * days) / qtySoldInPeriod);
        }

        // Movement classification
        let movementTag: "fast" | "slow" | "dead";
        if (qtySoldInPeriod === 0) {
          movementTag = "dead";
        } else if (turnoverDays <= 30) {
          movementTag = "fast";
        } else {
          movementTag = "slow";
        }

        return {
          itemName:     item.name,
          category:     categoryMap.get(item.id) || "",
          qtySold:      qtySoldInPeriod,
          qtyPurchased: totalIn === 0 ? stockQty : totalIn,
          stockQty,
          turnoverDays,
          movementTag,
          lastSaleDate,
        };
      })
      // Only include items that have some activity or stock
      .filter(r => r.stockQty > 0 || r.qtySold > 0);

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("STOCK MOVEMENT ERROR:", e);
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
