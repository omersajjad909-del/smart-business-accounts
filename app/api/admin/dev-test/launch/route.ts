import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt, signJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const TEST_ACTION = "ADMIN_DEV_TEST_COMPANY";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  // Admin JWT uses `id`, regular user JWT uses `userId`
  const userId = payload?.userId || payload?.id;
  if (!userId || payload?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessType, plan } = await req.json();
  if (!businessType || !plan) {
    return NextResponse.json({ error: "businessType and plan required" }, { status: 400 });
  }

  try {
    // A platform admin can come from either of two unrelated tables: a User row
    // (super admin) or an AdminUser row (team member). Only a User id satisfies
    // UserCompany_userId_fkey and ActivityLog's user relation, and the dashboard
    // itself loads the session through prisma.user.findUnique — so an AdminUser
    // id cannot drive a test session at all. That mismatch was the 500: the
    // upsert below was handed an id that does not exist in "User".
    //
    // For a team member we therefore keep one dedicated, reusable test user
    // alongside the test company. The email is derived from the admin id so
    // this stays idempotent across launches, and .local is reserved so the
    // address can never collide with or reach a real inbox.
    const adminId = userId;
    let sessionUserId = adminId;

    const adminIsRealUser = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true },
    });

    if (!adminIsRealUser) {
      const shadowEmail = `devtest+${adminId}@finovaos.local`;
      const adminName =
        (await (prisma as any).adminUser?.findUnique({
          where: { id: adminId },
          select: { name: true },
        }).catch(() => null))?.name || "Admin";

      const shadowUser = await prisma.user.upsert({
        where: { email: shadowEmail },
        update: {},
        create: {
          name: `${adminName} (Dev Test)`,
          email: shadowEmail,
          // Never used to sign in — the session is minted directly below. A
          // random hash keeps the column honest rather than leaving a guessable
          // or empty credential on a role:"ADMIN" row.
          password: await bcrypt.hash(randomUUID(), 10),
          role: "ADMIN",
        },
        select: { id: true },
      });
      sessionUserId = shadowUser.id;
    }

    // Get real companyId — admin JWT may not include it
    let originCompanyId = payload.isTestMode ? payload.originCompanyId : payload.companyId;
    if (!originCompanyId) {
      const u = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { defaultCompanyId: true } });
      originCompanyId = u?.defaultCompanyId || null;
    }

    // Find existing test company for this admin
    let testCompanyId: string | null = null;
    try {
      const log = await prisma.activityLog.findFirst({
        where: { action: TEST_ACTION, userId: sessionUserId },
        orderBy: { createdAt: "desc" },
      });
      if (log?.details) {
        const d = JSON.parse(log.details);
        testCompanyId = d.testCompanyId || null;
      }
    } catch {}

    // Verify company still exists
    if (testCompanyId) {
      const exists = await prisma.company.findUnique({ where: { id: testCompanyId } });
      if (!exists) testCompanyId = null;
    }

    if (!testCompanyId) {
      const user = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { name: true } });
      const testCompany = await prisma.company.create({
        data: {
          name: `${user?.name || "Admin"}'s`,
          isActive: true,
          country: "PK",
          baseCurrency: "PKR",
          businessType: String(businessType),
          plan: String(plan).toUpperCase(),
          businessSetupDone: true,
          subscriptionStatus: "ACTIVE",
        },
      });
      testCompanyId = testCompany.id;

      await prisma.userCompany.upsert({
        where: { userId_companyId: { userId: sessionUserId, companyId: testCompanyId } },
        create: { userId: sessionUserId, companyId: testCompanyId, isDefault: false },
        update: {},
      });

      await prisma.activityLog.create({
        data: {
          action: TEST_ACTION,
          userId: sessionUserId,
          companyId: testCompanyId,
          details: JSON.stringify({ testCompanyId }),
        },
      });
    } else {
      await prisma.company.update({
        where: { id: testCompanyId },
        data: {
          businessType: String(businessType),
          plan: String(plan).toUpperCase(),
          businessSetupDone: true,
          subscriptionStatus: "ACTIVE",
        },
      });
    }

    const testToken = signJwt({
      userId: sessionUserId,
      companyId: testCompanyId,
      role: "ADMIN",
      // proxy.ts redirects any /admin page whose token lacks scope:"admin" to the
      // login screen. This token overwrites sb_auth, so omitting the scope locked
      // the admin out of the console the moment a test session started.
      scope: "admin",
      isTestMode: true,
      originCompanyId,
      testBusinessType: businessType,
      testPlan: plan,
    });

    const res = NextResponse.json({ ok: true, testCompanyId });

    if (token) {
      res.cookies.set("sb_auth_backup", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60,
      });
    }

    res.cookies.set("sb_auth", testToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[dev-test/launch] failed:", err);
    // This route is admin-only, so returning the real reason is safe here and
    // is the difference between a debuggable failure and a silent one.
    return NextResponse.json(
      { error: `Launch failed: ${message}` },
      { status: 500 },
    );
  }
}
