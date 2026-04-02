import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHasPermission } from "@/lib/apiPermission";
import { resolveCompanyId } from "@/lib/tenant";
import { PERMISSIONS } from "@/lib/permissions";
import { listCompanyApiKeys } from "@/lib/apiKeys";

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

    return NextResponse.json({
      company,
      overview: {
        activeSessions: sessions.length,
        activeApiKeys: activeApiKeys.length,
        ssoEnabled: Boolean(ssoConfig && ssoConfig.enabled),
        twoFactorEnforced: false,
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
      authEvents: authEvents.map((event) => ({
        id: event.id,
        action: event.action,
        createdAt: event.createdAt.toISOString(),
        details: event.details,
        user: event.user,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load security center" }, { status: 500 });
  }
}
