import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    // Platform admins (role=ADMIN) are managed exclusively from Admin Team
    // (/admin/team) — excluding them here keeps this list to company users
    // only, so an admin account can't be selected and deleted alongside a
    // customer's user by mistake, the way "finovaos.app@gmail.com" was.
    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
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

    const rows = users.map((u) => ({
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
