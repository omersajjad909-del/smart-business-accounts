import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        country: true,
        baseCurrency: true,
        plan: true,
        activeModules: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        currentPeriodEnd: true,
        createdAt: true,
        businessType: true,
        businessSetupDone: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Users with roles for this company — NO password field
    const userCompanies = await prisma.userCompany.findMany({
      where: { companyId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const users = userCompanies.map((uc: any) => ({
      id: uc.user.id,
      name: uc.user.name,
      email: uc.user.email,
      role: uc.user.role,
      joinedAt: uc.createdAt,
    }));

    // Role breakdown
    const roleCounts: Record<string, number> = {};
    for (const u of users) {
      const r = String(u.role || "USER").toUpperCase();
      roleCounts[r] = (roleCounts[r] || 0) + 1;
    }

    // Recent sessions
    const lastLogin = await prisma.session.findFirst({
      where: { companyId: id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }).catch(() => null);

    // Activity log
    const recentActivity = await prisma.activityLog.findMany({
      where: { companyId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { action: true, createdAt: true, userId: true },
    }).catch(() => []);

    return NextResponse.json({
      company,
      users,
      roleCounts,
      lastLogin: lastLogin?.createdAt || null,
      recentActivity,
      totalUsers: users.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = await req.json();
    const { plan, enabledModules, isActive, subscriptionStatus } = body;

    const before = await prisma.company.findUnique({
      where: { id },
      select: { name: true, plan: true, subscriptionStatus: true, isActive: true },
    });

    const data: Record<string, unknown> = {};
    if (plan !== undefined) data.plan = plan;
    if (enabledModules !== undefined) {
      data.activeModules = Array.isArray(enabledModules) ? enabledModules.join(",") : enabledModules;
    }
    if (isActive !== undefined) data.isActive = isActive;
    if (subscriptionStatus !== undefined) data.subscriptionStatus = subscriptionStatus;

    const updated = await prisma.company.update({ where: { id }, data });

    // Audit log
    await logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "UPDATE_COMPANY",
      targetType: "Company",
      targetId: id,
      targetLabel: before?.name || id,
      companyId: id,
      details: { before, after: data },
    });

    return NextResponse.json({ ok: true, company: { id: updated.id, plan: updated.plan, activeModules: updated.activeModules } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
