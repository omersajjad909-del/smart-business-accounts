import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";

function resolveCategory(acc: any) {
  if (acc.partyType === "EMPLOYES" || acc.partyType === "EMPLOYEE") return "EMPLOYEES";
  if (acc.partyType === "CUSTOMER") return "CUSTOMERS";
  if (acc.partyType === "SUPPLIER") return "SUPPLIERS";
  if (acc.type === "ASSET")     return "ASSETS";
  if (acc.type === "LIABILITY") return "LIABILITIES";
  if (acc.type === "EQUITY")    return "EQUITY";
  if (acc.type === "INCOME")    return "INCOME";
  if (acc.type === "EXPENSE")   return "EXPENSES";
  return "OTHERS";
}

export async function GET(req: NextRequest) {
  try {
    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const branchId = await resolveBranchId(req, companyId);

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");
    const fromDate = from ? new Date(from + "T00:00:00") : new Date("2000-01-01");
    const toDate   = to   ? new Date(to   + "T23:59:59.999") : new Date();

    const branchFilter = branchId ? { branchId } : {};

    // ── 4 queries total instead of 2N ──────────────────────────────────
    const [accounts, allOpEntries, allPeriodDebits, allPeriodCredits] = await Promise.all([
      prisma.account.findMany({ where: { companyId }, orderBy: [{ name: "asc" }] }),

      // Opening: net voucher movement before period start
      prisma.voucherEntry.groupBy({
        by: ["accountId"],
        where: { voucher: { date: { lt: fromDate }, companyId, deletedAt: null, ...branchFilter } },
        _sum: { amount: true },
      }),

      // Period debits (positive amounts)
      prisma.voucherEntry.groupBy({
        by: ["accountId"],
        where: { amount: { gt: 0 }, voucher: { date: { gte: fromDate, lte: toDate }, companyId, deletedAt: null, ...branchFilter } },
        _sum: { amount: true },
      }),

      // Period credits (negative amounts)
      prisma.voucherEntry.groupBy({
        by: ["accountId"],
        where: { amount: { lt: 0 }, voucher: { date: { gte: fromDate, lte: toDate }, companyId, deletedAt: null, ...branchFilter } },
        _sum: { amount: true },
      }),
    ]);

    const opMap     = Object.fromEntries(allOpEntries.map(e     => [e.accountId, e._sum.amount ?? 0]));
    const debitMap  = Object.fromEntries(allPeriodDebits.map(e  => [e.accountId, e._sum.amount ?? 0]));
    const creditMap = Object.fromEntries(allPeriodCredits.map(e => [e.accountId, Math.abs(e._sum.amount ?? 0)]));

    const rows: any[] = [];

    for (const acc of accounts) {
      const openingFromMaster   = Number(acc.openDebit || 0) - Number(acc.openCredit || 0);
      const openingFromVouchers = opMap[acc.id] ?? 0;
      const openingNet  = openingFromMaster + openingFromVouchers;
      const transDebit  = debitMap[acc.id]  ?? 0;
      const transCredit = creditMap[acc.id] ?? 0;
      const closingNet  = openingNet + (transDebit - transCredit);

      if (openingNet === 0 && transDebit === 0 && transCredit === 0) continue;

      rows.push({
        code: acc.code,
        name: acc.name,
        category: resolveCategory(acc),
        opDebit:   openingNet > 0 ? openingNet           : 0,
        opCredit:  openingNet < 0 ? Math.abs(openingNet) : 0,
        transDebit,
        transCredit,
        clDebit:   closingNet > 0 ? closingNet           : 0,
        clCredit:  closingNet < 0 ? Math.abs(closingNet) : 0,
      });
    }

    const totals = rows.reduce(
      (a, r) => ({
        opDebit:     a.opDebit     + r.opDebit,
        opCredit:    a.opCredit    + r.opCredit,
        transDebit:  a.transDebit  + r.transDebit,
        transCredit: a.transCredit + r.transCredit,
        clDebit:     a.clDebit     + r.clDebit,
        clCredit:    a.clCredit    + r.clCredit,
      }),
      { opDebit: 0, opCredit: 0, transDebit: 0, transCredit: 0, clDebit: 0, clCredit: 0 }
    );

    return NextResponse.json({ rows, totals });
  } catch (e) {
    console.error("TRIAL BALANCE ERROR:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
