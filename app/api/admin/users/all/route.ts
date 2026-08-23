import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    // Company owners get role="ADMIN" too (every signup creates one), so
    // role alone can't identify a platform admin. Only exclude the true
    // platform admins here — role="ADMIN" with zero companies, like
    // "finovaos.app@gmail.com" — those are managed exclusively from
    // /admin/team and should never be selectable for deletion from this list.
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        twoFactorEnabled: true,
        companies: {
          select: { company: { select: { id: true, name: true, plan: true } } },
          take: 1,
        },
      },
    });

    const rows = users
      .filter((u) => !(u.role === "ADMIN" && u.companies.length === 0))
      .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt.toISOString(),
      twoFactorEnabled: u.twoFactorEnabled,
      companyId: u.companies[0]?.company?.id || null,
      companyName: u.companies[0]?.company?.name || null,
      companyPlan: u.companies[0]?.company?.plan || null,
    }));

    const totalUsers = rows.length;
    const activeUsers = rows.filter((u) => u.active).length;
    const inactiveUsers = totalUsers - activeUsers;

    return NextResponse.json({ rows, stats: { totalUsers, activeUsers, inactiveUsers } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
