import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";


const prisma =
  (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  name: item.name,
  qty: item.inventoryTxns.reduce((s, t) => s + t.qty, 0),
}));


  return NextResponse.json(stock);
}
