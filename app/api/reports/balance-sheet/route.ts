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

      const type  = (acc.type      || "").toUpperCase();
      const party = (acc.partyType || "").toUpperCase();

      const isAsset     = type === "ASSET" || type === "BANK" || type === "CASH" || party === "CUSTOMER";
      const isLiability = type === "LIABILITY" || party === "SUPPLIER" || party === "EMPLOYEE" || party === "EMPLOYES";
      const isEquity    = type === "EQUITY" || type === "CAPITAL";
      const isIncome    = type === "INCOME" || type === "REVENUE";
      const isExpense   = type === "EXPENSE" || type === "COST";

      // Income/expense accounts: use only voucher movements (not opening balance).
      // These accounts don't carry forward — they're closed to retained earnings each period.
      if (isIncome) {
        if (Math.abs(movement) > 0.0001) incomeTotal -= movement; // credit entries are negative → income
        continue;
      }
      if (isExpense) {
        if (Math.abs(movement) > 0.0001) expenseTotal += movement; // debit entries are positive → cost
        continue;
      }

      if (Math.abs(closing) < 0.0001) continue;

      if (isAsset) {
        if (closing > 0) {
          assetsList.push({ name: acc.name, amount: closing });
          totalAssets += closing;
        } else {
          // Customer with credit balance = advance/overpayment received → show as liability
          const val = Math.abs(closing);
          liabilitiesList.push({ name: `Advance: ${acc.name}`, amount: val });
          totalLiabilities += val;
        }
      }

      if (isLiability) {
        if (closing < 0) {
          const val = Math.abs(closing);
          liabilitiesList.push({ name: acc.name, amount: val });
          totalLiabilities += val;
        } else if (closing > 0) {
          // Supplier with debit balance = advance paid to supplier → show as asset
          assetsList.push({ name: `Advance to: ${acc.name}`, amount: closing });
          totalAssets += closing;
        }
      }

      if (isEquity && closing < 0) {
        const val = Math.abs(closing);
        equityList.push({ name: acc.name, amount: val });
        totalEquityAccounts += val;
      }
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
