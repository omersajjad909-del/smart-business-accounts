import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// GET /api/barcode?barcode=xxx  — lookup item by barcode or code
// GET /api/barcode               — list all items with barcode info
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get("barcode");
    const code    = searchParams.get("code");

    if (barcode || code) {
      // Lookup single item
      const item = await prisma.itemNew.findFirst({
        where: {
          companyId,
          deletedAt: null,
          ...(barcode ? { barcode } : { code: code! }),
        },
        select: {
          id: true, name: true, code: true, barcode: true,
          unit: true, rate: true, description: true,
          inventoryTxns: { select: { qty: true, type: true } },
        },
      });
      if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      const stockQty = item.inventoryTxns.reduce((sum, txn) => {
        const qty = Number(txn.qty || 0);
        return txn.type === "SALE" ? sum - qty : sum + qty;
      }, 0);
      const { inventoryTxns: _inventoryTxns, ...itemData } = item;
      return NextResponse.json({ ...itemData, stockQty, salePrice: item.rate });
    }

    // List all items with barcode status
    const items = await prisma.itemNew.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, code: true, barcode: true,
        unit: true, rate: true, description: true,
      },
    });

    return NextResponse.json({
      items: items.map(i => ({ ...i, salePrice: i.rate })),
      withBarcode:    items.filter(i => i.barcode).length,
      withoutBarcode: items.filter(i => !i.barcode).length,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}

// POST /api/barcode — assign or auto-generate a barcode for an item
// Body: { itemId, barcode? }  — if barcode omitted, auto-generates one
export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { itemId, barcode: providedBarcode } = await req.json();
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    // Confirm item belongs to this company
    const item = await prisma.itemNew.findFirst({
      where: { id: itemId, companyId, deletedAt: null },
    });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    // Auto-generate if not provided: EAN-13 style prefix 200 + 10 digits
    const finalBarcode = (providedBarcode || "").toString().trim() ||
      "2" + String(Date.now()).slice(-9) + String(Math.floor(Math.random() * 10));

    // Check uniqueness
    const conflict = await prisma.itemNew.findFirst({
      where: { barcode: finalBarcode, NOT: { id: itemId } },
    });
    if (conflict) {
      return NextResponse.json({ error: "Barcode already used by another item" }, { status: 409 });
    }

    const updated = await prisma.itemNew.update({
      where: { id: itemId },
      data:  { barcode: finalBarcode },
      select: { id: true, name: true, code: true, barcode: true, unit: true, rate: true },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}

// DELETE /api/barcode?itemId=xxx — remove barcode from an item
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const itemId = new URL(req.url).searchParams.get("itemId");
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const item = await prisma.itemNew.findFirst({ where: { id: itemId, companyId, deletedAt: null } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    await prisma.itemNew.update({ where: { id: itemId }, data: { barcode: null } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
