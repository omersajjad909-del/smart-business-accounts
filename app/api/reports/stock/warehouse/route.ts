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
        id: true, name: true, purchaseRate: true, minStock: true,
        inventoryTxns: {
          where: { companyId },
          select: { qty: true, rate: true, location: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const catalogRecs = await prisma.businessRecord.findMany({
      where: { companyId, category: "catalog_product" },
      select: { data: true },
    });
    const catMap = new Map<string, string>();
    for (const r of catalogRecs) {
      const d = r.data as any;
      if (d?.itemNewId && d?.category) catMap.set(d.itemNewId, d.category);
    }

    // Aggregate by location × item
    type LocKey = string;
    const locationItemMap = new Map<LocKey, { qty: number; value: number; reorderLevel: number; itemName: string; category: string; warehouseName: string }>();
    const warehouseTotals = new Map<string, { totalItems: Set<string>; totalValue: number; lowStockCount: Set<string> }>();

    for (const item of items) {
      const perLocation = new Map<string, { qty: number; totalAmt: number }>();

      for (const t of item.inventoryTxns) {
        const loc = t.location || "MAIN";
        const q = Number(t.qty);
        const r = Number(t.rate);
        if (!perLocation.has(loc)) perLocation.set(loc, { qty: 0, totalAmt: 0 });
        const entry = perLocation.get(loc)!;
        if (q > 0) { entry.qty += q; entry.totalAmt += q * r; }
        else { entry.qty -= Math.abs(q); }
      }

      for (const [loc, data] of perLocation.entries()) {
        if (data.qty <= 0) continue;
        const avgRate = data.qty > 0 && data.totalAmt > 0 ? data.totalAmt / (data.qty + Math.max(0, data.qty)) : Number(item.purchaseRate) || 0;
        const value = Math.round(data.qty * (Number(item.purchaseRate) || 0));
        const key = `${loc}::${item.id}`;
        locationItemMap.set(key, {
          warehouseName: loc,
          itemName: item.name,
          category: catMap.get(item.id) || "",
          qty: data.qty,
          value,
          reorderLevel: item.minStock || 0,
        });

        if (!warehouseTotals.has(loc)) warehouseTotals.set(loc, { totalItems: new Set(), totalValue: 0, lowStockCount: new Set() });
        const wt = warehouseTotals.get(loc)!;
        wt.totalItems.add(item.id);
        wt.totalValue += value;
        if (data.qty <= (item.minStock || 0)) wt.lowStockCount.add(item.id);
      }
    }

    const rows = Array.from(locationItemMap.values()).sort((a, b) => a.warehouseName.localeCompare(b.warehouseName) || a.itemName.localeCompare(b.itemName));

    const warehouses = Array.from(warehouseTotals.entries()).map(([name, wt]) => ({
      name,
      totalItems:    wt.totalItems.size,
      totalValue:    Math.round(wt.totalValue),
      lowStockCount: wt.lowStockCount.size,
    }));

    return NextResponse.json({ rows, warehouses });
  } catch (e) {
    console.error("WAREHOUSE STOCK ERROR:", e);
    return NextResponse.json({ rows: [], warehouses: [] }, { status: 500 });
  }
}
