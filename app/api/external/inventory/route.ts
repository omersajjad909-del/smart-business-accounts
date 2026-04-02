/**
 * GET /api/external/inventory           — all items with current stock levels
 * GET /api/external/inventory?id=<id>   — single item with full stock detail
 * GET /api/external/inventory?low=1     — only low-stock items
 *
 * Auth: x-api-key or Authorization: Bearer <key>
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveApiSession, unauthResponse, enforceApiPlan } from "../_auth";

type InventoryTxnSummary = {
  date: Date;
  type: string;
  qty: number;
};

type ItemResponse = {
  id: string;
  name: string;
  code: string | null;
  unit: string | null;
  salePrice: number;
  costPrice: number;
  minStock: number;
  currentStock: number;
  isLowStock: boolean;
};

export async function GET(req: NextRequest) {
  const session = await resolveApiSession(req);
  if (!session) return unauthResponse();

  const blocked = enforceApiPlan(session, "GET");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const id      = searchParams.get("id");
  const lowOnly = searchParams.get("low") === "1";

  // ── Single item ─────────────────────────────────────────────────────
  if (id) {
    const item = await prisma.itemNew.findFirst({
      where: { id, companyId: session.companyId, deletedAt: null },
    }).catch(() => null);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const txns = await prisma.inventoryTxn.findMany({
      where: { itemId: id, companyId: session.companyId },
      orderBy: { date: "desc" },
      take: 50,
    });

    const totalQty = txns.reduce((s: number, t) => s + Number(t.qty), 0);

    return NextResponse.json({
      id:          item.id,
      name:        item.name,
      code:        item.code ?? null,
      unit:        item.unit ?? null,
      salePrice:   item.rate,
      costPrice:   item.rate,
      minStock:    item.minStock,
      currentStock:totalQty,
      isLowStock:  totalQty < Number(item.minStock ?? 0),
      recentTxns:  txns.map((t: InventoryTxnSummary) => ({
        date:   t.date,
        type:   t.type,
        qty:    t.qty,
      })),
    });
  }

  // ── All items ───────────────────────────────────────────────────────
  const items = await prisma.itemNew.findMany({
    where: { companyId: session.companyId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  const stockAgg = await prisma.inventoryTxn.groupBy({
    by: ["itemId"],
    where: { companyId: session.companyId },
    _sum: { qty: true },
  });

  const qtyMap = new Map<string, number>();
  stockAgg.forEach((row) => qtyMap.set(row.itemId, Number(row._sum.qty ?? 0)));

  let result: ItemResponse[] = items.map((item) => {
    const currentStock = qtyMap.get(item.id) ?? 0;
    return {
      id:           item.id,
      name:         item.name,
      code:         item.code ?? null,
      unit:         item.unit ?? null,
      salePrice:    item.rate,
      costPrice:    item.rate,
      minStock:     item.minStock,
      currentStock,
      isLowStock:   currentStock < Number(item.minStock ?? 0),
    };
  });

  if (lowOnly) {
    result = result.filter((i) => i.isLowStock);
  }

  return NextResponse.json({
    total:       result.length,
    lowStockCount: result.filter((i) => i.isLowStock).length,
    items:       result,
  });
}
