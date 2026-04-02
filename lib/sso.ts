import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth";

export type StoredSsoConfig = {
  enabled?: boolean;
  providerType?: "SAML" | "OIDC";
  providerName?: string;
  domainHint?: string;
  issuer?: string;
  entryPoint?: string;
  clientId?: string;
  clientSecret?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
  callbackUrl?: string;
  logoutUrl?: string;
  certificate?: string;
  audience?: string;
};

export async function findSsoConfigByDomain(domain: string) {
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
        String(parsed.domainHint || "").toLowerCase() === domain
      ) {
        return { companyId: log.companyId, config: parsed };
      }
    } catch {}
  }

  return null;
}

export function decodeJwtPayload(token: string) {
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

export async function finalizeSsoLogin(params: {
  companyId: string;
  email: string;
  name: string;
  provider: string;
  reqUserAgent: string;
  reqIp: string;
}) {
  const { companyId, email, name, provider, reqUserAgent, reqIp } = params;

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
      ip: reqIp,
      userAgent: reqUserAgent,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "SSO_LOGIN",
      companyId,
      userId: user.id,
      details: JSON.stringify({
        email,
        provider,
      }),
    },
  });

  const payload = Buffer.from(JSON.stringify(safeUser)).toString("base64url");
  return { token, payload };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSamlAuthnRequest(params: {
  issuer: string;
  acsUrl: string;
  destination: string;
}) {
  const id = `_${randomUUID()}`;
  const issueInstant = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${escapeXml(id)}" Version="2.0" IssueInstant="${escapeXml(issueInstant)}" Destination="${escapeXml(params.destination)}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="${escapeXml(params.acsUrl)}">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${escapeXml(params.issuer)}</saml:Issuer>
</samlp:AuthnRequest>`;
  return {
    id,
    xml,
    encoded: Buffer.from(xml, "utf8").toString("base64"),
  };
}

export function parseSamlResponseXml(xml: string) {
  const get = (pattern: RegExp) => {
    const match = xml.match(pattern);
    return match?.[1]?.trim() || "";
  };

  const email =
    get(/<saml:Attribute[^>]*Name="[^"]*(email|mail|emailaddress)[^"]*"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/i) ||
    get(/<Attribute[^>]*Name="[^"]*(email|mail|emailaddress)[^"]*"[^>]*>[\s\S]*?<AttributeValue[^>]*>([^<]+)<\/AttributeValue>/i);

  const name =
    get(/<saml:Attribute[^>]*Name="[^"]*(name|displayname|givenname)[^"]*"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/i) ||
    get(/<Attribute[^>]*Name="[^"]*(name|displayname|givenname)[^"]*"[^>]*>[\s\S]*?<AttributeValue[^>]*>([^<]+)<\/AttributeValue>/i);

  const nameId =
    get(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/i) ||
    get(/<NameID[^>]*>([^<]+)<\/NameID>/i);

  const destination =
    get(/Destination="([^"]+)"/i);
  const audience =
    get(/<saml:Audience>([^<]+)<\/saml:Audience>/i) ||
    get(/<Audience>([^<]+)<\/Audience>/i);

  const finalEmail = email || nameId;
  const finalName = name || finalEmail.split("@")[0] || "SSO User";

  return {
    email: finalEmail.toLowerCase(),
    name: finalName,
    destination,
    audience,
  };
}
