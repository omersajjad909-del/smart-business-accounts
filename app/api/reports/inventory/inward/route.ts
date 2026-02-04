import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma} from "@prisma/client";

const prisma = (globalThis as any).prisma || new PrismaClient();

type PurchaseWithItems = Prisma.PurchaseInvoiceGetPayload<{
  include: {
    items: true;
  };
}>;
type PurchaseItem = Prisma.PurchaseInvoiceItemGetPayload<Prisma.PurchaseInvoiceItemDefaultArgs>;



if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    // 🔐 ROLE GUARD - Checking if role is provided
    const role = req.headers.get("x-user-role");
    if (!role || (role !== "ADMIN" && role !== "ACCOUNTANT")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const fromDate = from ? new Date(from + "T00:00:00") : new Date("2000-01-01");
    const toDate = to ? new Date(to + "T23:59:59.999") : new Date();

    // Fetching Purchase Invoices as Inward Data
    const purchases = await prisma.purchaseInvoice.findMany({
      where: {
        date: { gte: fromDate, lte: toDate }
      },
      include: {
        supplier: true,
        items: {
          include: { item: true }
        }
      },
      orderBy: { date: 'desc' }
    });
const rows = purchases.flatMap((inv: PurchaseWithItems) =>
  inv.items.map((line: PurchaseItem) => ({
    date: inv.date.toISOString().split("T")[0],
    type: "PURCHASE",
    itemId: line.itemId,
    qty: Number(line.qty),
    rate: Number(line.rate),
    amount: Number(line.amount),
    invoiceNo: inv.invoiceNo,
  }))
);


    return NextResponse.json(rows);
  } catch (e) {
    console.error("❌ INWARD REPORT ERROR:", e);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}
