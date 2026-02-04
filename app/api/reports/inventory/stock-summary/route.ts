import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma } from "@prisma/client";

const prisma = (globalThis as any).prisma || new PrismaClient();
type ItemWithInventory = Prisma.ItemNewGetPayload<{
  include: {
    inventoryTxns: true;
  };

}>;

type InventoryTxn = Prisma.InventoryTxnGetPayload<Prisma.InventoryTxnDefaultArgs>;


if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    // 🔐 ROLE GUARD
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 📅 DATE PARAM
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const asOn = dateParam ? new Date(dateParam + "T23:59:59.999") : new Date();

    // 📦 ITEMS WITH INVENTORY (AS ON DATE)
    const items = await prisma.itemNew.findMany({
      include: {
        inventoryTxns: {
          where: {
            date: { lte: asOn },
          },
        },
      },
      orderBy: { name: "asc" },
    });
const rows = items.map((i: ItemWithInventory) => {
  const stockQty = i.inventoryTxns.reduce(
    (sum: number, t: InventoryTxn) => {
      const qty = Number(t.qty || 0);
      return t.type === "INWARD" ? sum + qty : sum - qty;
    },
    0
  );

  return {
    itemId: i.id,
    name: i.name,
    stockQty,
  };
});


    return NextResponse.json(rows);
  } catch (e) {
    console.error("❌ STOCK SUMMARY ERROR:", e);
    return NextResponse.json([], { status: 500 });
  }
}
