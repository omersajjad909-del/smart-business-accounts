import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

type SsoConfig = {
  enabled: boolean;
  providerType: "SAML" | "OIDC";
  providerName: string;
  domainHint: string;
  issuer: string;
  entryPoint: string;
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  callbackUrl: string;
  logoutUrl: string;
  certificate: string;
  updatedAt?: string;
};

function getSessionContext(req: NextRequest) {
  const headerUserId = String(req.headers.get("x-user-id") || "").trim();
  const headerCompanyId = String(req.headers.get("x-company-id") || "").trim();
  if (headerUserId && headerCompanyId) return { userId: headerUserId, companyId: headerCompanyId };

  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  const userId = String(payload?.userId || "").trim();
  const companyId = String(payload?.companyId || "").trim();
  if (!userId || !companyId) return null;
  return { userId, companyId };
}

function emptyConfig(companyId: string): SsoConfig {
  return {
    enabled: false,
    providerType: "SAML",
    providerName: "",
    domainHint: "",
    issuer: "",
    entryPoint: "",
      clientId: "",
      clientSecret: "",
      tokenEndpoint: "",
      userInfoEndpoint: "",
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app"}/sso?company=${companyId}`,
      logoutUrl: "",
      certificate: "",
  };
}

export async function GET(req: NextRequest) {
  const session = getSessionContext(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const latest = await prisma.activityLog.findFirst({
      where: {
        companyId: session.companyId,
        action: "SSO_CONFIG_UPDATED",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!latest?.details) {
      return NextResponse.json({ config: emptyConfig(session.companyId) });
    }

    const parsed = JSON.parse(latest.details) as SsoConfig;
    return NextResponse.json({
      config: {
        ...emptyConfig(session.companyId),
        ...parsed,
        updatedAt: latest.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load SSO config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionContext(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<SsoConfig>;
    const config: SsoConfig = {
      enabled: Boolean(body.enabled),
      providerType: body.providerType === "OIDC" ? "OIDC" : "SAML",
      providerName: String(body.providerName || "").trim(),
      domainHint: String(body.domainHint || "").trim().toLowerCase(),
      issuer: String(body.issuer || "").trim(),
      entryPoint: String(body.entryPoint || "").trim(),
      clientId: String(body.clientId || "").trim(),
      clientSecret: String(body.clientSecret || "").trim(),
      tokenEndpoint: String(body.tokenEndpoint || "").trim(),
      userInfoEndpoint: String(body.userInfoEndpoint || "").trim(),
      callbackUrl:
        String(body.callbackUrl || "").trim() ||
        `${process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app"}/api/auth/sso/callback`,
      logoutUrl: String(body.logoutUrl || "").trim(),
      certificate: String(body.certificate || "").trim(),
    };

    await prisma.activityLog.create({
      data: {
        action: "SSO_CONFIG_UPDATED",
        companyId: session.companyId,
        userId: session.userId,
        details: JSON.stringify(config),
      },
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save SSO config" }, { status: 500 });
  }
}
