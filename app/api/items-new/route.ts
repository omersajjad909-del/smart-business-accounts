﻿﻿import { NextResponse, NextRequest } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
import { logActivity } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { sanitizeLineMeta } from "@/lib/rateFormula";

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    // The document pickers need to show what is actually on the floor —
    // received, sold and what is left — the way the old sale-billing screen
    // did. Off by default: every other caller only wants the catalogue.
    const withStock = searchParams.get("withStock") === "1";

    const items = await prisma.itemNew.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: "asc" },
    });

    if (withStock && format !== "csv") {
      // Sales are written as negative quantities and purchases as positive
      // (see the SALE / SALE_RETURN writers in /api/sales-invoice), so the two
      // directions have to be summed separately to report them separately.
      const [received, issued] = await Promise.all([
        prisma.inventoryTxn.groupBy({
          by: ["itemId"],
          where: { companyId, qty: { gt: 0 } },
          _sum: { qty: true },
        }),
        prisma.inventoryTxn.groupBy({
          by: ["itemId"],
          where: { companyId, qty: { lt: 0 } },
          _sum: { qty: true },
        }),
      ]);

      const inMap = new Map<string, number>();
      for (const r of received) inMap.set(r.itemId, r._sum.qty ?? 0);
      const outMap = new Map<string, number>();
      for (const r of issued) outMap.set(r.itemId, Math.abs(r._sum.qty ?? 0));

      return NextResponse.json(
        items.map((i) => {
          const stockIn = inMap.get(i.id) ?? 0;
          const stockOut = outMap.get(i.id) ?? 0;
          return { ...i, stockIn, stockOut, stockBal: stockIn - stockOut };
        })
      );
    }

    if (format === "csv") {
      const header = ["code","name","category","unit","rate","purchaseRate","taxRate","minStock","barcode","description"].join(",");
      const rows = items.map((i) => [
        JSON.stringify(i.code || ""),
        JSON.stringify(i.name || ""),
        JSON.stringify(i.category || "TRADING"),
        JSON.stringify(i.unit || ""),
        i.rate ?? "",
        i.purchaseRate ?? "",
        i.taxRate ?? "",
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
  } catch (error: any) {
    console.error("ITEMS-NEW GET ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
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
        // Upper-cased here as well as in the form, so a name arriving from
        // the CSV import or the API lands the same way one typed by hand does.
        name: String(body.name).toUpperCase(),
        category: body.category || "TRADING",
        unit: body.unit,
        rate: Number(body.rate) || 0,
        purchaseRate: Number(body.purchaseRate) || 0,
        taxRate: Number(body.taxRate) || 0,
        minStock: Number(body.minStock) || 0,
        barcode: body.barcode ? String(body.barcode).trim() : null,
        description: body.description || "",
        imageUrl: body.imageUrl || null,
        // The item's usual rate-formula dimensions, if the company runs one.
        meta: sanitizeLineMeta(body.meta),
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
      return NextResponse.json(
        { error: "This barcode is already used by another item in your company" },
        { status: 400 },
      );
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
    const { id, name, category, unit, rate, purchaseRate, taxRate, minStock, barcode, description, imageUrl, meta } = body;

    if (!id || !name || !unit) {
      return NextResponse.json({ error: "ID, Name & Unit required" }, { status: 400 });
    }

    const updated = await prisma.itemNew.updateMany({
      where: { id, companyId },
      data: {
        name: String(name).toUpperCase(),
        category: category || "TRADING",
        unit,
        rate: Number(rate) || 0,
        purchaseRate: Number(purchaseRate) || 0,
        taxRate: Number(taxRate) || 0,
        minStock: Number(minStock) || 0,
        barcode: barcode ? String(barcode).trim() : null,
        description: description || "",
        imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
        // Undefined leaves the column as it was, which is what a company with
        // no rate formula sends and what an older client would send too.
        meta: meta === undefined ? undefined : (sanitizeLineMeta(meta) ?? Prisma.DbNull),
      },
    });

    // If not found in ItemNew, try catalog product (BusinessRecord)
    if (!updated.count) {
      const record = await prisma.businessRecord.findFirst({
        where: { id, companyId, category: "catalog_product" },
      });
      if (!record) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      const d = (record.data || {}) as Record<string, unknown>;
      const updatedRecord = await prisma.businessRecord.update({
        where: { id },
        data: {
          title: name,
          amount: Number(rate) || 0,
          data: {
            ...d,
            costPrice: Number(purchaseRate) || 0,
            description: description || d.description || "",
          },
        },
      });
      const ud = updatedRecord.data as Record<string, unknown>;
      return NextResponse.json({
        id: updatedRecord.id, name: updatedRecord.title,
        rate: updatedRecord.amount, purchaseRate: Number(ud?.costPrice || 0),
        unit: "PCS", barcode: (ud?.barcode as string) || null,
        category: "TRADING", taxRate: 0, minStock: 0,
      });
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
