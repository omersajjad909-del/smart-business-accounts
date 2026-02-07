import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";
import { logActivity } from "@/lib/audit";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const department = searchParams.get("department");
  const month = searchParams.get("month");

  const budgets = await prisma.departmentBudget.findMany({
    where: {
      companyId,
      ...(year ? { year: Number(year) } : {}),
      ...(department ? { department } : {}),
      ...(month ? { month: Number(month) } : {}),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { department: "asc" }],
  });
  return NextResponse.json(budgets);
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role")?.toUpperCase();
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = req.headers.get("x-user-id");
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }
  const body = await req.json();
  if (!body.department || !body.year || !body.amount) {
    return NextResponse.json({ error: "Department, year, amount required" }, { status: 400 });
  }

  const budget = await prisma.departmentBudget.create({
    data: {
      companyId,
      department: body.department,
      year: Number(body.year),
      month: body.month !== undefined && body.month !== null ? Number(body.month) : null,
      amount: Number(body.amount),
      description: body.description || null,
    },
  });

  await logActivity(prisma, {
    companyId,
    userId,
    action: "DEPT_BUDGET_CREATED",
    details: `Dept ${budget.department} ${budget.year}-${budget.month ?? "ANNUAL"}`,
  });

  return NextResponse.json(budget);
}

export async function PUT(req: NextRequest) {
  const role = req.headers.get("x-user-role")?.toUpperCase();
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = req.headers.get("x-user-id");
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const updated = await prisma.departmentBudget.updateMany({
    where: { id: body.id, companyId },
    data: {
      department: body.department,
      year: body.year ? Number(body.year) : undefined,
      month: body.month !== undefined ? Number(body.month) : undefined,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      description: body.description ?? undefined,
    },
  });
  if (!updated.count) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  await logActivity(prisma, {
    companyId,
    userId,
    action: "DEPT_BUDGET_UPDATED",
    details: `Updated budget ${body.id}`,
  });

  const budget = await prisma.departmentBudget.findUnique({ where: { id: body.id } });
  return NextResponse.json(budget);
}

export async function DELETE(req: NextRequest) {
  const role = req.headers.get("x-user-role")?.toUpperCase();
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = req.headers.get("x-user-id");
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  await prisma.departmentBudget.deleteMany({ where: { id, companyId } });
  await logActivity(prisma, {
    companyId,
    userId,
    action: "DEPT_BUDGET_DELETED",
    details: `Deleted budget ${id}`,
  });
  return NextResponse.json({ success: true });
}
