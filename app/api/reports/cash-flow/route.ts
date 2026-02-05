import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();
type BankAccount = Prisma.AccountGetPayload<Prisma.AccountDefaultArgs>;

type VoucherWithEntries = Prisma.VoucherGetPayload<{
  include: {
    entries: {
      include: {
        account: true;
      };
    };
  };
}>;

type VoucherEntryWithAccount =
  Prisma.VoucherEntryGetPayload<{ include: { account: true } }>;

type CashFlowItem = {
  date: string;
  voucherNo: string;
  description: string;
  amount: number;
  type: "INFLOW" | "OUTFLOW";
};





if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "From and To dates required" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from + "T00:00:00");
    const toDate = new Date(to + "T23:59:59.999");

    // Get all vouchers in date range
    const vouchers = await prisma.voucher.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        companyId,
      },
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    const operating: CashFlowItem[] = [];
    const investing: CashFlowItem[] = [];
    const financing: CashFlowItem[] = [];

    // Get Cash account - try multiple variations
    const cashAccount = await prisma.account.findFirst({
      where: { name: { contains: "Cash", mode: "insensitive" }, companyId },
    });

    if (!cashAccount) {
      console.warn("⚠️ Cash account not found, Cash Flow may be incomplete");
    }

    // Get Bank accounts
    const bankAccounts = await prisma.account.findMany({
      where: { partyType: { equals: "BANKS", mode: "insensitive" }, companyId },
    });

    const cashAccountIds = [
      cashAccount?.id,
      ...bankAccounts.map((b: BankAccount) => b.id),
    ].filter(Boolean) as string[];


    console.log("💰 Cash/Bank Account IDs:", cashAccountIds);

    vouchers.forEach((voucher: VoucherWithEntries) => {
      const cashEntries = voucher.entries.filter(
        (e: VoucherEntryWithAccount) =>
          cashAccountIds.includes(e.accountId)
      );

      if (cashEntries.length === 0) return;

      const cashMovement = cashEntries.reduce(
        (sum: number, e: VoucherEntryWithAccount) =>
          sum + Number(e.amount),
        0
      );

      if (cashMovement === 0) return;


const direction: "INFLOW" | "OUTFLOW" =
  cashMovement > 0 ? "INFLOW" : "OUTFLOW";

      const nonCashEntries = voucher.entries.filter(
        (e: Prisma.VoucherEntryGetPayload<{ include: { account: true } }>) =>
          cashAccountIds.includes(e.accountId)
      );

      nonCashEntries.forEach((entry) => {
        const acc = entry.account;
        const type = (acc.type || "").toUpperCase();
        const party = (acc.partyType || "").toUpperCase();
        const amount = Math.abs(Number(entry.amount));
        const base = {
          date: voucher.date.toISOString().split("T")[0],
          voucherNo: voucher.voucherNo,
          description: voucher.narration || acc.name,
          amount,
          type: direction,
        };

        const isOperating =
          type === "REVENUE" ||
          type === "INCOME" ||
          type === "EXPENSE" ||
          type === "COST" ||
          party === "CUSTOMER" ||
          party === "SUPPLIER";

        const isInvesting =
          type === "ASSET" &&
          !cashAccountIds.includes(entry.accountId) &&
          acc.name.toLowerCase().includes("asset");

        const isFinancing =
          type === "LIABILITY" || type === "EQUITY" || type === "CAPITAL";

        if (isOperating) {
          operating.push(base);
        } else if (isInvesting) {
          investing.push(base);
        } else if (isFinancing) {
          financing.push(base);
        }
      });
    });

    // Calculate totals
    const operatingInflow = operating
      .filter((o) => o.type === "INFLOW")
      .reduce((sum, o) => sum + o.amount, 0);
    const operatingOutflow = operating
      .filter((o) => o.type === "OUTFLOW")
      .reduce((sum, o) => sum + o.amount, 0);
    const operatingNet = operatingInflow - operatingOutflow;

    const investingInflow = investing
      .filter((i) => i.type === "INFLOW")
      .reduce((sum, i) => sum + i.amount, 0);
    const investingOutflow = investing
      .filter((i) => i.type === "OUTFLOW")
      .reduce((sum, i) => sum + i.amount, 0);
    const investingNet = investingInflow - investingOutflow;

    const financingInflow = financing
      .filter((f) => f.type === "INFLOW")
      .reduce((sum, f) => sum + f.amount, 0);
    const financingOutflow = financing
      .filter((f) => f.type === "OUTFLOW")
      .reduce((sum, f) => sum + f.amount, 0);
    const financingNet = financingInflow - financingOutflow;

    const netCashFlow = operatingNet + investingNet + financingNet;

    return NextResponse.json({
      period: { from, to },
      operating: {
        items: operating,
        inflow: operatingInflow,
        outflow: operatingOutflow,
        net: operatingNet,
      },
      investing: {
        items: investing,
        inflow: investingInflow,
        outflow: investingOutflow,
        net: investingNet,
      },
      financing: {
        items: financing,
        inflow: financingInflow,
        outflow: financingOutflow,
        net: financingNet,
      },
      netCashFlow,
    });
  } catch (e: Any) {
    console.error("❌ CASH FLOW ERROR:", e);
    return NextResponse.json(
      { error: e.message || "Cash flow report failed" },
      { status: 500 }
    );
  }
}

