import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { requireEntitlement } from "@/lib/subscriptionGuard";

export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date");
    const asOn = dateParam ? new Date(dateParam + "T23:59:59.999") : new Date();

    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const branchId = await resolveBranchId(req, companyId);

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_BALANCE_SHEET_REPORT, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sub = await requireEntitlement(req, "advancedReports");
    if (sub) return sub;

    const branchFilter = branchId ? { branchId } : {};

    // ── 2 queries: accounts + bulk movement groupBy ─────────────────────
    const [accounts, movements] = await Promise.all([
      prisma.account.findMany({ where: { companyId } }),
      prisma.voucherEntry.groupBy({
        by: ["accountId"],
        where: { voucher: { date: { lte: asOn }, companyId, deletedAt: null, ...branchFilter } },
        _sum: { amount: true },
      }),
    ]);

    const movMap = Object.fromEntries(movements.map(m => [m.accountId, m._sum.amount ?? 0]));

    const assetsList: { name: string; amount: number }[]       = [];
    const liabilitiesList: { name: string; amount: number }[]  = [];
    const equityList: { name: string; amount: number }[]       = [];

    let incomeTotal        = 0;
    let expenseTotal       = 0;
    let totalAssets        = 0;
    let totalLiabilities   = 0;
    let totalEquityAccounts = 0;

    for (const acc of accounts) {
      const opening  = Number(acc.openDebit || 0) - Number(acc.openCredit || 0);
      const movement = movMap[acc.id] ?? 0;
      const closing  = opening + movement;

      if (Math.abs(closing) < 0.0001) continue;

      const type  = (acc.type      || "").toUpperCase();
      const party = (acc.partyType || "").toUpperCase();

      const isAsset     = type === "ASSET" || type === "BANK" || type === "CASH" || party === "CUSTOMER";
      const isLiability = type === "LIABILITY" || party === "SUPPLIER" || party === "EMPLOYEE" || party === "EMPLOYES";
      const isEquity    = type === "EQUITY" || type === "CAPITAL";
      const isIncome    = type === "INCOME" || type === "REVENUE";
      const isExpense   = type === "EXPENSE" || type === "COST";

      if (isAsset) {
        if (closing > 0) {
          assetsList.push({ name: acc.name, amount: closing });
        } else {
          // Contra asset (e.g. accumulated depreciation) — deduction in assets section
          assetsList.push({ name: `Less: ${acc.name}`, amount: closing });
        }
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

      // Income: credit balance (negative closing) = revenue earned
      if (isIncome)  incomeTotal  += -closing;
      // Expense: debit balance (positive closing) = costs incurred
      if (isExpense) expenseTotal += closing;
    }

    const netProfit   = incomeTotal - expenseTotal;
    const totalEquity = totalEquityAccounts + netProfit;

    return NextResponse.json({
      assets: assetsList,
      liabilities: liabilitiesList,
      equity: equityList,
      netProfit,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
    });
  } catch (e) {
    console.error("BALANCE SHEET ERROR:", e);
    return NextResponse.json({ error: "Balance calculation failed" }, { status: 500 });
  }
}
