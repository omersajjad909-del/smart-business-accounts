import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt, signJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Get real companyId — admin JWT may not include it
  let originCompanyId = payload.isTestMode ? payload.originCompanyId : payload.companyId;
  if (!originCompanyId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { defaultCompanyId: true } });
    originCompanyId = u?.defaultCompanyId || null;
  }

  // Find existing test company for this admin
  let testCompanyId: string | null = null;
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: TEST_ACTION, userId },
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
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const testCompany = await prisma.company.create({
      data: {
        name: `[DEV TEST] ${user?.name || "Admin"}'s Workspace`,
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
      where: { userId_companyId: { userId, companyId: testCompanyId } },
      create: { userId, companyId: testCompanyId, isDefault: false },
      update: {},
    });

    await prisma.activityLog.create({
      data: {
        action: TEST_ACTION,
        userId,
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
    userId,
    companyId: testCompanyId,
    role: "ADMIN",
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
}
