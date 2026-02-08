﻿﻿﻿﻿﻿﻿﻿﻿﻿import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
import { logActivity } from "@/lib/audit";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  const items = await prisma.itemNew.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  if (format === "csv") {
    const header = ["code", "name", "unit", "rate", "minStock", "barcode", "description"].join(",");
    const rows = items.map((i) => [
      JSON.stringify(i.code || ""),
      JSON.stringify(i.name || ""),
      JSON.stringify(i.unit || ""),
      i.rate ?? "",
      i.minStock ?? "",
      JSON.stringify(i.barcode || ""),
      JSON.stringify(i.description || ""),
    ].join(","));
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=items.csv",
      },
    });
  }

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const userId = req.headers.get("x-user-id");
    const body = await req.json();

    if (!body.name || !body.unit) {
      return NextResponse.json({ error: "Name & Unit required" }, { status: 400 });
    }

    const lastItem = await prisma.itemNew.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    let nextNumber = 1;
    if (lastItem?.code?.includes("-")) {
      const n = parseInt(lastItem.code.split("-")[1]);
      if (!isNaN(n)) nextNumber = n + 1;
    }

    const item = await prisma.itemNew.create({
      data: {
        companyId,
        code: `I-${nextNumber}`,
        name: body.name,
        unit: body.unit,
        rate: Number(body.rate) || 0,
        minStock: Number(body.minStock) || 0,
        barcode: body.barcode ? String(body.barcode).trim() : null,
        description: body.description || "",
      },
    });

    await logActivity(prisma, {
      companyId,
      userId,
      action: "ITEM_CREATED",
      details: `Created item ${item.code} - ${item.name}`,
    });

    return NextResponse.json(item);
  } catch (e: any) {
    console.error("ITEMS-NEW POST ERROR:", e);
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Barcode or Code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Save failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const userId = req.headers.get("x-user-id");
    const body = await req.json();
    const { id, name, unit, rate, minStock, barcode, description } = body;

    if (!id || !name || !unit) {
      return NextResponse.json({ error: "ID, Name & Unit required" }, { status: 400 });
    }

    const updated = await prisma.itemNew.updateMany({
      where: { id, companyId },
      data: {
        name,
        unit,
        rate: Number(rate) || 0,
        minStock: Number(minStock) || 0,
        barcode: barcode ? String(barcode).trim() : null,
        description: description || "",
      },
    });
    if (!updated.count) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    const item = await prisma.itemNew.findUnique({ where: { id } });

    await logActivity(prisma, {
      companyId,
      userId,
      action: "ITEM_UPDATED",
      details: `Updated item ${id}`,
    });

    return NextResponse.json(item);
  } catch (e: any) {
    console.error("ITEMS-NEW PUT ERROR:", e);
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Barcode already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const userId = req.headers.get("x-user-id");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const usedInSales = await prisma.salesInvoiceItem.findFirst({ where: { itemId: id } });
    const usedInPurchase = await prisma.purchaseInvoiceItem.findFirst({ where: { itemId: id } });
    const usedInInventory = await prisma.inventoryTxn.findFirst({ where: { itemId: id } });

    if (usedInSales || usedInPurchase || usedInInventory) {
      return NextResponse.json({ error: "Cannot delete: Item is used in transactions" }, { status: 400 });
    }

    await prisma.itemNew.updateMany({
      where: { id, companyId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || null,
      },
    });

    await logActivity(prisma, {
      companyId,
      userId,
      action: "ITEM_DELETED",
      details: `Soft-deleted item ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("ITEMS-NEW DELETE ERROR:", e);
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: 500 });
  }
}
