import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import { resolveCompanyId } from "@/lib/tenant";

function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Can't reach database server");
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    type ItemWithTxns = Prisma.ItemNewGetPayload<{
      include: { inventoryTxns: true };
    }>;

    const items = await prisma.itemNew.findMany({
      where: { companyId },
      include: { inventoryTxns: { where: { companyId } } },
    });

    const stock = items.map((item: ItemWithTxns) => ({
      itemId: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      rate: item.rate,
      minStock: item.minStock,
      barcode: item.barcode || "",
      qty: item.inventoryTxns.reduce((s, t) => s + t.qty, 0),
    }));

    return NextResponse.json(stock);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      console.error("[api/inventory] Database unavailable, returning empty inventory fallback.", error);
      return NextResponse.json([], {
        headers: { "x-finova-degraded": "inventory-db-unavailable" },
      });
    }

    console.error("[api/inventory] Failed to load inventory.", error);
    return NextResponse.json({ error: "Failed to load inventory" }, { status: 500 });
  }
}

