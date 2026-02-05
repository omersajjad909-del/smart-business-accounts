import { NextResponse, NextRequest } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
type VoucherWithEntries = Prisma.VoucherGetPayload<{
  include: {
    entries: true;
  };
}>;

type VoucherEntry = Prisma.VoucherEntryGetPayload<Prisma.VoucherEntryDefaultArgs>;
type SalesInvoice = Prisma.SalesInvoiceGetPayload<Prisma.SalesInvoiceDefaultArgs>;
type PurchaseInvoice = Prisma.PurchaseInvoiceGetPayload<Prisma.PurchaseInvoiceDefaultArgs>;
type SaleReturn = Prisma.SaleReturnGetPayload<Prisma.SaleReturnDefaultArgs>;

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    // 🔐 Role Check
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!accountId) return NextResponse.json([]);

    const account = await prisma.account.findFirst({
      where: { id: accountId, companyId },
      select: { id: true },
    });
    if (!account) return NextResponse.json([]);

    // 📅 Dates Calculation
    const fromDate = from ? new Date(from + "T00:00:00") : new Date("2024-01-01");
    const toDate = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();

    // ---------------------------------------------------------
    // 1. 🟢 OPENING BALANCE CALCULATION
    // 'from' date سے پہلے کی تمام ٹرانزیکشنز کا ٹوٹل
    // ---------------------------------------------------------

    // Previous Vouchers
    const prevVouchers = await prisma.voucher.findMany({
      where: { date: { lt: fromDate }, entries: { some: { accountId } }, companyId },
      include: { entries: true }
    });
    let openingBal = prevVouchers.reduce(
      (sum: number, v: VoucherWithEntries) => {
        const amt = v.entries
          .filter((e: VoucherEntry) => e.accountId === accountId)
          .reduce((s: number, e: VoucherEntry) => s + Number(e.amount), 0);

        return sum + amt;
      },
      0
    );


    // Previous Sales
    const prevSales = await prisma.salesInvoice.aggregate({
      where: { date: { lt: fromDate }, customerId: accountId, companyId },
      _sum: { total: true }
    });
    openingBal += Number(prevSales._sum.total || 0);

    // Previous Purchases
    const prevPurchases = await prisma.purchaseInvoice.aggregate({
      where: { date: { lt: fromDate }, supplierId: accountId, companyId },
      _sum: { total: true }
    });
    openingBal -= Number(prevPurchases._sum.total || 0);

    // Previous Returns
    const prevReturns = await prisma.saleReturn.aggregate({
      where: { date: { lt: fromDate }, customerId: accountId, companyId },
      _sum: { total: true }
    });
    openingBal -= Number(prevReturns._sum.total || 0);


    // ---------------------------------------------------------
    // 2. 🔵 FETCH CURRENT PERIOD DATA
    // ---------------------------------------------------------

    // Fetch Vouchers (Filter out PI and SI to avoid doubles)
    const vouchers = await prisma.voucher.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        entries: { some: { accountId } },
        companyId,
        // 🔥 ڈبل انٹری روکنے کے لیے فلٹر
        NOT: {
          OR: [
            { voucherNo: { startsWith: "PI-" } },
            { voucherNo: { startsWith: "SI-" } },
            { voucherNo: { startsWith: "SR-" } },
          ]
        }
      },
      include: { entries: true },
    });

    const sales = await prisma.salesInvoice.findMany({
      where: { date: { gte: fromDate, lte: toDate }, customerId: accountId, companyId },
    });

    const purchases = await prisma.purchaseInvoice.findMany({
      where: { date: { gte: fromDate, lte: toDate }, supplierId: accountId, companyId },
    });

    const returns = await prisma.saleReturn.findMany({
      where: { date: { gte: fromDate, lte: toDate }, customerId: accountId, companyId },
    });

    // ---------------------------------------------------------
    // 3. 🟠 COMBINE AND SORT
    // ---------------------------------------------------------
    const combinedData: any[] = [];
    vouchers.forEach((v: VoucherWithEntries) => {
      const amount = v.entries
        .filter((e: VoucherEntry) => e.accountId === accountId)
        .reduce(
          (sum: number, e: VoucherEntry) => sum + Number(e.amount),
          0
        );

      combinedData.push({
        date: new Date(v.date),
        voucherNo: v.voucherNo,
        narration: v.narration || "Voucher Entry",
        debit: amount > 0 ? amount : 0,
        credit: amount < 0 ? Math.abs(amount) : 0,
      });
    });


    sales.forEach((s : SalesInvoice) => {
      combinedData.push({
        date: new Date(s.date),
        voucherNo: s.invoiceNo,
        narration: "Sales Invoice",
        debit: Number(s.total || 0),
        credit: 0,
      });
    });

    purchases.forEach((p : PurchaseInvoice) => {
      combinedData.push({
        date: new Date(p.date),
        voucherNo: p.invoiceNo,
        narration: "Purchase Invoice",
        debit: 0,
        credit: Number(p.total || 0),
      });
    });

    returns.forEach((r: SaleReturn) => {
      combinedData.push({
        date: new Date(r.date),
        voucherNo: r.returnNo,
        narration: "Sale Return",
        debit: 0,
        credit: Number(r.total || 0),
      });
    });

    // Sort by Date
    combinedData.sort((a, b) => a.date.getTime() - b.date.getTime());

    // ---------------------------------------------------------
    // 4. 🏁 FINAL CALCULATIONS (Running Balance)
    // ---------------------------------------------------------
    let runningBalance = openingBal;

    // اوپننگ بیلنس کو پہلی لائن کے طور پر شامل کریں
    const finalRows = [
      {
        date: fromDate.toISOString().slice(0, 10),
        voucherNo: "---",
        narration: "OPENING BALANCE B/F",
        debit: openingBal > 0 ? openingBal : 0,
        credit: openingBal < 0 ? Math.abs(openingBal) : 0,
        balance: openingBal
      },
      ...combinedData.map(row => {
        runningBalance += row.debit - row.credit;
        return {
          ...row,
          date: row.date.toISOString().slice(0, 10),
          balance: runningBalance
        };
      })
    ];

    return NextResponse.json(finalRows);

  } catch (e: any) {
    console.error("LEDGER ERROR:", e);
    return NextResponse.json({ error: "Ledger generation failed" }, { status: 500 });
  }
}
