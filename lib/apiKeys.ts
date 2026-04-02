import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

type ApiKeyLogDetails = {
  keyId?: string;
  name?: string;
  keyHash?: string;
  keyPreview?: string;
  last4?: string;
  createdBy?: string | null;
  revokedBy?: string | null;
};

export type CompanyApiKeyRecord = {
  id: string;
  name: string;
  keyPreview: string;
  last4: string;
  status: "active" | "revoked";
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

function safeParseDetails(details: string | null): ApiKeyLogDetails {
  if (!details) return {};
  try {
    return JSON.parse(details) as ApiKeyLogDetails;
  } catch {
    return {};
  }
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function maskApiKey(rawKey: string): string {
  if (!rawKey || rawKey.length < 12) return rawKey;
  return `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`;
}

export function generateApiKey() {
  const rawKey = `finova_live_${randomBytes(24).toString("hex")}`;
  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPreview: maskApiKey(rawKey),
    last4: rawKey.slice(-4),
  };
}

export async function listCompanyApiKeys(companyId: string): Promise<CompanyApiKeyRecord[]> {
  const logs = await prisma.activityLog.findMany({
    where: {
      companyId,
      action: {
        in: ["API_KEY_CREATED", "API_KEY_REVOKED", "API_KEY_USED"],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const createdMap = new Map<string, CompanyApiKeyRecord>();
  const revokedMap = new Map<string, string>();
  const lastUsedMap = new Map<string, string>();

  for (const log of logs) {
    const details = safeParseDetails(log.details);
    const keyId = String(details.keyId || "");
    if (!keyId) continue;

    if (log.action === "API_KEY_REVOKED" && !revokedMap.has(keyId)) {
      revokedMap.set(keyId, log.createdAt.toISOString());
      continue;
    }

    if (log.action === "API_KEY_USED" && !lastUsedMap.has(keyId)) {
      lastUsedMap.set(keyId, log.createdAt.toISOString());
      continue;
    }

    if (log.action === "API_KEY_CREATED" && !createdMap.has(keyId)) {
      createdMap.set(keyId, {
        id: keyId,
        name: String(details.name || "API Key"),
        keyPreview: String(details.keyPreview || ""),
        last4: String(details.last4 || ""),
        status: "active",
        createdAt: log.createdAt.toISOString(),
        revokedAt: null,
        lastUsedAt: null,
      });
    }
  }

  const keys = Array.from(createdMap.values()).map((key) => {
    const revokedAt = revokedMap.get(key.id) || null;
    const lastUsedAt = lastUsedMap.get(key.id) || null;
    return {
      ...key,
      status: (revokedAt ? "revoked" : "active") as "active" | "revoked",
      revokedAt,
      lastUsedAt,
    };
  });

  return keys.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function authenticateApiKey(rawKey: string) {
  const keyHash = hashApiKey(rawKey);
  const createdLogs = await prisma.activityLog.findMany({
    where: {
      action: "API_KEY_CREATED",
      details: { contains: keyHash },
    } as any,
    orderBy: { createdAt: "desc" },
  });

  for (const created of createdLogs) {
    const details = safeParseDetails(created.details);
    if (details.keyHash !== keyHash || !created.companyId) continue;

    const keyId = String(details.keyId || "");
    if (!keyId) continue;

    const revoked = await prisma.activityLog.findFirst({
      where: {
        companyId: created.companyId,
        action: "API_KEY_REVOKED",
        details: { contains: keyId },
      } as any,
      orderBy: { createdAt: "desc" },
    });

    if (revoked) continue;

    return {
      keyId,
      companyId: created.companyId,
      name: String(details.name || "API Key"),
    };
  }

  return null;
}
