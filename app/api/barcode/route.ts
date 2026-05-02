import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// GET /api/barcode?barcode=xxx  — lookup by barcode or code
// GET /api/barcode               — list all items (ItemNew + catalog products)
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get("barcode");
    const code    = searchParams.get("code");

    if (barcode || code) {
      // 1. Try ItemNew first
      const item = await prisma.itemNew.findFirst({
        where: { companyId, deletedAt: null, ...(barcode ? { barcode } : { code: code! }) },
        select: {
          id: true, name: true, code: true, barcode: true,
          unit: true, rate: true, description: true,
          inventoryTxns: { select: { qty: true, type: true } },
        },
      });
      if (item) {
        const stockQty = item.inventoryTxns.reduce((sum, txn) => {
          const qty = Number(txn.qty || 0);
          return txn.type === "SALE" ? sum - qty : sum + qty;
        }, 0);
        const { inventoryTxns: _t, ...itemData } = item;
        return NextResponse.json({ ...itemData, stockQty, salePrice: item.rate });
      }

      // 2. Try catalog products (BusinessRecord)
      const records = await prisma.businessRecord.findMany({
        where: { companyId, category: "catalog_product", deletedAt: null },
      });
      const match = records.find(r => {
        const d = r.data as Record<string, unknown>;
        return (barcode && d?.barcode === barcode) ||
               (code    && d?.sku    === code);
      });
      if (match) {
        const d = match.data as Record<string, unknown>;
        return NextResponse.json({
          id: match.id, name: match.title,
          code: (d?.sku as string) || null,
          barcode: (d?.barcode as string) || null,
          unit: "PCS", rate: match.amount || 0,
          purchaseRate: Number(d?.costPrice || 0),
          description: (d?.description as string) || null,
          stockQty: Number(d?.stock || 0),
          salePrice: match.amount || 0,
          _source: "catalog",
        });
      }

      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // ── List all items ──────────────────────────────────────────────────────
    const [itemNewList, catalogRecords] = await Promise.all([
      prisma.itemNew.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, barcode: true, unit: true, rate: true, description: true },
      }),
      prisma.businessRecord.findMany({
        where: { companyId, category: "catalog_product", deletedAt: null },
        orderBy: { title: "asc" },
      }),
    ]);

    // Catalog products whose itemNewId is already in ItemNew → skip (avoid duplicates)
    const itemNewIds = new Set(itemNewList.map(i => i.id));
    const catalogOnly = catalogRecords.filter(r => {
      const itemNewId = (r.data as Record<string, unknown>)?.itemNewId as string | undefined;
      return !itemNewId || !itemNewIds.has(itemNewId);
    });

    const catalogItems = catalogOnly.map(r => {
      const d = r.data as Record<string, unknown>;
      return {
        id: r.id,
        name: r.title,
        code: (d?.sku as string) || null,
        barcode: (d?.barcode as string) || null,
        unit: "PCS",
        rate: r.amount || 0,
        description: (d?.description as string) || null,
        salePrice: r.amount || 0,
        _source: "catalog",
      };
    });

    const allItems = [
      ...itemNewList.map(i => ({ ...i, salePrice: i.rate })),
      ...catalogItems,
    ].sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      items: allItems,
      withBarcode:    allItems.filter(i => i.barcode).length,
      withoutBarcode: allItems.filter(i => !i.barcode).length,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}

// POST /api/barcode — assign or auto-generate barcode
// Body: { itemId, barcode? }
export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { itemId, barcode: providedBarcode } = await req.json();
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const finalBarcode = (providedBarcode || "").toString().trim() ||
      "2" + String(Date.now()).slice(-9) + String(Math.floor(Math.random() * 10));

    // 1. Try ItemNew
    const item = await prisma.itemNew.findFirst({ where: { id: itemId, companyId, deletedAt: null } });
    if (item) {
      const conflict = await prisma.itemNew.findFirst({ where: { barcode: finalBarcode, NOT: { id: itemId } } });
      if (conflict) return NextResponse.json({ error: "Barcode already used by another item" }, { status: 409 });
      const updated = await prisma.itemNew.update({
        where: { id: itemId },
        data: { barcode: finalBarcode },
        select: { id: true, name: true, code: true, barcode: true, unit: true, rate: true },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    // 2. Try catalog product (BusinessRecord)
    const record = await prisma.businessRecord.findFirst({
      where: { id: itemId, companyId, category: "catalog_product", deletedAt: null },
    });
    if (!record) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const d = (record.data || {}) as Record<string, unknown>;
    const updated = await prisma.businessRecord.update({
      where: { id: itemId },
      data: { data: { ...d, barcode: finalBarcode } },
    });
    const ud = updated.data as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      item: {
        id: updated.id, name: updated.title,
        code: (ud?.sku as string) || null,
        barcode: (ud?.barcode as string) || null,
        unit: "PCS", rate: updated.amount || 0,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}

// DELETE /api/barcode?itemId=xxx — remove barcode
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const itemId = new URL(req.url).searchParams.get("itemId");
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    // Try ItemNew
    const item = await prisma.itemNew.findFirst({ where: { id: itemId, companyId, deletedAt: null } });
    if (item) {
      await prisma.itemNew.update({ where: { id: itemId }, data: { barcode: null } });
      return NextResponse.json({ success: true });
    }

    // Try catalog product
    const record = await prisma.businessRecord.findFirst({
      where: { id: itemId, companyId, category: "catalog_product", deletedAt: null },
    });
    if (!record) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    const d = (record.data || {}) as Record<string, unknown>;
    await prisma.businessRecord.update({ where: { id: itemId }, data: { data: { ...d, barcode: null } } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
