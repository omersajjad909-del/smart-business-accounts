import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export type CompanyEmailConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
};

export type CompanyWhatsAppConfig = {
  enabled: boolean;
  provider: "meta";
  token: string;
  phoneId: string;
  apiVersion: string;
};

export type CompanyCommsConfig = {
  email: CompanyEmailConfig;
  whatsapp: CompanyWhatsAppConfig;
};

export const DEFAULT_COMPANY_COMMS_CONFIG: CompanyCommsConfig = {
  email: {
    enabled: false,
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    from: "",
    fromName: "Finova",
  },
  whatsapp: {
    enabled: false,
    provider: "meta",
    token: "",
    phoneId: "",
    apiVersion: "v18.0",
  },
};

function getEncryptionKey(companyId?: string) {
  const secret =
    process.env.COMPANY_SECRET_MASTER_KEY ||
    process.env.SESSION_SECRET ||
    "dev-insecure-company-secret";
  return createHash("sha256")
    .update(companyId ? `${secret}:${companyId}` : secret)
    .digest();
}

function encrypt(text: string, companyId?: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(companyId), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decrypt(payload: string, companyId?: string) {
  const [ivPart, tagPart, encryptedPart] = String(payload || "").split(".");
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("Invalid encrypted payload");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(companyId),
    Buffer.from(ivPart, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function normalizeConfig(input: Partial<CompanyCommsConfig> | null | undefined): CompanyCommsConfig {
  const email: Partial<CompanyEmailConfig> = input?.email || {};
  const whatsapp: Partial<CompanyWhatsAppConfig> = input?.whatsapp || {};

  return {
    email: {
      ...DEFAULT_COMPANY_COMMS_CONFIG.email,
      ...email,
      port: Number(email.port ?? DEFAULT_COMPANY_COMMS_CONFIG.email.port),
      secure: Boolean(email.secure ?? DEFAULT_COMPANY_COMMS_CONFIG.email.secure),
      enabled: Boolean(email.enabled ?? DEFAULT_COMPANY_COMMS_CONFIG.email.enabled),
    },
    whatsapp: {
      ...DEFAULT_COMPANY_COMMS_CONFIG.whatsapp,
      ...whatsapp,
      enabled: Boolean(whatsapp.enabled ?? DEFAULT_COMPANY_COMMS_CONFIG.whatsapp.enabled),
      provider: "meta",
    },
  };
}

async function ensureCompanyCommsVaultTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CompanyCommsVault" (
      "companyId" TEXT PRIMARY KEY REFERENCES "Company"("id") ON DELETE CASCADE,
      "configEnc" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CompanyCommsVault_updatedAt_idx"
    ON "CompanyCommsVault"("updatedAt")
  `);
}

async function getVaultConfig(companyId: string): Promise<CompanyCommsConfig | null> {
  try {
    await ensureCompanyCommsVaultTable();
    const rows = await prisma.$queryRaw<Array<{ configEnc: string }>>`
      SELECT "configEnc"
      FROM "CompanyCommsVault"
      WHERE "companyId" = ${companyId}
      LIMIT 1
    `;
    const payload = rows[0]?.configEnc;
    if (!payload) return null;
    return normalizeConfig(JSON.parse(decrypt(payload, companyId)) as Partial<CompanyCommsConfig>);
  } catch {
    return null;
  }
}

async function saveVaultConfig(companyId: string, config: CompanyCommsConfig) {
  await ensureCompanyCommsVaultTable();
  const payload = encrypt(JSON.stringify(config), companyId);
  await prisma.$executeRaw`
    INSERT INTO "CompanyCommsVault" ("companyId", "configEnc", "createdAt", "updatedAt")
    VALUES (${companyId}, ${payload}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("companyId")
    DO UPDATE SET
      "configEnc" = EXCLUDED."configEnc",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

async function getLegacyActivityLogConfig(companyId: string): Promise<CompanyCommsConfig | null> {
  const row = await prisma.activityLog.findFirst({
    where: { companyId, action: "COMPANY_COMMS_CONFIG" },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });

  if (!row?.details) return null;

  try {
    return normalizeConfig(JSON.parse(decrypt(row.details)) as Partial<CompanyCommsConfig>);
  } catch {
    return null;
  }
}

export async function getCompanyCommsConfig(companyId: string): Promise<CompanyCommsConfig> {
  const vaultConfig = await getVaultConfig(companyId);
  if (vaultConfig) {
    return vaultConfig;
  }

  const legacyConfig = await getLegacyActivityLogConfig(companyId);
  if (legacyConfig) {
    try {
      await saveVaultConfig(companyId, legacyConfig);
    } catch {}
    return legacyConfig;
  }

  return DEFAULT_COMPANY_COMMS_CONFIG;
}

export async function saveCompanyCommsConfig(
  companyId: string,
  userId: string | null,
  patch: Partial<CompanyCommsConfig>
) {
  const current = await getCompanyCommsConfig(companyId);
  const next = normalizeConfig({
    email: { ...current.email, ...(patch.email || {}) },
    whatsapp: { ...current.whatsapp, ...(patch.whatsapp || {}) },
  });

  try {
    await saveVaultConfig(companyId, next);
  } catch {
    await prisma.activityLog.create({
      data: {
        action: "COMPANY_COMMS_CONFIG",
        companyId,
        userId,
        details: encrypt(JSON.stringify(next)),
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      action: "COMPANY_COMMS_CONFIG_UPDATED",
      companyId,
      userId,
      details: "Company communication credentials updated",
    },
  });

  return next;
}

export function maskCompanyCommsConfig(config: CompanyCommsConfig): CompanyCommsConfig {
  return {
    email: {
      ...config.email,
      pass: config.email.pass ? "********" : "",
    },
    whatsapp: {
      ...config.whatsapp,
      token: config.whatsapp.token ? "********" : "",
    },
  };
}
