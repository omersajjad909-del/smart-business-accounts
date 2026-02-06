import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
type InventoryTxnWithParty = Prisma.InventoryTxnGetPayload<{
  include: {
    party: { select: { name: true } };
  };
}>;

type StockLedgerRow = {
  date: string;
  type: string;
  party: string;
  inQty: number;
  outQty: number;
  balanceQty: number;
};

const _rows: StockLedgerRow[] = [];



const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!itemId) return NextResponse.json([]);

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const item = await prisma.itemNew.findFirst({
      where: { id: itemId, companyId },
      select: { id: true },
    });
    if (!item) return NextResponse.json([]);

    const fromDate = from ? new Date(from + "T00:00:00") : new Date("2025-01-01");
    const toDate = to ? new Date(to + "T23:59:59.999") : new Date();

    // 1. OPENING BALANCE
    const openingTxns = await prisma.inventoryTxn.aggregate({
      where: { itemId, date: { lt: fromDate }, companyId },
      _sum: { qty: true },
    });
    let runningBalance = openingTxns._sum.qty || 0;

    // 2. FETCH TRANSACTIONS
    // ہم نے SalesInvoiceItem کو بھی شامل کیا ہے تاکہ وہاں سے لنک ڈھونڈ سکیں
    const txns = await prisma.inventoryTxn.findMany({
      where: { itemId, date: { gte: fromDate, lte: toDate }, companyId },
      include: {
        party: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    });

    const rows = [];
    
    // Opening Balance Row
    rows.push({
      date: fromDate.toISOString().slice(0, 10),
      type: "OPENING",
      party: "Opening Balance B/F",
      inQty: runningBalance > 0 ? runningBalance : 0,
      outQty: runningBalance < 0 ? Math.abs(runningBalance) : 0,
      balanceQty: runningBalance,
    });

    // 3. LOOP THROUGH TRANSACTIONS
    // یہاں ہم ان ٹرانزیکشنز کے لیے کسٹمر کا نام ڈھونڈیں گے جن کا partyId خالی ہے
    const updatedRows: StockLedgerRow[] = await Promise.all(
  txns.map(async (t: InventoryTxnWithParty) => {
    runningBalance += Number(t.qty || 0);

    let displayName = t.party?.name;

    if (!displayName) {
      if (t.type === "SALE") {
        const saleDetail = await prisma.salesInvoiceItem.findFirst({
          where: {
            itemId: t.itemId,
            qty: Math.abs(t.qty),
            invoice: { date: t.date, companyId },
          },
          include: {
            invoice: { include: { customer: true } },
          },
        });
        displayName =
          saleDetail?.invoice?.customer?.name || "Walking Customer";
      } else if (t.type === "PURCHASE") {
        displayName = "Supplier / Purchase";
      } else {
        displayName = "Self / Adjustment";
      }
    }

    return {
      date: t.date.toISOString().slice(0, 10),
      type: t.type,
      party: displayName,
      inQty: t.qty > 0 ? t.qty : 0,
      outQty: t.qty < 0 ? Math.abs(t.qty) : 0,
      balanceQty: runningBalance,
    };
  })
);


    return NextResponse.json([...rows, ...updatedRows]);
  } catch (e) {
    console.error("STOCK LEDGER ERROR:", e);
    return NextResponse.json([], { status: 500 });
  }
}
