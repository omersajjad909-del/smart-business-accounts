import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { requireEntitlement } from "@/lib/subscriptionGuard";

type EntryWithAccount = Prisma.VoucherEntryGetPayload<{ include: { account: true } }>;

export async function GET(req: NextRequest) {
  try {
    const userId   = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");
    const fromDate = from ? new Date(from + "T00:00:00") : new Date("2000-01-01");
    const toDate   = to   ? new Date(to   + "T23:59:59.999") : new Date();

    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const branchId = await resolveBranchId(req, companyId);

    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_PROFIT_LOSS_REPORT, companyId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sub = await requireEntitlement(req, "advancedReports");
    if (sub) return sub;

    const incomeMap:  Record<string, number> = {};
    const expenseMap: Record<string, number> = {};

    // ── 1. Manual journal vouchers (INCOME / REVENUE / EXPENSE / COST accounts) ──────
    //    Exclude SI and PI voucher types — those are handled directly below.
    const journalEntries = await prisma.voucherEntry.findMany({
      where: {
        voucher: {
          date: { gte: fromDate, lte: toDate },
          companyId,
          type: { notIn: ["SI", "PI"] },
          ...(branchId ? { branchId } : {}),
        },
        account: {
          type: { in: ["INCOME", "EXPENSE", "REVENUE", "COST"] },
          companyId,
        },
      },
      include: { account: true },
    });

    journalEntries.forEach((e: EntryWithAccount) => {
      const amt  = Number(e.amount);
      const type = (e.account.type || "").toUpperCase();
      const name = e.account.name;
      if (Math.abs(amt) < 0.0001) return;

      if (type === "INCOME" || type === "REVENUE") {
        if (amt < 0) incomeMap[name]  = (incomeMap[name]  || 0) + Math.abs(amt);
        else         expenseMap[name] = (expenseMap[name] || 0) + amt;
      } else if (type === "EXPENSE" || type === "COST") {
        if (amt > 0) expenseMap[name] = (expenseMap[name] || 0) + amt;
        else         incomeMap[name]  = (incomeMap[name]  || 0) + Math.abs(amt);
      }
    });

    // ── 2. Sales Invoice income (via SI vouchers) ───────────────────────────────────
    //    SI vouchers credit the "Sales" INCOME account — we capture those here.
    const siEntries = await prisma.voucherEntry.findMany({
      where: {
        voucher: {
          date: { gte: fromDate, lte: toDate },
          companyId,
          type: "SI",
          ...(branchId ? { branchId } : {}),
        },
        account: { type: { in: ["INCOME", "REVENUE"] }, companyId },
      },
      include: { account: true },
    });

    siEntries.forEach((e: EntryWithAccount) => {
      const amt  = Number(e.amount);
      const name = e.account.name;
      if (Math.abs(amt) < 0.0001) return;
      // SI credit to income account → stored as negative amount
      if (amt < 0) incomeMap[name] = (incomeMap[name] || 0) + Math.abs(amt);
    });

    // ── 3. POS sales (BusinessRecord) NOT backed by a SalesInvoice ─────────────────
    //    Legacy POS sales (#0001-#0010) only exist in BusinessRecord.
    const salesInvoiceNos = new Set(
      (await prisma.salesInvoice.findMany({
        where: { companyId, date: { gte: fromDate, lte: toDate }, deletedAt: null },
        select: { invoiceNo: true },
      })).map(s => s.invoiceNo)
    );

    const posRecords = await prisma.businessRecord.findMany({
      where: { companyId, category: "pos_sale", createdAt: { gte: fromDate, lte: toDate } },
      select: { amount: true, data: true },
    });

    for (const rec of posRecords) {
      const d     = rec.data as any;
      const invNo = d?.invoiceNo || d?.posInvoiceNo || d?.receiptNo;
      if (invNo && salesInvoiceNos.has(invNo)) continue; // already counted via SI voucher
      const amt = Number(rec.amount) || 0;
      if (amt > 0) incomeMap["POS Sales"] = (incomeMap["POS Sales"] || 0) + amt;
    }

    // ── 4. Purchase Invoice expenses (Purchases / COGS) ────────────────────────────
    //    PI vouchers debit Inventory (ASSET), NOT an expense account — so they never
    //    appear in the voucher-based expense map. We pull them directly here.
    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        date:      { gte: fromDate, lte: toDate },
        deletedAt: null,
        approvalStatus: { not: "REJECTED" },
        ...(branchId ? { branchId } : {}),
      },
      select: { total: true, freight: true, supplier: { select: { name: true } } },
    });

    for (const pi of purchaseInvoices) {
      const amt = (pi.total || 0) + (pi.freight || 0);
      if (amt > 0) expenseMap["Purchases / Cost of Goods"] = (expenseMap["Purchases / Cost of Goods"] || 0) + amt;
    }

    // ── 5. Build result arrays ──────────────────────────────────────────────────────
    const income  = Object.entries(incomeMap).map(([name, amount]) => ({ name, amount }));
    const expense = Object.entries(expenseMap).map(([name, amount]) => ({ name, amount }));

    // Sort largest first
    income.sort((a, b) => b.amount - a.amount);
    expense.sort((a, b) => b.amount - a.amount);

    const totalIncome  = income.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expense.reduce((s, r) => s + r.amount, 0);
    const netProfit    = totalIncome - totalExpense;

    return NextResponse.json({
      income,
      expense,
      totalIncome,
      totalExpense,
      grossProfit: netProfit,
      netProfit,
    });
  } catch (e) {
    console.error("P&L ERROR:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
