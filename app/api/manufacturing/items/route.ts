/**
 * GET /api/manufacturing/items?category=RAW_MATERIAL|FINISHED
 *
 * The real inventory a factory works with, with live stock and average cost.
 *
 * Manufacturing used to keep its own raw-material list in BusinessRecord, so a
 * sack of flour bought on a purchase invoice and a sack of flour on the
 * manufacturing screen were two unrelated rows and neither knew about the other.
 * These are ItemNew rows — the same items purchasing and sales use.
 *
 * POST creates one, so a factory can add a raw material without leaving the
 * manufacturing section.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { getStockOnHand, getAverageCosts } from "@/lib/manufacturingPosting";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);
const CATEGORIES = new Set(["RAW_MATERIAL", "FINISHED", "TRADING", "SERVICE"]);

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const requested = String(searchParams.get("category") || "").toUpperCase();
    const category = CATEGORIES.has(requested) ? requested : null;

    const items = await prisma.itemNew.findMany({
      where: { companyId, deletedAt: null, ...(category ? { category } : {}) },
      select: {
        id: true, code: true, name: true, unit: true, category: true,
        purchaseRate: true, rate: true, minStock: true,
      },
      orderBy: { name: "asc" },
    });

    const ids = items.map((i) => i.id);
    const [stock, costs] = await Promise.all([
      getStockOnHand(prisma, companyId, ids),
      getAverageCosts(prisma, companyId, ids),
    ]);

    return NextResponse.json(
      items.map((item) => {
        const currentStock = stock.get(item.id) ?? 0;
        const unitCost = costs.get(item.id) ?? item.purchaseRate;
        return {
          ...item,
          currentStock,
          unitCost,
          stockValue: currentStock * unitCost,
          isLow: currentStock <= item.minStock,
        };
      }),
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load items";
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
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const requested = String(body?.category || "RAW_MATERIAL").toUpperCase();
    const category = CATEGORIES.has(requested) ? requested : "RAW_MATERIAL";
    const unit = String(body?.unit || "pcs").trim() || "pcs";
    const purchaseRate = Number(body?.purchaseRate) || 0;

    // Codes only have to be unique enough to read in a dropdown; the id is the
    // key. Prefix by category so RM-3 and FG-3 never look like the same thing.
    const prefix = category === "FINISHED" ? "FG" : category === "RAW_MATERIAL" ? "RM" : "IT";
    const count = await prisma.itemNew.count({ where: { companyId, category } });
    const code = String(body?.code || "").trim() || `${prefix}-${count + 1}`;

    const item = await prisma.itemNew.create({
      data: {
        companyId,
        code,
        name,
        category,
        unit,
        purchaseRate,
        rate: Number(body?.rate) || 0,
        minStock: Number(body?.minStock) || 0,
      },
      select: { id: true, code: true, name: true, unit: true, category: true, purchaseRate: true, rate: true, minStock: true },
    });

    return NextResponse.json({ ...item, currentStock: 0, unitCost: item.purchaseRate, stockValue: 0, isLow: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
