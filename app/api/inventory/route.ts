import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";


const prisma =
  (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: Request) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  type ItemWithTxns = Prisma.ItemNewGetPayload<{
  include: { inventoryTxns: true };
}>;

  const items = await prisma.itemNew.findMany({
    include: { inventoryTxns: true },
  });

  const stock = items.map((item: ItemWithTxns) => ({
  itemId: item.id,
  name: item.name,
  qty: item.inventoryTxns.reduce((s, t) => s + t.qty, 0),
}));


  return NextResponse.json(stock);
}
