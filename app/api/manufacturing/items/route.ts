/**
 * GET /api/manufacturing/items?category=RAW_MATERIAL|PACKAGING|FINISHED|TRADING|SERVICE
 * Several may be asked for at once: ?category=RAW_MATERIAL,TRADING
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
import { getStockOnHand, getAverageCosts, readOpenRemnants } from "@/lib/manufacturingPosting";
import { nextDocNo } from "@/lib/docNumber";

const WRITE_ROLES = new Set(["ADMIN", "ACCOUNTANT", "MANAGER"]);
const CATEGORIES = new Set(["RAW_MATERIAL", "PACKAGING", "FINISHED", "TRADING", "SERVICE"]);

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    // A BOM consumes bought-in parts (buttons, zips, fittings) as readily as
    // raw material, and those are usually filed as trading goods — so the
    // caller says which categories it wants rather than being held to one.
    const requested = String(searchParams.get("category") || "")
      .toUpperCase()
      .split(",")
      .map((c) => c.trim())
      .filter((c) => CATEGORIES.has(c));
    const categories = Array.from(new Set(requested));

    const items = await prisma.itemNew.findMany({
      where: { companyId, deletedAt: null, ...(categories.length ? { category: { in: categories } } : {}) },
      select: {
        id: true, code: true, name: true, unit: true, category: true,
        purchaseRate: true, rate: true, minStock: true,
      },
      orderBy: { name: "asc" },
    });

    const ids = items.map((i) => i.id);
    const [stock, costs, remnants] = await Promise.all([
      getStockOnHand(prisma, companyId, ids),
      getAverageCosts(prisma, companyId, ids),
      readOpenRemnants(prisma, companyId, ids),
    ]);

    return NextResponse.json(
      items.map((item) => {
        const currentStock = stock.get(item.id) ?? 0;
        const unitCost = costs.get(item.id) ?? item.purchaseRate;
        // Part-used pieces are real material a small order can run on, so the
        // screen has to show them next to the whole units on the rack.
        const pieces = remnants.get(item.id) ?? [];
        const openRemnant = Math.round(pieces.reduce((sum, r) => sum + r.qty, 0) * 1e6) / 1e6;
        return {
          ...item,
          currentStock,
          unitCost,
          openRemnant,
          openRemnantValue: Math.round(pieces.reduce((sum, r) => sum + r.qty * r.unitCost, 0) * 100) / 100,
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
    const prefix =
      category === "FINISHED" ? "FG"
      : category === "RAW_MATERIAL" ? "RM"
      : category === "PACKAGING" ? "PK"
      : "IT";
    // One past the highest issued, not a row count — see lib/docNumber.ts.
    const issued = await prisma.itemNew.findMany({
      where: { companyId, category },
      select: { code: true },
    });
    const code = String(body?.code || "").trim() || nextDocNo(issued, "code", `${prefix}-`, 1);

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
