import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

type StockAggRow = {
  itemId: string;
  _sum: { qty: number | null };
};

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const txns = await prisma.inventoryTxn.groupBy({
      by: ["itemId"],
      where: { companyId },
      _sum: { qty: true },
    });

    // Only items with qty > 0
    const inStock = txns.filter((t: StockAggRow) => (t._sum.qty ?? 0) > 0);

    if (!inStock.length) return NextResponse.json([]);

    const items = await prisma.itemNew.findMany({
      where: {
        companyId,
        id: { in: inStock.map((t: StockAggRow) => t.itemId) },
      },
      select: {
        id: true,
        name: true,
        description: true,
        barcode: true,
        rate: true,
      },
    });

    const stockMap = new Map<string, number>();
    inStock.forEach((t: StockAggRow) => stockMap.set(t.itemId, t._sum.qty ?? 0));

    return NextResponse.json(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        barcode: i.barcode,
        salePrice: i.rate ?? 0,
        availableQty: stockMap.get(i.id) ?? 0,
      }))
    );

  } catch (e) {
    console.error(e);
    return NextResponse.json([], { status: 500 });
  }
}
