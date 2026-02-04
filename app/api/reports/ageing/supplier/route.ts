import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma} from "@prisma/client";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    // 🔐 ROLE CHECK
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supplierId = req.nextUrl.searchParams.get("supplierId");
    const asOnParam = req.nextUrl.searchParams.get("date");

    if (!supplierId) return NextResponse.json([]);

    const asOn = asOnParam
      ? new Date(asOnParam + "T23:59:59.999")
      : new Date();

    // 1️⃣ PURCHASE INVOICES
    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        supplierId,
        date: { lte: asOn },
      },
      orderBy: { date: "asc" },
    });

    // 2️⃣ DEBITS (Payments, Purchase Return, JV)
    const debits = await prisma.voucherEntry.findMany({
      where: {
        accountId: supplierId,
        amount: { gt: 0 },
        voucher: { date: { lte: asOn } },
      },
    });

    type DebitEntry = Prisma.VoucherEntryGetPayload<Prisma.VoucherEntryDefaultArgs>;

let availableDebit = debits.reduce(
  (s: number, d: DebitEntry) => s + Number(d.amount),
  0
);


    let runningBalance = 0;
    const rows: any[] = [];

    for (const inv of invoices) {
      const billAmount = Number(inv.total) || 0;
      let billBalance = billAmount;

      if (availableDebit >= billBalance) {
        availableDebit -= billBalance;
        billBalance = 0;
      } else {
        billBalance -= availableDebit;
        availableDebit = 0;
      }

      if (billBalance > 0) {
        const days = Math.floor(
          (asOn.getTime() - new Date(inv.date).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        runningBalance += billBalance;

        rows.push({
          numType: "PI",
          date: inv.date.toISOString().slice(0, 10),
          narration: `PURCHASE # ${inv.invoiceNo}`,
          billAmount,
          billBalance,
          days,
          totalBalance: runningBalance,
        });
      }
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error("❌ SUPPLIER AGEING ERROR:", e);
    return NextResponse.json([]);
  }
}
