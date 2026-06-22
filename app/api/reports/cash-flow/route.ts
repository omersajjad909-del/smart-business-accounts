import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";

type VoucherWithEntries = Prisma.VoucherGetPayload<{
  include: { entries: { include: { account: true } } };
}>;

export async function GET(req: NextRequest) {
  try {
    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_REPORTS, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const branchId = await resolveBranchId(req, companyId);

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");
    if (!from || !to) return NextResponse.json({ error: "From and To dates required" }, { status: 400 });

    const fromDate = new Date(from + "T00:00:00");
    const toDate   = new Date(to   + "T23:59:59.999");

    // ── Identify cash & bank accounts ──────────────────────────────────
    const [cashAccount, bankAccounts] = await Promise.all([
      prisma.account.findFirst({
        where: { name: { contains: "Cash", mode: "insensitive" }, companyId },
      }),
      prisma.account.findMany({
        where: { partyType: { equals: "BANKS", mode: "insensitive" }, companyId },
      }),
    ]);

    const cashAccountIds = [
      cashAccount?.id,
      ...bankAccounts.map(b => b.id),
    ].filter(Boolean) as string[];

    // ── Fetch all vouchers in period ────────────────────────────────────
    const vouchers = await prisma.voucher.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        companyId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      include: { entries: { include: { account: true } } },
      orderBy: { date: "asc" },
    });

    type CashFlowItem = { date: string; voucherNo: string; description: string; amount: number; type: "INFLOW" | "OUTFLOW" };
    const operating: CashFlowItem[] = [];
    const investing: CashFlowItem[] = [];
    const financing: CashFlowItem[] = [];

    vouchers.forEach((voucher: VoucherWithEntries) => {
      const cashEntries    = voucher.entries.filter(e => cashAccountIds.includes(e.accountId));
      const nonCashEntries = voucher.entries.filter(e => !cashAccountIds.includes(e.accountId));

      if (cashEntries.length === 0) return;

      const cashMovement = cashEntries.reduce((s, e) => s + Number(e.amount), 0);
      if (cashMovement === 0) return;

      const direction: "INFLOW" | "OUTFLOW" = cashMovement > 0 ? "INFLOW" : "OUTFLOW";

      nonCashEntries.forEach(entry => {
        const type  = (entry.account.type      || "").toUpperCase();
        const party = (entry.account.partyType || "").toUpperCase();
        const item: CashFlowItem = {
          date:        voucher.date.toISOString().slice(0, 10),
          voucherNo:   voucher.voucherNo,
          description: voucher.narration || entry.account.name,
          amount:      Math.abs(Number(entry.amount)),
          type:        direction,
        };

        const isOperating =
          type === "REVENUE" || type === "INCOME" || type === "EXPENSE" || type === "COST" ||
          party === "CUSTOMER" || party === "SUPPLIER";

        const isInvesting =
          type === "ASSET" && !cashAccountIds.includes(entry.accountId) &&
          entry.account.name.toLowerCase().includes("asset");

        const isFinancing = type === "LIABILITY" || type === "EQUITY" || type === "CAPITAL";

        if      (isOperating) operating.push(item);
        else if (isInvesting) investing.push(item);
        else if (isFinancing) financing.push(item);
      });
    });

    const sum = (arr: CashFlowItem[], dir: "INFLOW" | "OUTFLOW") =>
      arr.filter(x => x.type === dir).reduce((s, x) => s + x.amount, 0);

    const opIn  = sum(operating, "INFLOW"),  opOut  = sum(operating, "OUTFLOW");
    const invIn = sum(investing, "INFLOW"),  invOut = sum(investing, "OUTFLOW");
    const finIn = sum(financing, "INFLOW"),  finOut = sum(financing, "OUTFLOW");

    return NextResponse.json({
      period: { from, to },
      operating: { items: operating, inflow: opIn,  outflow: opOut,  net: opIn  - opOut  },
      investing: { items: investing, inflow: invIn,  outflow: invOut,  net: invIn  - invOut  },
      financing: { items: financing, inflow: finIn,  outflow: finOut,  net: finIn  - finOut  },
      netCashFlow: (opIn - opOut) + (invIn - invOut) + (finIn - finOut),
    });
  } catch (e: any) {
    console.error("CASH FLOW ERROR:", e);
    return NextResponse.json({ error: e.message || "Cash flow report failed" }, { status: 500 });
  }
}
