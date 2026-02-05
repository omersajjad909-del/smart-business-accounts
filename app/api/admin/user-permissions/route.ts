import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requirePermission } from "@/lib/requirePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as { prisma?: PrismaClient }).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
}

/* =========================
   GET ? list users + perms
========================= */
export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");

  if (role !== "ADMIN") {
    const guard = await requirePermission(req, PERMISSIONS.MANAGE_USERS);
    if (guard) return guard;
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: { companies: { some: { companyId } } },
    include: {
      permissions: { where: { companyId } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

/* =========================
   POST ? update permissions
========================= */
export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");

  if (role !== "ADMIN") {
    const guard = await requirePermission(req, PERMISSIONS.MANAGE_USERS);
    if (guard) return guard;
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const { userId, permissions } = await req.json();

  if (!userId || !Array.isArray(permissions)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  try {
    const target = await prisma.userCompany.findFirst({
      where: { userId, companyId },
      select: { userId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not in company" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.userPermission.deleteMany({
        where: { userId, companyId },
      }),
      prisma.userPermission.createMany({
        data: permissions.map((p: string) => ({
          userId,
          permission: p,
          companyId,
        })),
      }),
      prisma.activityLog.create({
        data: {
          action: "PERMISSIONS_UPDATED",
          details: `Updated permissions for user ${userId}`,
          userId: userId,
          companyId,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: Any) {
    console.error("TRANSACTION ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

