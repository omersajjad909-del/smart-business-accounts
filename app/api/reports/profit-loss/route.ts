import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma} from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
type EntryWithAccount = Prisma.VoucherEntryGetPayload<{
  include: {
    account: true;
  };
}>;


const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}
// api/reports/profit-loss/route.ts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const fromDate = from ? new Date(from + "T00:00:00") : new Date("2000-01-01");
    const toDate = to ? new Date(to + "T23:59:59.999") : new Date();

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const entries = await prisma.voucherEntry.findMany({
      where: {
        voucher: { date: { gte: fromDate, lte: toDate }, companyId },
        account: {
          type: { in: ["INCOME", "EXPENSE", "REVENUE", "COST"] },
          companyId,
        },
      },
      include: { account: true },
    });

    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};

    entries.forEach((e: EntryWithAccount) => {

      const amt = Number(e.amount);
      const type = (e.account.type || "").toUpperCase();
      const name = e.account.name;

      if (Math.abs(amt) < 0.0001) return;

      if (type === "INCOME" || type === "REVENUE") {
        if (amt < 0) {
          incomeMap[name] = (incomeMap[name] || 0) + Math.abs(amt);
        } else {
          expenseMap[name] = (expenseMap[name] || 0) + amt;
        }
      } else if (type === "EXPENSE" || type === "COST") {
        if (amt > 0) {
          expenseMap[name] = (expenseMap[name] || 0) + amt;
        } else {
          incomeMap[name] = (incomeMap[name] || 0) + Math.abs(amt);
        }
      }
    });

    const income = Object.entries(incomeMap).map(([name, amount]) => ({
      name,
      amount,
    }));
    const expense = Object.entries(expenseMap).map(([name, amount]) => ({
      name,
      amount,
    }));

    const totalIncome = income.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expense.reduce((s, r) => s + r.amount, 0);

    return NextResponse.json({
      income,
      expense,
      totalIncome,
      totalExpense,
      grossProfit: totalIncome - totalExpense,
      netProfit: totalIncome - totalExpense,
    });
  } catch (e) {
    console.error("P&L ERROR:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

