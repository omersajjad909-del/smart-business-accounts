import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { getCompanyExtraSeats, getEffectiveUserLimitForCompany } from "@/lib/companySeatLimit";
import { getStoredPhoneForUser } from "@/lib/verification";
import { resolveCompanyRef } from "@/lib/companyRefServer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    // The route param is a companyNo ("100004") on every link the admin UI
    // renders now; a raw UUID still resolves so old bookmarks keep working.
    const { id: ref } = await params;
    const id = await resolveCompanyRef(ref);
    if (!id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        companyNo: true,
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

    // stripeCustomerId holds whichever gateway's id arrived on the activating
    // webhook, so ship the provider along and let the UI label it honestly.
    const sub = await prisma.subscription.findUnique({
      where: { companyId: id },
      select: { provider: true },
    });

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

    // Phone lives in the signup activity log, not on User — see
    // getStoredPhoneForUser. Never blocks the page if a lookup fails.
    const phones = await Promise.all(
      userCompanies.map((uc: any) =>
        getStoredPhoneForUser(uc.user.id).catch(() => null)
      )
    );

    const users = userCompanies.map((uc: any, i: number) => ({
      id: uc.user.id,
      name: uc.user.name,
      email: uc.user.email,
      phone: phones[i] || null,
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

    const extraSeats = await getCompanyExtraSeats(id);
    const effectiveUserLimit = await getEffectiveUserLimitForCompany(id, company.plan);

    return NextResponse.json({
      company: { ...company, billingProvider: sub?.provider || null },
      users,
      roleCounts,
      lastLogin: lastLogin?.createdAt || null,
      recentActivity,
      totalUsers: users.length,
      extraSeats,
      effectiveUserLimit,
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
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { id: ref } = await params;
    const id = await resolveCompanyRef(ref);
    if (!id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { plan, enabledModules, isActive, subscriptionStatus, extraSeats } = body;

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

    if (extraSeats !== undefined && extraSeats !== null) {
      const seatValue = Number(extraSeats);
      if (Number.isFinite(seatValue) && seatValue >= 0) {
        await prisma.activityLog.create({
          data: {
            companyId: id,
            userId: admin.id,
            action: "ADMIN_SEAT_OVERRIDE",
            details: JSON.stringify({
              extraSeats: Math.floor(seatValue),
              source: "admin_company_patch",
              adminId: admin.id,
              adminEmail: admin.email,
              timestamp: new Date().toISOString(),
            }),
          },
        }).catch(() => {});
      }
    }

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

    const latestExtraSeats = await getCompanyExtraSeats(id);
    const effectiveUserLimit = await getEffectiveUserLimitForCompany(id, updated.plan);
    return NextResponse.json({
      ok: true,
      company: {
        id: updated.id,
        plan: updated.plan,
        activeModules: updated.activeModules,
        extraSeats: latestExtraSeats,
        effectiveUserLimit,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
