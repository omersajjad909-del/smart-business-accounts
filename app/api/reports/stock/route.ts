import { NextResponse } from "next/server";
import { PrismaClient , Prisma} from "@prisma/client";
type ItemWithInventory = Prisma.ItemNewGetPayload<{
  select: {
    id: true;
    name: true;
    unit: true;
    description: true;
    inventoryTxns: {
      select: {
        qty: true;
        rate: true;
      };
    };
  };
}>;



const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: Request) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = await prisma.itemNew.findMany({
      select: {
        id: true,
        name: true,
        unit: true,
        description: true,
        inventoryTxns: {
          select: {
            qty: true,
            rate: true,
          }
        }
      },
      orderBy: { name: "asc" },
    });
const result = items.map((item: ItemWithInventory) => {
  let totalQty = 0;
  let calculatedValue = 0;

  item.inventoryTxns.forEach((t: { qty: number; rate: number }) => {
    totalQty += Number(t.qty || 0);
    calculatedValue += Number(t.qty || 0) * Number(t.rate || 0);
  });

  const finalValue = totalQty <= 0 ? 0 : Math.round(calculatedValue);

  return {
    itemId: item.id,
    itemName: item.name,
    unit: item.unit,
    description: item.description || "",
    stockQty: totalQty,
    stockValue: finalValue,
  };
});


    return NextResponse.json(result);
  } catch (e) {
    console.error("STOCK REPORT ERROR:", e);
    return NextResponse.json([], { status: 500 });
  }
}