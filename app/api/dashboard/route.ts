import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";



// ✅ Prisma singleton (dev safe)
const prisma =
  (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: Request) {
  try {
    // 🔐 ROLE CHECK
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ================= TOTAL SALES =================
    const sales = await prisma.salesInvoice.aggregate({
      _sum: { total: true }, // ✅ correct field
    });

    // ================= STOCK VALUE =================
    const items = await prisma.itemNew.findMany({
      include: { inventoryTxns: true },
    });

    type ItemWithTxns = Prisma.ItemNewGetPayload<{
  include: { inventoryTxns: true };
}>;


    let stockValue = 0;

items.forEach((item: ItemWithTxns) => {
  let qty = 0;
  let lastRate = 0;

  item.inventoryTxns.forEach((t) => {
    qty += t.qty;
    if (t.rate > 0) {
      lastRate = t.rate;
    }
  });

  stockValue += qty * lastRate;
});

    return NextResponse.json({
      totalSales: sales._sum.total || 0,
      stockValue: Math.round(stockValue),
    });

  } catch (e) {
    console.error("❌ DASHBOARD ERROR:", e);
    return NextResponse.json(
      { error: "Dashboard failed" },
      { status: 500 }
    );
  }
}
