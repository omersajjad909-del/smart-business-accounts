import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, signJwt } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const TEST_ACTION = "ADMIN_DEV_TEST_COMPANY";

export async function POST(req: NextRequest) {
  // This endpoint creates a company and mints a session into it. It used to
  // accept any token whose role was "ADMIN" — which is also every customer's
  // own company owner, so any tenant could spawn test companies on the
  // platform. It now needs a real platform super-admin session.
  const admin = await requireSuperAdmin(req, { page: "dev-test" });
  if (admin instanceof NextResponse) return admin;
  const userId = admin.id;

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

    // Where "Exit test mode" should return to. The admin session carries no
    // company of its own, so this is whatever default company the underlying
    // user row has — null for a platform admin, which the exit route handles.
    const originUser = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { defaultCompanyId: true },
    });
    const originCompanyId = originUser?.defaultCompanyId || null;

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

      // All three writes or none. Previously the company was created first and
      // the UserCompany link could then fail on its foreign key, leaving an
      // orphaned company behind — and because the ActivityLog marker never got
      // written either, the next launch could not find it and made another one.
      // Six dead "Admin's" companies accumulated in the customer list that way.
      testCompanyId = await prisma.$transaction(async (tx) => {
        // Test workspaces draw from their own sequence, exactly as demo
        // sandboxes do.
        //
        // A test workspace is a full Company row — the schema has no lighter
        // way to represent a tenant — but it is not a customer, and taking its
        // number from the customer sequence spent one of theirs every time an
        // admin launched a test. That is what put the visible gap between
        // #100004 and #100015: the numbers in between went to workspaces that
        // no customer will ever see. Demo sandboxes were split out into the
        // 900000s for this same reason; this is the 800000s half of that fix.
        //
        // Falls back to the column default when the sequence has not been
        // created yet, so this route keeps working on a database where
        // manual_company_no_test_split.sql has not been applied.
        const testCompanyNo = await tx
          .$queryRaw<{ no: bigint }[]>`SELECT nextval('"Company_companyNo_test_seq"') AS no`
          .then((rows) => Number(rows[0].no))
          .catch(() => null);

        const testCompany = await tx.company.create({
          data: {
            ...(testCompanyNo ? { companyNo: testCompanyNo } : {}),
            name: `${user?.name || "Admin"}'s (Test)`,
            isActive: true,
            country: "PK",
            baseCurrency: "PKR",
            businessType: String(businessType),
            plan: String(plan).toUpperCase(),
            businessSetupDone: true,
            subscriptionStatus: "ACTIVE",
            // Keeps it out of the customer list, admin metrics and revenue.
            isInternalTest: true,
          },
        });

        await tx.userCompany.upsert({
          where: { userId_companyId: { userId: sessionUserId, companyId: testCompany.id } },
          create: { userId: sessionUserId, companyId: testCompany.id, isDefault: false },
          update: {},
        });

        await tx.activityLog.create({
          data: {
            action: TEST_ACTION,
            userId: sessionUserId,
            companyId: testCompany.id,
            details: JSON.stringify({ testCompanyId: testCompany.id }),
          },
        });

        return testCompany.id;
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
      // Deliberately NOT scope:"admin". The console signs in with its own
      // `sb_admin` cookie now, so a test session no longer has to impersonate
      // an admin token to keep the console reachable — and this token, which
      // lands in a tenant browser, must never carry console authority.
      isTestMode: true,
      originCompanyId,
      testBusinessType: businessType,
      testPlan: plan,
    });

    // The token is returned as well as set: the console lives on its own
    // hostname, so this cookie never reaches the app domain. The page hands the
    // token to /api/auth/impersonate-handoff over there, exactly as
    // "Open as Owner" does.
    const res = NextResponse.json({ ok: true, testCompanyId, token: testToken });

    // Preserve whatever tenant session was open so "Exit test mode" can put it
    // back. An admin launching from the console usually has none.
    const previousTenantToken = getTokenFromRequest(req);
    if (previousTenantToken) {
      res.cookies.set("sb_auth_backup", previousTenantToken, {
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
