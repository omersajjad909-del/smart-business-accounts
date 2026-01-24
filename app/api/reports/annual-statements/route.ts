import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

// Annual Financial Statements
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.VIEW_REPORTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    const startDate = new Date(`${year}-01-01T00:00:00`);
    const endDate = new Date(`${year}-12-31T23:59:59`);

    // Get all accounts with their balances
    const accounts = await prisma.account.findMany({
      include: {
        voucherEntries: {
          where: {
            voucher: {
              date: { gte: startDate, lte: endDate },
            },
          },
        },
      },
    });

    type AccountWithEntries = Prisma.AccountGetPayload<{
  include: {
    voucherEntries: true;
  };
}>;

type AccountBalance = {
  accountId: string;
  name: string;
  type: string;
  openingBalance: number;
  closingBalance: number;
};



    // Calculate balances
const accountBalances: AccountBalance[] = accounts.map(
  (acc: AccountWithEntries) => {
    const entries = acc.voucherEntries || [];
    const periodBalance = entries.reduce(
      (sum: number, e) => sum + e.amount,
      0
    );

    const openingBalance =
      (acc.openDebit || 0) - (acc.openCredit || 0);

    const closingBalance = openingBalance + periodBalance;

    return {
      accountId: acc.id,
      name: acc.name,
      type: acc.type,
      openingBalance,
      closingBalance,
    };
  }
);



    // Group by account type
    const grouped: Record<string, any[]> = {};
   accountBalances.forEach((acc) => {
  if (!grouped[acc.type]) {
    grouped[acc.type] = [];
  }
  grouped[acc.type].push(acc);
});


    // Calculate totals
    const totals = {
      assets: 0,
      liabilities: 0,
      equity: 0,
      income: 0,
      expenses: 0,
    };

    accountBalances.forEach((acc) => {
      if (["ASSET", "BANK", "CASH"].includes(acc.type)) {
        totals.assets += acc.closingBalance;
      } else if (["LIABILITY"].includes(acc.type)) {
        totals.liabilities += acc.closingBalance;
      } else if (["EQUITY", "CAPITAL"].includes(acc.type)) {
        totals.equity += acc.closingBalance;
      } else if (["INCOME", "REVENUE"].includes(acc.type)) {
        totals.income += acc.closingBalance;
      } else if (["EXPENSE", "COST"].includes(acc.type)) {
        totals.expenses += acc.closingBalance;
      }
    });

    const netProfit = totals.income - totals.expenses;

    return NextResponse.json({
      year: parseInt(year),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      accounts: accountBalances,
      grouped,
      totals: {
        ...totals,
        netProfit,
      },
      balanceSheet: {
        assets: totals.assets,
        liabilities: totals.liabilities,
        equity: totals.equity + netProfit,
        total: totals.assets,
      },
      profitLoss: {
        income: totals.income,
        expenses: totals.expenses,
        netProfit,
      },
    });
  } catch (e: any) {
    console.error("Annual Statements Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
