import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { apiHasPermission } from "@/lib/apiPermission";
import { requireEntitlement } from "@/lib/subscriptionGuard";

type EntryWithAccount = Prisma.VoucherEntryGetPayload<{ include: { account: true } }>;

const FINANCE_RE    = /\b(interest|finance.?charg|bank.?charg|loan|markup|bnpl|exchange.?loss)\b/i;
const TAX_RE        = /\b(income.?tax|corporate.?tax|withhold|tax.?payable)\b/i;

function pct(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 10000) / 100;
}

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

    // ── 1. GROSS SALES ──────────────────────────────────────────────
    const salesInvoices = await prisma.salesInvoice.findMany({
      where: {
        companyId,
        date: { gte: fromDate, lte: toDate },
        deletedAt: null,
        approvalStatus: { not: "REJECTED" },
        ...(branchId ? { branchId } : {}),
      },
      select: { total: true, discount: true, freight: true, invoiceNo: true },
    });
    const salesInvoiceNos = new Set(salesInvoices.map(s => s.invoiceNo));
    const grossSalesFromSI   = salesInvoices.reduce((s, r) => s + (r.total || 0), 0);
    const salesDiscountsFromSI = salesInvoices.reduce((s, r) => s + (r.discount || 0), 0);

    // POS sales not already covered by a SalesInvoice voucher
    const posRecords = await prisma.businessRecord.findMany({
      where: { companyId, category: "pos_sale", createdAt: { gte: fromDate, lte: toDate } },
      select: { amount: true, data: true },
    });
    let posSales = 0;
    for (const rec of posRecords) {
      const d = rec.data as Record<string, unknown>;
      const invNo = (d?.invoiceNo || d?.posInvoiceNo || d?.receiptNo) as string | undefined;
      if (invNo && salesInvoiceNos.has(invNo)) continue;
      posSales += Number(rec.amount) || 0;
    }
    const grossSales    = grossSalesFromSI + posSales;
    const salesDiscounts = salesDiscountsFromSI;

    // ── 2. SALES RETURNS ────────────────────────────────────────────
    const saleReturns = await prisma.saleReturn.findMany({
      where: { companyId, date: { gte: fromDate, lte: toDate } },
      select: { total: true },
    });
    const salesReturns = saleReturns.reduce((s, r) => s + (r.total || 0), 0);

    const netSales = Math.max(0, grossSales - salesReturns - salesDiscounts);

    // ── 3. OPENING / CLOSING STOCK (from InventoryTxn) ──────────────
    const [invBefore, invUpTo] = await Promise.all([
      prisma.inventoryTxn.groupBy({
        by: ["type"],
        where: { companyId, date: { lt: fromDate } },
        _sum: { amount: true },
      }),
      prisma.inventoryTxn.groupBy({
        by: ["type"],
        where: { companyId, date: { lte: toDate } },
        _sum: { amount: true },
      }),
    ]);

    const toMap = (rows: { type: string; _sum: { amount: number | null } }[]) =>
      Object.fromEntries(rows.map(r => [r.type, r._sum.amount || 0]));

    const bMap = toMap(invBefore);
    const uMap = toMap(invUpTo);

    const openingStock = Math.max(0,
      (bMap["PURCHASE"] || 0) - (bMap["SALE"] || 0) + (bMap["SALE_RETURN"] || 0) - (bMap["PURCHASE_RETURN"] || 0)
    );
    const closingStock = Math.max(0,
      (uMap["PURCHASE"] || 0) - (uMap["SALE"] || 0) + (uMap["SALE_RETURN"] || 0) - (uMap["PURCHASE_RETURN"] || 0)
    );

    // Purchase returns during the period (from InventoryTxn)
    const invPeriod = await prisma.inventoryTxn.groupBy({
      by: ["type"],
      where: { companyId, date: { gte: fromDate, lte: toDate } },
      _sum: { amount: true },
    });
    const pMap = toMap(invPeriod);
    const purchaseReturns = pMap["PURCHASE_RETURN"] || 0;

    // ── 4. PURCHASES ────────────────────────────────────────────────
    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        date: { gte: fromDate, lte: toDate },
        deletedAt: null,
        approvalStatus: { not: "REJECTED" },
        ...(branchId ? { branchId } : {}),
      },
      select: { total: true, freight: true, discount: true },
    });
    // Gross purchases (before discount, before freight) since total = subtotal - discount + freight
    const purchases         = purchaseInvoices.reduce((s, r) => s + (r.total || 0) + (r.discount || 0) - (r.freight || 0), 0);
    const freightInward     = purchaseInvoices.reduce((s, r) => s + (r.freight  || 0), 0);
    const purchaseDiscounts = purchaseInvoices.reduce((s, r) => s + (r.discount || 0), 0);

    // COGS = Opening + Purchases + Freight − PurchaseDiscounts − PurchaseReturns − Closing
    const cogs = Math.max(0, openingStock + purchases + freightInward - purchaseDiscounts - purchaseReturns - closingStock);

    const grossProfit    = netSales - cogs;
    const grossMarginPct = pct(grossProfit, netSales);

    // ── 5. OPERATING EXPENSES & OTHER from journal entries ───────────
    const journalEntries = await prisma.voucherEntry.findMany({
      where: {
        voucher: {
          date: { gte: fromDate, lte: toDate },
          companyId,
          type: { notIn: ["SI", "PI"] },
          ...(branchId ? { branchId } : {}),
        },
        account: { type: { in: ["EXPENSE", "COST", "INCOME", "REVENUE"] }, companyId },
      },
      include: { account: true },
    });

    const opExMap:      Record<string, number> = {};
    const financeMap:   Record<string, number> = {};
    const taxMapAcc:    Record<string, number> = {};
    const otherIncMap:  Record<string, number> = {};

    for (const e of journalEntries as EntryWithAccount[]) {
      const amt  = Number(e.amount);
      const name = e.account.name;
      const type = (e.account.type || "").toUpperCase();
      if (Math.abs(amt) < 0.0001) continue;

      if (type === "EXPENSE" || type === "COST") {
        if (amt <= 0) continue; // only debit-side expenses
        if (TAX_RE.test(name))     taxMapAcc[name]  = (taxMapAcc[name]  || 0) + amt;
        else if (FINANCE_RE.test(name)) financeMap[name] = (financeMap[name] || 0) + amt;
        else                       opExMap[name]    = (opExMap[name]    || 0) + amt;
      } else if (type === "INCOME" || type === "REVENUE") {
        otherIncMap[name] = (otherIncMap[name] || 0) + Math.abs(amt);
      }
    }

    const toArr = (m: Record<string, number>) =>
      Object.entries(m).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

    const operatingExpenses   = toArr(opExMap);
    const financeExpenses     = toArr(financeMap);
    const otherIncome         = toArr(otherIncMap);
    const taxEntries          = toArr(taxMapAcc);

    const totalOpEx           = operatingExpenses.reduce((s, r) => s + r.amount, 0);
    const totalFinanceExpenses = financeExpenses.reduce((s, r) => s + r.amount, 0);
    const totalOtherIncome    = otherIncome.reduce((s, r) => s + r.amount, 0);
    const taxAmount           = taxEntries.reduce((s, r) => s + r.amount, 0);

    const operatingProfit     = grossProfit - totalOpEx;
    const operatingMarginPct  = pct(operatingProfit, netSales);
    const netOtherIncome      = totalOtherIncome - totalFinanceExpenses;
    const ebt                 = operatingProfit + netOtherIncome;
    const netProfit           = ebt - taxAmount;
    const netMarginPct        = pct(netProfit, netSales);

    return NextResponse.json({
      // Revenue
      grossSales, salesReturns, salesDiscounts, netSales,
      // COGS
      openingStock, purchases, freightInward, purchaseDiscounts, purchaseReturns, closingStock, cogs,
      // Gross Profit
      grossProfit, grossMarginPct,
      // Operating Expenses
      operatingExpenses, totalOpEx,
      // EBIT
      operatingProfit, operatingMarginPct,
      // Other
      otherIncome, totalOtherIncome,
      financeExpenses, totalFinanceExpenses,
      // EBT
      ebt,
      // Tax
      taxEntries, taxAmount,
      // Net Profit
      netProfit, netMarginPct,
      // Legacy fields (for backward compat if anything reads these)
      totalIncome: netSales + totalOtherIncome,
      totalExpense: cogs + totalOpEx + totalFinanceExpenses + taxAmount,
      income: [{ name: "Net Sales", amount: netSales }, ...otherIncome],
      expense: [
        { name: "Purchases / Cost of Goods", amount: cogs },
        ...operatingExpenses, ...financeExpenses,
      ],
    });
  } catch (e) {
    console.error("P&L ERROR:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
