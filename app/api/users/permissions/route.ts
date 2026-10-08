import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const userRole = req.headers.get("x-user-role");
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { userId, permissions, denied } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const membership = await prisma.userCompany.findFirst({ where: { userId, companyId } });
  if (!membership) return NextResponse.json({ error: "User not in company" }, { status: 404 });

  await prisma.userPermission.deleteMany({ where: { userId, companyId } });

  // Extras are stored as-is; a removal is stored as "-PERM" so one table
  // carries both without a schema change.
  const rows = [
    ...(Array.isArray(permissions) ? permissions : []).map((p: string) => p.toUpperCase()),
    ...(Array.isArray(denied) ? denied : []).map((p: string) => `-${p.toUpperCase()}`),
  ];
  if (rows.length > 0) {
    await prisma.userPermission.createMany({
      data: rows.map((permission) => ({ userId, permission, companyId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ success: true });
}
