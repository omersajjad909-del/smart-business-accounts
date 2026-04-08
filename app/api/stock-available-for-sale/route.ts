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

    // Get all items for this company (regardless of stock level)
    const items = await prisma.itemNew.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        description: true,
        barcode: true,
        salePrice: true,
        rate: true,
      },
    });

    if (!items.length) return NextResponse.json([]);

    // Get current stock quantities
    const txns = await prisma.inventoryTxn.groupBy({
      by: ["itemId"],
      where: { companyId },
      _sum: { qty: true },
    });

    const stockMap = new Map<string, number>();
    txns.forEach((t: StockAggRow) => {
      stockMap.set(t.itemId, t._sum.qty ?? 0);
    });

    return NextResponse.json(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        barcode: i.barcode,
        salePrice: i.salePrice ?? i.rate ?? 0,
        availableQty: stockMap.get(i.id) ?? 0,
      }))
    );

  } catch (e) {
    console.error(e);
    return NextResponse.json([], { status: 500 });
  }
}
