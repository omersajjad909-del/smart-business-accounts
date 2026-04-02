import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth";

type StoredSsoConfig = {
  enabled?: boolean;
  providerType?: "SAML" | "OIDC";
  providerName?: string;
  domainHint?: string;
  entryPoint?: string;
  clientId?: string;
  callbackUrl?: string;
};

async function findConfigByDomain(domain: string) {
  const logs = await prisma.activityLog.findMany({
    where: {
      action: "SSO_CONFIG_UPDATED",
      details: { contains: domain } as any,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  for (const log of logs) {
    try {
      const parsed = JSON.parse(log.details || "{}") as StoredSsoConfig;
      if (
        log.companyId &&
        parsed.enabled &&
        parsed.providerType === "OIDC" &&
        String(parsed.domainHint || "").toLowerCase() === domain
      ) {
        return { companyId: log.companyId, config: parsed };
      }
    } catch {}
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid work email is required" }, { status: 400 });
    }

    const domain = email.split("@")[1] || "";
    const match = await findConfigByDomain(domain);
    if (!match) {
      return NextResponse.json({ error: "No active SSO configuration found for this email domain" }, { status: 404 });
    }

    const { companyId, config } = match;
    if (!config.entryPoint || !config.clientId || !config.callbackUrl) {
      return NextResponse.json({ error: "SSO configuration is incomplete" }, { status: 400 });
    }

    const state = signJwt({
      email,
      companyId,
      domain,
      exp: Date.now() + 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
      login_hint: email,
    });

    return NextResponse.json({
      redirectUrl: `${config.entryPoint}?${params.toString()}`,
      providerName: config.providerName || "SSO Provider",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to start SSO sign-in" }, { status: 500 });
  }
}
