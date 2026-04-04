import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyJwt(token);
    if (!payload?.userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true, name: true, email: true, role: true,
        companyId: true, defaultCompanyId: true,
        permissions: { select: { permission: true, companyId: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const companyId = payload.companyId || user.defaultCompanyId || user.companyId || null;

    const companies = await prisma.userCompany.findMany({
      where: { userId: user.id },
      include: { company: { select: { id: true, name: true, code: true } } },
    }).catch(() => []);

    const userPermissions = (user.permissions || [])
      .filter((p: any) => !companyId || p.companyId === companyId)
      .map((p: any) => p.permission);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role || "VIEWER").toUpperCase(),
      companyId,
      permissions: userPermissions,
      rolePermissions: [],
      companies: companies.map((c: any) => ({
        id: c.companyId,
        name: c.company?.name,
        code: c.company?.code,
        isDefault: c.isDefault,
      })),
    };

    return NextResponse.json({ user: safeUser });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
