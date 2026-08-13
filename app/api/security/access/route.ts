import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHasPermission } from "@/lib/apiPermission";
import { resolveCompanyId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { listCompanyApiKeys } from "@/lib/apiKeys";
import { getSecurityPolicy, setSecurityPolicy } from "@/lib/securityPolicy";

function safeParse(details: string | null) {
  if (!details) return null;
  try {
    return JSON.parse(details) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");
  const companyId = await resolveCompanyId(req);

  const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_SETTINGS, companyId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  try {
    const [company, sessions, authEvents, ssoConfigLog] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          plan: true,
          subscriptionStatus: true,
          country: true,
          baseCurrency: true,
        },
      }),
      prisma.session.findMany({
        where: { companyId },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.activityLog.findMany({
        where: {
          companyId,
          action: {
            in: [
              "LOGIN",
              "SSO_LOGIN",
              "API_KEY_CREATED",
              "API_KEY_REVOKED",
              "API_KEY_USED",
              "SSO_CONFIG_UPDATED",
            ],
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.activityLog.findFirst({
        where: { companyId, action: "SSO_CONFIG_UPDATED" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const apiKeys = await listCompanyApiKeys(companyId);
    const activeApiKeys = apiKeys.filter((key) => key.status === "active");
    const ssoConfig = safeParse(ssoConfigLog?.details || null);
    const policy = await getSecurityPolicy(companyId);

    // How many users still have to enrol before the policy is actually met.
    const [totalUsers, enrolledUsers] = await Promise.all([
      prisma.user.count({ where: { defaultCompanyId: companyId } }),
      prisma.user.count({ where: { defaultCompanyId: companyId, twoFactorEnabled: true } }),
    ]);

    return NextResponse.json({
      company,
      overview: {
        activeSessions: sessions.length,
        activeApiKeys: activeApiKeys.length,
        ssoEnabled: Boolean(ssoConfig && ssoConfig.enabled),
        twoFactorEnforced: policy.twoFactorEnforced,
        twoFactorEnrolled: enrolledUsers,
        totalUsers,
      },
      sessions: sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        ip: session.ip || "",
        userAgent: session.userAgent || "",
        user: session.user,
      })),
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        keyPreview: key.keyPreview,
        status: key.status,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
      })),
      sso: {
        configured: Boolean(ssoConfigLog),
        enabled: Boolean(ssoConfig && ssoConfig.enabled),
        providerName: String(ssoConfig?.providerName || ""),
        providerType: String(ssoConfig?.providerType || ""),
        domainHint: String(ssoConfig?.domainHint || ""),
        updatedAt: ssoConfigLog?.createdAt?.toISOString() || null,
      },
      authEvents: authEvents.map((event) => {
        const parsed = safeParse(event.details);
        return {
          id: event.id,
          action: event.action,
          createdAt: event.createdAt.toISOString(),
          details: event.details,
          ip: parsed?.ip as string | null ?? null,
          city: parsed?.city as string | null ?? null,
          country: parsed?.country as string | null ?? null,
          userAgent: (parsed?.ua ?? parsed?.userAgent) as string | null ?? null,
          user: event.user,
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load security center" }, { status: 500 });
  }
}

/**
 * POST — update the company security policy (admins only).
 *
 * Body: { twoFactorEnforced: boolean }
 */
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = String(req.headers.get("x-user-role") || "").toUpperCase();
  const companyId = await resolveCompanyId(req);

  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Only an admin can change security policy" }, { status: 403 });
  }
  const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.MANAGE_USERS, companyId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const policy = await setSecurityPolicy(
      companyId,
      { twoFactorEnforced: body?.twoFactorEnforced === true },
      userId,
    );
    return NextResponse.json({ ok: true, policy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save policy" }, { status: 500 });
  }
}

/**
 * DELETE — revoke sessions.
 *
 * The screen listed active sessions with no way to end one, so an admin could
 * see a session they did not recognise and do nothing about it.
 *
 * Body: { sessionId } to end one, or { scope: "others" } to end every session
 * of this company except the caller's own.
 */
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = String(req.headers.get("x-user-role") || "").toUpperCase();
  const companyId = await resolveCompanyId(req);

  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
    const scope = body?.scope === "others" ? "others" : null;

    if (scope === "others") {
      // Anyone may drop their own other sessions; only an admin may clear the
      // whole company.
      const isAdmin = userRole === "ADMIN";
      const result = await prisma.session.deleteMany({
        where: {
          companyId,
          ...(isAdmin ? {} : { userId: userId || "" }),
          ...(body?.keepSessionId ? { id: { not: String(body.keepSessionId) } } : {}),
        },
      });
      return NextResponse.json({ ok: true, revoked: result.count });
    }

    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    // Scope the lookup to this company so an id from another tenant cannot be
    // revoked, and let a non-admin end only their own sessions.
    const session = await prisma.session.findFirst({
      where: { id: sessionId, companyId, ...(userRole === "ADMIN" ? {} : { userId: userId || "" }) },
      select: { id: true },
    });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.session.delete({ where: { id: session.id } });
    await prisma.activityLog.create({
      data: { companyId, userId: userId || null, action: "SESSION_REVOKED", details: JSON.stringify({ sessionId }) },
    }).catch(() => {});

    return NextResponse.json({ ok: true, revoked: 1 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to revoke session" }, { status: 500 });
  }
}
