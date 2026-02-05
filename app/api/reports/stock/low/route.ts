import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

type ItemWithInventory = Prisma.ItemNewGetPayload<{
  select: {
    id: true;
    name: true;
    unit: true;
    minStock: true;
    description: true;
    inventoryTxns: {
      select: {
        qty: true;
      };
    };
  };
}>;

type LowStockItem = {
  itemId: string;
  itemName: string;
  description: string;
  unit: string;
  stockQty: number;
  minStock: number | null;
};



const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const items = await prisma.itemNew.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        unit: true,
        minStock: true,
        description: true,
        inventoryTxns: {
          where: { companyId },
          select: { qty: true }
        }
      },
    });

const result: LowStockItem[] = items
  .map((i: ItemWithInventory): LowStockItem => {
    const stockQty = i.inventoryTxns.reduce(
      (sum: number, t: { qty: number }) => sum + Number(t.qty || 0),
      0
    );

    return {
      itemId: i.id,
      itemName: i.name,
      description: i.description || "",
      unit: i.unit,
      stockQty,
      minStock: i.minStock,
    };
  })
  .filter((i: LowStockItem) => i.stockQty <= (i.minStock ?? 0))
  .sort((a: LowStockItem, b: LowStockItem) => a.stockQty - b.stockQty);

    return NextResponse.json(result);
  } catch (e) {
    console.error("LOW STOCK ERROR:", e);
    return NextResponse.json([], { status: 500 });
  }
}
