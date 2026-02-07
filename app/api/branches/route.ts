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
  const branches = await prisma.branch.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(branches);
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
  if (!body.code || !body.name) {
    return NextResponse.json({ error: "Code and name required" }, { status: 400 });
  }
  const branch = await prisma.branch.create({
    data: {
      companyId,
      code: body.code,
      name: body.name,
      city: body.city || null,
      isActive: body.isActive !== false,
    },
  });
  await logActivity(prisma, {
    companyId,
    userId,
    action: "BRANCH_CREATED",
    details: `Created branch ${branch.code} - ${branch.name}`,
  });
  return NextResponse.json(branch);
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
  const updated = await prisma.branch.updateMany({
    where: { id: body.id, companyId },
    data: {
      code: body.code,
      name: body.name,
      city: body.city || null,
      isActive: body.isActive !== false,
    },
  });
  if (!updated.count) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }
  await logActivity(prisma, {
    companyId,
    userId,
    action: "BRANCH_UPDATED",
    details: `Updated branch ${body.id}`,
  });
  const branch = await prisma.branch.findUnique({ where: { id: body.id } });
  return NextResponse.json(branch);
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
  await prisma.branch.deleteMany({ where: { id, companyId } });
  await logActivity(prisma, {
    companyId,
    userId,
    action: "BRANCH_DELETED",
    details: `Deleted branch ${id}`,
  });
  return NextResponse.json({ success: true });
}
