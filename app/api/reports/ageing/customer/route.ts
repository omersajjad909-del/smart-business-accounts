import { NextRequest, NextResponse } from "next/server";
import { PrismaClient ,Prisma} from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
type CreditEntry = Prisma.VoucherEntryGetPayload<Prisma.VoucherEntryDefaultArgs>;


if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    // 🔐 ROLE CHECK
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const customerId = req.nextUrl.searchParams.get("customerId");
    const asOnParam = req.nextUrl.searchParams.get("date");

    if (!customerId) return NextResponse.json([]);

    const customer = await prisma.account.findFirst({
      where: { id: customerId, companyId },
      select: { id: true },
    });
    if (!customer) return NextResponse.json([]);

    const asOn = asOnParam
      ? new Date(asOnParam + "T23:59:59.999")
      : new Date();

    // 1️⃣ SALES INVOICES
    const invoices = await prisma.salesInvoice.findMany({
      where: {
        customerId,
        date: { lte: asOn },
        companyId,
      },
      orderBy: { date: "asc" },
    });

    // 2️⃣ CREDITS (Receipts, Sales Return, JV)
    const credits = await prisma.voucherEntry.findMany({
      where: {
        accountId: customerId,
        amount: { lt: 0 },
        voucher: { date: { lte: asOn }, companyId },
      },
    });

let availableCredit = credits.reduce(
  (s: number, c: CreditEntry) => s + Math.abs(Number(c.amount)),
  0
);

    let runningBalance = 0;
    const rows: Any[] = [];

    for (const inv of invoices) {
      const billAmount = Number(inv.total) || 0;
      let billBalance = billAmount;

      // FIFO adjustment
      if (availableCredit >= billBalance) {
        availableCredit -= billBalance;
        billBalance = 0;
      } else {
        billBalance -= availableCredit;
        availableCredit = 0;
      }

      if (billBalance > 0) {
        const days = Math.floor(
          (asOn.getTime() - new Date(inv.date).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        runningBalance += billBalance;

        rows.push({
          numType: "SI",
          date: inv.date.toISOString().slice(0, 10),
          narration: `BILL # ${inv.invoiceNo}`,
          billAmount,
          billBalance,
          days,
          totalBalance: runningBalance,
        });
      }
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error("❌ CUSTOMER AGEING ERROR:", e);
    return NextResponse.json([]);
  }
}

