import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
type AccountWithEntries = Prisma.AccountGetPayload<{
  include: {
    voucherEntries: true;
  };
}>;


if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

// api/reports/balance-sheet/route.ts
export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date");
    const asOn = dateParam ? new Date(dateParam + "T23:59:59.999") : new Date();

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const accounts = await prisma.account.findMany({
      where: { companyId },
      include: {
        voucherEntries: {
          where: {
            voucher: {
              date: { lte: asOn },
              companyId,
            },
          },
        },
      },
    });

    const assetsList: any[] = [];
    const liabilitiesList: any[] = [];
    const equityList: any[] = [];

    let incomeTotal = 0;
    let expenseTotal = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquityAccounts = 0;

    accounts.forEach((acc: AccountWithEntries) => {

      const opening =
        Number(acc.openDebit || 0) - Number(acc.openCredit || 0);
      const movement = (acc.voucherEntries || []).reduce(
        (sum, e) => sum + Number(e.amount),
        0
      );
      const closing = opening + movement;

      if (Math.abs(closing) < 0.0001) {
        return;
      }

      const type = (acc.type || "").toUpperCase();
      const party = (acc.partyType || "").toUpperCase();

      const isAsset =
        type === "ASSET" ||
        type === "BANK" ||
        type === "CASH" ||
        party === "CUSTOMER";
      const isLiability =
        type === "LIABILITY" || party === "SUPPLIER";
      const isEquity =
        type === "EQUITY" || type === "CAPITAL";
      const isIncome =
        type === "INCOME" || type === "REVENUE";
      const isExpense =
        type === "EXPENSE" || type === "COST";

      if (isAsset && closing > 0) {
        assetsList.push({ name: acc.name, amount: closing });
        totalAssets += closing;
      }

      if (isLiability && closing < 0) {
        const val = Math.abs(closing);
        liabilitiesList.push({ name: acc.name, amount: val });
        totalLiabilities += val;
      }

      if (isEquity && closing < 0) {
        const val = Math.abs(closing);
        equityList.push({ name: acc.name, amount: val });
        totalEquityAccounts += val;
      }

      if (isIncome) {
        if (closing < 0) {
          incomeTotal += Math.abs(closing);
        } else {
          expenseTotal += closing;
        }
      }

      if (isExpense) {
        if (closing > 0) {
          expenseTotal += closing;
        } else {
          incomeTotal += Math.abs(closing);
        }
      }
    });

    const netProfit = incomeTotal - expenseTotal;
    const totalEquity = totalEquityAccounts + netProfit;

    return NextResponse.json({
      assets: assetsList,
      liabilities: liabilitiesList,
      equity: equityList,
      netProfit,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced:
        Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
    });
  } catch (e) {
    console.error("BALANCE SHEET ERROR:", e);
    return NextResponse.json({ error: "Balance calculation failed" }, { status: 500 });
  }
}

