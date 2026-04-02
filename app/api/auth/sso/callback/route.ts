import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signJwt, verifyJwt } from "@/lib/auth";

type StoredSsoConfig = {
  enabled?: boolean;
  providerType?: "SAML" | "OIDC";
  providerName?: string;
  domainHint?: string;
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
};

function decodeJwtPayload(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function randomPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code") || "";
    const state = req.nextUrl.searchParams.get("state") || "";
    const providerError = req.nextUrl.searchParams.get("error") || "";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;

    if (providerError) {
      return NextResponse.redirect(`${baseUrl}/sso?error=${encodeURIComponent(providerError)}`);
    }
    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/sso?error=${encodeURIComponent("Missing callback parameters")}`);
    }

    const statePayload = verifyJwt(state);
    const companyId = String(statePayload?.companyId || "").trim();
    const requestedEmail = String(statePayload?.email || "").trim().toLowerCase();
    const exp = Number(statePayload?.exp || 0);
    if (!companyId || !requestedEmail || !exp || Date.now() > exp) {
      return NextResponse.redirect(`${baseUrl}/sso?error=${encodeURIComponent("SSO session expired. Please try again.")}`);
    }

    const configLog = await prisma.activityLog.findFirst({
      where: {
        companyId,
        action: "SSO_CONFIG_UPDATED",
      },
      orderBy: { createdAt: "desc" },
    });
    const config = (configLog?.details ? JSON.parse(configLog.details) : null) as StoredSsoConfig | null;
    if (!config?.enabled || config.providerType !== "OIDC") {
      return NextResponse.redirect(`${baseUrl}/sso?error=${encodeURIComponent("OIDC SSO is not enabled for this company.")}`);
    }
    if (!config.tokenEndpoint || !config.clientId || !config.callbackUrl) {
      return NextResponse.redirect(`${baseUrl}/sso?error=${encodeURIComponent("OIDC configuration is incomplete.")}`);
    }

    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
    });
    if (config.clientSecret) {
      tokenBody.set("client_secret", config.clientSecret);
    }

    const tokenRes = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
      cache: "no-store",
    });
    const tokenJson = await tokenRes.json().catch(() => ({}));
    const accessToken = String(tokenJson?.access_token || "");
    const idToken = String(tokenJson?.id_token || "");

    if (!accessToken && !idToken) {
      return NextResponse.redirect(`${baseUrl}/sso?error=${encodeURIComponent("SSO token exchange failed.")}`);
    }

    let profile: Record<string, unknown> | null = null;
    if (config.userInfoEndpoint && accessToken) {
      const infoRes = await fetch(config.userInfoEndpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (infoRes.ok) {
        profile = (await infoRes.json()) as Record<string, unknown>;
      }
    }
    if (!profile && idToken) {
      profile = decodeJwtPayload(idToken);
    }

    const email = String(profile?.email || requestedEmail).trim().toLowerCase();
    const name = String(profile?.name || profile?.given_name || email.split("@")[0] || "SSO User").trim();
    const domain = email.split("@")[1] || "";
    if (!email || !domain || String(config.domainHint || "").toLowerCase() !== domain) {
      return NextResponse.redirect(`${baseUrl}/sso?error=${encodeURIComponent("SSO email domain is not allowed for this company.")}`);
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: { permissions: true },
    });

    if (!user) {
      const password = await bcrypt.hash(randomPassword(), 10);
      user = await prisma.user.create({
        data: {
          name,
          email,
          password,
          role: "VIEWER",
          active: true,
          defaultCompanyId: companyId,
          companies: {
            create: { companyId, isDefault: true },
          },
        },
        include: { permissions: true },
      }) as any;
    } else {
      const existingLink = await prisma.userCompany.findUnique({
        where: { userId_companyId: { userId: user.id, companyId } },
      });
      if (!existingLink) {
        await prisma.userCompany.create({
          data: { userId: user.id, companyId, isDefault: !user.defaultCompanyId },
        });
      }
      if (!user.defaultCompanyId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { defaultCompanyId: companyId },
        });
      }
    }

    if (!user) throw new Error("User creation failed");

    const companies = await prisma.userCompany.findMany({
      where: { userId: user.id },
      include: { company: true },
    });
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role, companyId },
      select: { permission: true },
    });
    const userPermissions = (user.permissions || [])
      .filter((permission: any) => !permission.companyId || permission.companyId === companyId)
      .map((permission: any) => permission.permission || permission);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toUpperCase(),
      permissions: userPermissions,
      rolePermissions: rolePermissions.map((permission) => permission.permission),
      companyId,
      companies: companies.map((companyLink) => ({
        id: companyLink.companyId,
        name: companyLink.company?.name,
        code: companyLink.company?.code,
        isDefault: companyLink.isDefault,
      })),
    };

    const token = signJwt({ userId: user.id, companyId, role: user.role.toUpperCase() });
    await prisma.session.create({
      data: {
        userId: user.id,
        companyId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ip: (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || req.headers.get("x-real-ip") || "",
        userAgent: req.headers.get("user-agent") || "",
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "SSO_LOGIN",
        companyId,
        userId: user.id,
        details: JSON.stringify({
          email,
          provider: config.providerName || "OIDC",
        }),
      },
    });

    const payload = Buffer.from(JSON.stringify(safeUser)).toString("base64url");
    const res = NextResponse.redirect(`${baseUrl}/auth/sso-complete?payload=${encodeURIComponent(payload)}`);
    res.cookies.set("sb_auth", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error: any) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    return NextResponse.redirect(`${baseUrl}/sso?error=${encodeURIComponent(error.message || "SSO login failed")}`);
  }
}
