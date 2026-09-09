/**
 * GET  /api/manufacturing/wastage — leftover raw material written off as scrap.
 * POST /api/manufacturing/wastage — record a wastage entry, in the item's own
 * unit (kg, meters, pcs…), and drop stock immediately.
 *
 * Posted as an InventoryTxn like every other stock movement — type "WASTAGE",
 * negative qty — so it shows up in the same stock-on-hand and average-cost
 * numbers the rest of manufacturing reads, instead of a second, disconnected
 * ledger nobody else's reports know about.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { getStockOnHand, getAverageCosts } from "@/lib/manufacturingPosting";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const rows = await prisma.inventoryTxn.findMany({
      where: { companyId, type: "WASTAGE" },
      include: { item: { select: { name: true, code: true, unit: true, category: true } } },
      orderBy: { date: "desc" },
      take: 500,
    });

    return NextResponse.json(
      rows.map((r) => {
        const meta = (r.meta as Record<string, unknown> | null) || {};
        return {
          id: r.id,
          date: r.date.toISOString().slice(0, 10),
          itemId: r.itemId,
          itemName: r.item.name,
          itemCode: r.item.code,
          unit: r.item.unit,
          qty: Math.abs(r.qty),
          valueLost: Math.abs(r.amount),
          reason: String(meta.reason || "Other"),
          notes: String(meta.notes || ""),
          productionOrderId: meta.productionOrderId ? String(meta.productionOrderId) : "",
        };
      }),
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load wastage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (!WRITE_ROLES.has(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const itemId = String(body?.itemId || "").trim();
    const qty = Number(body?.qty);
    if (!itemId) return NextResponse.json({ error: "Item is required" }, { status: 400 });
    if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ error: "Quantity must be greater than zero" }, { status: 400 });

    const item = await prisma.itemNew.findFirst({ where: { id: itemId, companyId, deletedAt: null } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const [stock, costs] = await Promise.all([
      getStockOnHand(prisma, companyId, [itemId]),
      getAverageCosts(prisma, companyId, [itemId]),
    ]);
    const currentStock = stock.get(itemId) ?? 0;
    if (qty > currentStock) {
      return NextResponse.json({ error: `Only ${currentStock} ${item.unit} in stock — cannot waste more than that.` }, { status: 400 });
    }
    const unitCost = costs.get(itemId) ?? item.purchaseRate;

    const reason = String(body?.reason || "Other").trim() || "Other";
    const notes = String(body?.notes || "").trim();
    const productionOrderId = String(body?.productionOrderId || "").trim();

    const txn = await prisma.inventoryTxn.create({
      data: {
        companyId,
        type: "WASTAGE",
        date: body?.date ? new Date(body.date) : new Date(),
        itemId,
        qty: -qty,
        rate: unitCost,
        amount: -qty * unitCost,
        location: "MAIN",
        meta: { reason, notes, productionOrderId },
      },
    });

    return NextResponse.json({
      id: txn.id,
      itemId,
      itemName: item.name,
      unit: item.unit,
      qty,
      valueLost: Math.round(qty * unitCost * 100) / 100,
      remainingStock: currentStock - qty,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to record wastage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
