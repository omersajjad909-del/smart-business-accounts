import { NextRequest, NextResponse } from "next/server";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { listCompanyApiKeys } from "@/lib/apiKeys";

function safeJson(details: string | null) {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");
  const companyId = await resolveCompanyId(req);

  const allowed = await apiHasPermission(
    userId,
    userRole,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    companyId
  );

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        country: true,
        baseCurrency: true,
        plan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const [
      logCount30,
      loginCount30,
      ssoConfigLog,
      apiUsageCount30,
      backupSchedule,
      emailSettingsLog,
      latestPlanConfig,
    ] = await Promise.all([
      prisma.activityLog.count({
        where: {
          companyId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      (prisma as any).loginLog?.count
        ? (prisma as any).loginLog.count({
            where: {
              companyId,
              loginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          })
        : Promise.resolve(0),
      prisma.activityLog.findFirst({
        where: { companyId, action: "SSO_CONFIG_UPDATED" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.activityLog.count({
        where: {
          companyId,
          action: "API_KEY_USED",
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.backupSchedule.findUnique({
        where: { companyId },
      }),
      prisma.activityLog.findFirst({
        where: { companyId, action: "EMAIL_SETTINGS_UPDATED" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.activityLog.findFirst({
        where: { action: "PLAN_CONFIG" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const apiKeys = await listCompanyApiKeys(companyId);
    const activeApiKeys = apiKeys.filter((key) => key.status === "active");

    const ssoConfig = safeJson(ssoConfigLog?.details || null) as Record<string, unknown> | null;
    const planConfig = safeJson(latestPlanConfig?.details || null) as Record<string, any> | null;

    const controls = [
      {
        key: "audit_logs",
        label: "Audit activity",
        status: logCount30 > 0 ? "configured" : "attention",
        detail: `${logCount30} activity logs recorded in the last 30 days`,
      },
      {
        key: "sso",
        label: "SSO configuration",
        status: ssoConfig?.enabled ? "configured" : "not_enabled",
        detail: ssoConfig?.enabled
          ? `${String(ssoConfig.providerName || "Provider")} (${String(ssoConfig.providerType || "OIDC")}) is enabled`
          : "SSO is not enabled for this company",
      },
      {
        key: "api_access",
        label: "API access",
        status: activeApiKeys.length > 0 ? "configured" : "not_enabled",
        detail:
          activeApiKeys.length > 0
            ? `${activeApiKeys.length} active API key(s), ${apiUsageCount30} call(s) in the last 30 days`
            : "No active API keys",
      },
      {
        key: "backups",
        label: "Backup schedule",
        status: backupSchedule?.isActive ? "configured" : "attention",
        detail: backupSchedule?.isActive
          ? `${backupSchedule.frequency} backups scheduled at ${backupSchedule.timeOfDay}`
          : "No active backup schedule found",
      },
      {
        key: "email",
        label: "Email operations",
        status: emailSettingsLog ? "configured" : "attention",
        detail: emailSettingsLog
          ? `Email settings updated on ${emailSettingsLog.createdAt.toISOString().slice(0, 10)}`
          : "No email settings update found in activity logs",
      },
      {
        key: "access_reviews",
        label: "Access reviews",
        status: loginCount30 > 0 ? "configured" : "attention",
        detail: `${loginCount30} login event(s) recorded in the last 30 days`,
      },
    ];

    const score = controls.reduce((sum, control) => {
      if (control.status === "configured") return sum + 1;
      if (control.status === "attention") return sum + 0.5;
      return sum;
    }, 0);

    return NextResponse.json({
      company,
      summary: {
        score,
        totalControls: controls.length,
        activeApiKeys: activeApiKeys.length,
        apiUsageCount30,
        logCount30,
        loginCount30,
      },
      controls,
      apiKeys,
      sso: {
        configured: Boolean(ssoConfigLog),
        enabled: Boolean(ssoConfig?.enabled),
        providerName: String(ssoConfig?.providerName || ""),
        providerType: String(ssoConfig?.providerType || ""),
        domainHint: String(ssoConfig?.domainHint || ""),
        updatedAt: ssoConfigLog?.createdAt?.toISOString() || null,
      },
      plan: {
        code: company.plan,
        subscriptionStatus: company.subscriptionStatus,
        hasPlanConfig: Boolean(planConfig),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load compliance report" }, { status: 500 });
  }
}
