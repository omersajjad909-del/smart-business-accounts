import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function POST(req: NextRequest) {
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

    // 📥 BODY
    const body = await req.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json(
        { error: "Closing date required" },
        { status: 400 }
      );
    }

    const closingDate = new Date(date + "T23:59:59");

    // 🔎 GET INCOME & EXPENSE ENTRIES
    const entries = await prisma.voucherEntry.findMany({
      where: {
        voucher: {
          date: { lte: closingDate },
          companyId,
        },
        account: {
          type: { in: ["INCOME", "EXPENSE"] },
          companyId,
        },
      },
      include: {
        account: true,
      },
    });

    let incomeTotal = 0;
    let expenseTotal = 0;

    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};

    for (const e of entries) {
      const amt = Math.abs(Number(e.amount));

      if (e.account.type === "INCOME") {
        incomeTotal += amt;
        incomeMap[e.account.id] =
          (incomeMap[e.account.id] || 0) + amt;
      }

      if (e.account.type === "EXPENSE") {
        expenseTotal += amt;
        expenseMap[e.account.id] =
          (expenseMap[e.account.id] || 0) + amt;
      }
    }

    const profit = incomeTotal - expenseTotal;

    // 🏦 CAPITAL ACCOUNT
    const capital = await prisma.account.findFirst({
      where: { type: "CAPITAL", companyId },
    });

    if (!capital) {
      throw new Error("Capital account missing");
    }

    // 🧾 YEAR END CLOSING VOUCHER
    await prisma.voucher.create({
      data: {
        voucherNo: `CLOSE-${Date.now()}`,
        type: "YEAR_END",
        date: closingDate,
        narration: "Year End Closing",
        companyId,
        entries: {
          create: [
            // CLOSE INCOME (DEBIT)
            ...Object.entries(incomeMap).map(([accId, amt]) => ({
              accountId: accId,
              amount: amt,
            })),

            // CLOSE EXPENSE (CREDIT)
            ...Object.entries(expenseMap).map(([accId, amt]) => ({
              accountId: accId,
              amount: -amt,
            })),

            // PROFIT / LOSS → CAPITAL
            profit >= 0
              ? {
                  accountId: capital.id,
                  amount: -profit, // PROFIT
                }
              : {
                  accountId: capital.id,
                  amount: Math.abs(profit), // LOSS
                },
          ],
        },
      },
    });

    return NextResponse.json({
      incomeTotal,
      expenseTotal,
      profit,
      status: "YEAR CLOSED SUCCESSFULLY",
    });
  } catch (e: any) {
    console.error("YEAR END ERROR:", e);
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
