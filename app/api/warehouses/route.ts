import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

const WH_CATEGORY = "warehouse";
const TX_CATEGORY = "stock_transfer";

// GET /api/warehouses?includeTransfers=true
export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const includeTransfers = searchParams.get("includeTransfers") === "true";
    const status           = searchParams.get("status"); // ACTIVE | INACTIVE

    const where: Record<string, unknown> = { companyId, category: WH_CATEGORY };
    if (status) where.status = status;

    const [whRecords, txRecords] = await Promise.all([
      prisma.businessRecord.findMany({
        where,
        orderBy: { createdAt: "asc" },
      }),
      includeTransfers
        ? prisma.businessRecord.findMany({
            where: { companyId, category: TX_CATEGORY },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
    ]);

    const warehouses = whRecords.map(r => {
      const d = r.data as Record<string, unknown>;
      return {
        id:            r.id,
        name:          r.title,
        location:      (d.location      as string) || "",
        address:       (d.address       as string) || "",
        capacity:      Number(d.capacity)      || 0,
        capacityUsed:  Number(d.capacityUsed)  || 0,
        itemsCount:    Number(d.itemsCount)    || 0,
        stockValue:    r.amount                || 0,
        status:        r.status                || "ACTIVE",
        notes:         (d.notes         as string) || "",
        createdAt:     r.createdAt,
      };
    });

    const transfers = txRecords.map(r => {
      const d = r.data as Record<string, unknown>;
      return {
        id:     r.id,
        title:  r.title,
        from:   (d.from   as string) || "",
        to:     (d.to     as string) || "",
        fromId: (d.fromId as string) || "",
        toId:   (d.toId   as string) || "",
        item:   (d.item   as string) || "",
        qty:    Number(d.qty)        || 0,
        notes:  (d.notes  as string) || "",
        status: r.status             || "COMPLETED",
        date:   r.date               || r.createdAt,
      };
    });

    const summary = {
      total:      warehouses.length,
      active:     warehouses.filter(w => w.status === "ACTIVE").length,
      inactive:   warehouses.filter(w => w.status === "INACTIVE").length,
      stockValue: warehouses.reduce((s, w) => s + w.stockValue, 0),
      totalSkus:  warehouses.reduce((s, w) => s + w.itemsCount, 0),
    };

    return NextResponse.json({ warehouses, transfers, summary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/warehouses — create warehouse OR stock transfer
// Body: { type: "warehouse"|"transfer", ...fields }
export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const { type = "warehouse" } = body;

    if (type === "transfer") {
      const { fromId, toId, fromName, toName, item, qty, notes } = body;
      if (!fromId || !toId) return NextResponse.json({ error: "fromId and toId required" }, { status: 400 });
      if (fromId === toId)  return NextResponse.json({ error: "Source and destination must differ" }, { status: 400 });
      if (!item?.trim())    return NextResponse.json({ error: "item required" }, { status: 400 });
      if (!qty || Number(qty) <= 0) return NextResponse.json({ error: "qty must be > 0" }, { status: 400 });

      const record = await prisma.businessRecord.create({
        data: {
          companyId,
          category: TX_CATEGORY,
          title:    `Transfer: ${item.trim()} (${qty}) — ${fromName || fromId} → ${toName || toId}`,
          status:   "COMPLETED",
          data: { fromId, toId, from: fromName || fromId, to: toName || toId, item: item.trim(), qty: Number(qty), notes: notes || "" },
          date:     new Date(),
        },
      });
      return NextResponse.json({ success: true, transfer: record }, { status: 201 });
    }

    // Create warehouse
    const { name, location, address, capacity, notes } = body;
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const record = await prisma.businessRecord.create({
      data: {
        companyId,
        category: WH_CATEGORY,
        title:    name.trim(),
        status:   "ACTIVE",
        amount:   0,
        data: {
          location:     location?.trim()  || "",
          address:      address?.trim()   || "",
          capacity:     Number(capacity)  || 0,
          capacityUsed: 0,
          itemsCount:   0,
          notes:        notes?.trim()     || "",
        },
      },
    });

    return NextResponse.json({ success: true, warehouse: record }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/warehouses — update warehouse (status, stock value, capacity, etc.)
// Body: { id, ...fields }
export async function PATCH(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { id, status, stockValue, itemsCount, capacityUsed, name, location, address, capacity, notes } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.businessRecord.findFirst({
      where: { id, companyId, category: WH_CATEGORY },
    });
    if (!existing) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

    const currentData = (existing.data as Record<string, unknown>) || {};

    const record = await prisma.businessRecord.update({
      where: { id },
      data: {
        ...(status    !== undefined && { status }),
        ...(name      !== undefined && { title: name.trim() }),
        ...(stockValue !== undefined && { amount: Number(stockValue) }),
        data: {
          ...currentData,
          ...(location     !== undefined && { location: location.trim() }),
          ...(address      !== undefined && { address: address.trim() }),
          ...(capacity     !== undefined && { capacity: Number(capacity) }),
          ...(capacityUsed !== undefined && { capacityUsed: Number(capacityUsed) }),
          ...(itemsCount   !== undefined && { itemsCount: Number(itemsCount) }),
          ...(notes        !== undefined && { notes: notes.trim() }),
        },
      },
    });

    return NextResponse.json({ success: true, warehouse: record });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/warehouses?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.businessRecord.findFirst({
      where: { id, companyId, category: WH_CATEGORY },
    });
    if (!existing) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

    await prisma.businessRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
