import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

function getPeriodRange(period: string) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "this_week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(now.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "last_month") {
    start.setMonth(now.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === "this_year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  end.setMonth(now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "this_month";
  const { start, end } = getPeriodRange(period);

  const branches = await prisma.branch.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, city: true, isActive: true },
  });

  const branchIds = branches.map((branch) => branch.id);

  const [sales, purchases, expenses, items] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { companyId, branchId: { in: branchIds }, date: { gte: start, lte: end } },
      select: { branchId: true, total: true, customerId: true },
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId, branchId: { in: branchIds }, date: { gte: start, lte: end } },
      select: { branchId: true, total: true },
    }),
    prisma.expenseVoucher.findMany({
      where: { companyId, branchId: { in: branchIds }, date: { gte: start, lte: end } },
      select: { branchId: true, totalAmount: true },
    }),
    prisma.salesInvoiceItem.findMany({
      where: {
        invoice: {
          companyId,
          branchId: { in: branchIds },
          date: { gte: start, lte: end },
        },
      },
      select: {
        qty: true,
        invoice: { select: { branchId: true } },
        item: { select: { name: true } },
      },
    }),
  ]);

  const branchMap = new Map(
    branches.map((branch) => [
      branch.id,
      {
        ...branch,
        sales: 0,
        purchases: 0,
        expenses: 0,
        profit: 0,
        transactions: 0,
        customers: 0,
        topItemsMap: new Map<string, number>(),
      },
    ]),
  );

  const customerSets = new Map<string, Set<string>>();
  for (const branch of branches) customerSets.set(branch.id, new Set<string>());

  for (const row of sales) {
    if (!row.branchId) continue;
    const branch = branchMap.get(row.branchId);
    if (!branch) continue;
    branch.sales += Number(row.total || 0);
    branch.transactions += 1;
    if (row.customerId) customerSets.get(row.branchId)?.add(row.customerId);
  }

  for (const row of purchases) {
    if (!row.branchId) continue;
    const branch = branchMap.get(row.branchId);
    if (!branch) continue;
    branch.purchases += Number(row.total || 0);
  }

  for (const row of expenses) {
    if (!row.branchId) continue;
    const branch = branchMap.get(row.branchId);
    if (!branch) continue;
    branch.expenses += Number(row.totalAmount || 0);
  }

  for (const row of items) {
    const branchId = row.invoice.branchId;
    if (!branchId) continue;
    const branch = branchMap.get(branchId);
    if (!branch) continue;
    const name = row.item.name || "Unnamed Item";
    branch.topItemsMap.set(name, (branch.topItemsMap.get(name) || 0) + Number(row.qty || 0));
  }

  const branchRows = Array.from(branchMap.values()).map((branch) => {
    const customersCount = customerSets.get(branch.id)?.size || 0;
    const topItems = Array.from(branch.topItemsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      city: branch.city,
      isActive: branch.isActive,
      sales: branch.sales,
      purchases: branch.purchases,
      expenses: branch.expenses,
      profit: branch.sales - branch.purchases - branch.expenses,
      transactions: branch.transactions,
      customers: customersCount,
      topItems,
    };
  });

  return NextResponse.json({
    period,
    branches: branchRows,
    summary: {
      sales: branchRows.reduce((sum, row) => sum + row.sales, 0),
      purchases: branchRows.reduce((sum, row) => sum + row.purchases, 0),
      expenses: branchRows.reduce((sum, row) => sum + row.expenses, 0),
      profit: branchRows.reduce((sum, row) => sum + row.profit, 0),
      transactions: branchRows.reduce((sum, row) => sum + row.transactions, 0),
      customers: branchRows.reduce((sum, row) => sum + row.customers, 0),
    },
  });
}
