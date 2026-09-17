import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SESSION_TTL_MS, getTokenFromRequest, signJwt } from "@/lib/auth";
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

    /* The existing test workspace for this admin AND THIS BUSINESS TYPE.
    
       There used to be one test company per admin, full stop, and launching a
       different business type simply rewrote `businessType` on it. So a
       manufacturer's purchase invoices, items and BOMs were still sitting
       there when the same admin launched a travel agency — one workspace
       wearing whatever trade was asked for last, with every trade's data piled
       up inside it. A test workspace exists to be a clean room; one that keeps
       the last tenant's furniture is worse than none, because the data looks
       plausible.
    
       Keyed on the business type now. Switching trades gets its own company
       and its own books, and switching back returns to the one you left. */
    const wantedType = String(businessType);
    let testCompanyId: string | null = null;
    try {
      const logs = await prisma.activityLog.findMany({
        where: { action: TEST_ACTION, userId: sessionUserId },
        orderBy: { createdAt: "desc" },
      });
      for (const log of logs) {
        if (!log.details) continue;
        let marked: { testCompanyId?: string; businessType?: string };
        try {
          marked = JSON.parse(log.details);
        } catch {
          continue;
        }
        if (!marked.testCompanyId) continue;

        /* Markers written before this fix carry no business type. Fall back to
           what the company itself currently says, so an admin's existing test
           workspace is still found rather than a duplicate being made beside
           it — and so the manufacturing data stays with manufacturing instead
           of being inherited by the next trade. */
        const markedType = marked.businessType
          || (await prisma.company.findUnique({
              where: { id: marked.testCompanyId },
              select: { businessType: true },
            }).catch(() => null))?.businessType;

        if (markedType === wantedType) {
          testCompanyId = marked.testCompanyId;
          break;
        }
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
            // Named with its trade, because an admin now has one of these per
            // business type and "Admin's (Test)" three times over is not a list
            // anybody can use.
            name: `${user?.name || "Admin"}'s ${wantedType} (Test)`,
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
            // The business type is what the next launch looks this company up
            // by. Without it the lookup falls back to reading the company row,
            // which is how every trade ended up sharing one workspace.
            details: JSON.stringify({ testCompanyId: testCompany.id, businessType: wantedType }),
          },
        });

        return testCompany.id;
      });
    } else {
      /* Only the plan moves. `businessType` is what this workspace was found
         by, so writing it again is a no-op — and writing a DIFFERENT one is
         exactly the bug this replaced. A plan change is safe: it opens and
         closes pages, it does not mix one trade's books into another's. */
      await prisma.company.update({
        where: { id: testCompanyId },
        data: {
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

    /* As long as the token itself, which is a normal session's length.
    
       It was eight hours, against a token good for a week — so on this host the
       session ended in the middle of a working day for no reason the admin
       could see. A test session ends when the admin ends it, from "Exit test
       mode"; until then the only thing that should close it is the same
       inactivity that closes anybody else's login. */
    res.cookies.set("sb_auth", testToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(DEFAULT_SESSION_TTL_MS / 1000),
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
