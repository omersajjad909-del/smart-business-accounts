import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

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
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const accountId = searchParams.get("accountId");

    const where: any = {};
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);
    if (accountId) where.accountId = accountId;

    const budgets = await prisma.budget.findMany({
      where,
      include: { account: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    // Calculate actual vs budget
    const budgetsWithActual = await Promise.all(
      budgets.map(async (budget: any) => {
        const startDate = new Date(budget.year, budget.month ? budget.month - 1 : 0, 1);
        const endDate = new Date(budget.year, budget.month ? budget.month : 12, 0, 23, 59, 59);

        const entries = await prisma.voucherEntry.findMany({
          where: {
            accountId: budget.accountId,
            voucher: {
              date: { gte: startDate, lte: endDate },
            },
          },
        });

        const actual = entries.reduce((sum: number, e: any) => sum + (e.amount > 0 ? e.amount : 0), 0);
        const variance = budget.amount - actual;
        const variancePercent = budget.amount > 0 ? (variance / budget.amount) * 100 : 0;

        return {
          ...budget,
          actual,
          variance,
          variancePercent,
        };
      })
    );

    return NextResponse.json(budgetsWithActual);
  } catch (e: any) {
    console.error("Budget GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { accountId, year, month, amount, category, description } = body;

    if (!accountId || !year || !amount) {
      return NextResponse.json(
        { error: "Account, year, and amount required" },
        { status: 400 }
      );
    }

    const budget = await prisma.budget.upsert({
      where: {
        accountId_year_month: {
          accountId,
          year: parseInt(year),
          month: month ? parseInt(month) : null,
        },
      },
      update: {
        amount: parseFloat(amount),
        category: category || null,
        description: description || null,
      },
      create: {
        accountId,
        year: parseInt(year),
        month: month ? parseInt(month) : null,
        amount: parseFloat(amount),
        category: category || null,
        description: description || null,
      },
    });

    return NextResponse.json(budget);
  } catch (e: any) {
    console.error("Budget POST Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.CREATE_ACCOUNTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.budget.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Budget DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
