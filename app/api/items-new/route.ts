import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma =
  (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET() {
  const items = await prisma.itemNew.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.name || !body.unit) {
      return NextResponse.json(
        { error: "Name & Unit required" },
        { status: 400 }
      );
    }

    const lastItem = await prisma.itemNew.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let nextNumber = 1;
    if (lastItem?.code?.includes("-")) {
      const n = parseInt(lastItem.code.split("-")[1]);
      if (!isNaN(n)) nextNumber = n + 1;
    }

    const item = await prisma.itemNew.create({
      data: {
        code: `I-${nextNumber}`,
        name: body.name,
        unit: body.unit,
        rate: Number(body.rate) || 0,
        minStock: Number(body.minStock) || 0,
        barcode: body.barcode ? String(body.barcode).trim() : null,
        description: body.description || "",
      },
    });

    return NextResponse.json(item);
  } catch (e: any) {
    console.error("❌ ITEMS-NEW POST ERROR:", e);
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "Barcode or Code already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: e.message || "Save failed" },
      { status: 500 }
    );
  }
}

/* ================= PUT (EDIT) ================= */
export async function PUT(req: Request) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, name, unit, rate, minStock, barcode, description } = body;

    if (!id || !name || !unit) {
      return NextResponse.json(
        { error: "ID, Name & Unit required" },
        { status: 400 }
      );
    }

    const item = await prisma.itemNew.update({
      where: { id },
      data: {
        name,
        unit,
        rate: Number(rate) || 0,
        minStock: Number(minStock) || 0,
        barcode: barcode ? String(barcode).trim() : null,
        description: description || "",
      },
    });

    return NextResponse.json(item);
  } catch (e: any) {
    console.error("❌ ITEMS-NEW PUT ERROR:", e);
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "Barcode already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: e.message || "Update failed" },
      { status: 500 }
    );
  }
}

/* ================= DELETE ================= */
export async function DELETE(req: Request) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID required" },
        { status: 400 }
      );
    }

    // Check if item is used in any invoices/transactions
    const usedInSales = await prisma.salesInvoiceItem.findFirst({
      where: { itemId: id },
    });
    const usedInPurchase = await prisma.purchaseInvoiceItem.findFirst({
      where: { itemId: id },
    });
    const usedInInventory = await prisma.inventoryTxn.findFirst({
      where: { itemId: id },
    });

    if (usedInSales || usedInPurchase || usedInInventory) {
      return NextResponse.json(
        { error: "Cannot delete: Item is used in transactions" },
        { status: 400 }
      );
    }

    await prisma.itemNew.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("❌ ITEMS-NEW DELETE ERROR:", e);
    return NextResponse.json(
      { error: e.message || "Delete failed" },
      { status: 500 }
    );
  }
}