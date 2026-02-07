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
  const centers = await prisma.costCenter.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(centers);
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
  const center = await prisma.costCenter.create({
    data: {
      companyId,
      code: body.code,
      name: body.name,
      isActive: body.isActive !== false,
    },
  });
  await logActivity(prisma, {
    companyId,
    userId,
    action: "COST_CENTER_CREATED",
    details: `Created cost center ${center.code} - ${center.name}`,
  });
  return NextResponse.json(center);
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
  const updated = await prisma.costCenter.updateMany({
    where: { id: body.id, companyId },
    data: {
      code: body.code,
      name: body.name,
      isActive: body.isActive !== false,
    },
  });
  if (!updated.count) {
    return NextResponse.json({ error: "Cost center not found" }, { status: 404 });
  }
  await logActivity(prisma, {
    companyId,
    userId,
    action: "COST_CENTER_UPDATED",
    details: `Updated cost center ${body.id}`,
  });
  const center = await prisma.costCenter.findUnique({ where: { id: body.id } });
  return NextResponse.json(center);
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
  await prisma.costCenter.deleteMany({ where: { id, companyId } });
  await logActivity(prisma, {
    companyId,
    userId,
    action: "COST_CENTER_DELETED",
    details: `Deleted cost center ${id}`,
  });
  return NextResponse.json({ success: true });
}
