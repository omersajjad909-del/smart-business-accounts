import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ─── Company ID resolution ────────────────────────────────────────────────────
export async function getAutomationCompanyId(req: NextRequest): Promise<string | null> {
  try {
    const h = req.headers.get("x-company-id");
    if (h) return h;
    const uid = req.headers.get("x-user-id");
    if (uid) {
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { defaultCompanyId: true } });
      if (u?.defaultCompanyId) return u.defaultCompanyId;
    }
    const cookie = req.headers.get("cookie") || "";
    const m = cookie.match(/sb_auth=([^;]+)/);
    if (m) {
      const parts = decodeURIComponent(m[1]).split(".");
      if (parts.length === 3) {
        const p = JSON.parse(Buffer.from(parts[1], "base64url").toString());
        const cid = p?.companyId || p?.defaultCompanyId;
        if (cid) return cid;
      }
    }
    return null;
  } catch { return null; }
}

// ─── Credential encryption (AES-256-GCM) ─────────────────────────────────────
// Uses COMPANY_SECRET_MASTER_KEY from .env — already set
function getEncryptionKey(): Buffer {
  const raw = process.env.COMPANY_SECRET_MASTER_KEY || "";
  // Derive a 32-byte key from the master key via SHA-256
  const { createHash } = require("crypto");
  return createHash("sha256").update(raw).digest();
}

export function encryptCredentials(obj: Record<string, any>): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const json = JSON.stringify(obj);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(hex):tag(hex):ciphertext(hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptCredentials(data: string): Record<string, any> {
  try {
    const key = getEncryptionKey();
    const [ivHex, tagHex, ctHex] = data.split(":");
    if (!ivHex || !tagHex || !ctHex) return {};
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const ct = Buffer.from(ctHex, "hex");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
    return JSON.parse(plain);
  } catch { return {}; }
}

// ─── Social config store/retrieve (encrypted) ────────────────────────────────
export async function getSocialConfig(companyId: string): Promise<Record<string, any>> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: "SOCIAL_CONFIG", companyId },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    if (!log?.details) return {};
    const raw = log.details;
    // Support both old (plain JSON) and new (encrypted) formats
    if (raw.includes(":")) {
      return decryptCredentials(raw);
    }
    return JSON.parse(raw);
  } catch { return {}; }
}

export async function saveSocialConfig(companyId: string, config: Record<string, any>): Promise<void> {
  await prisma.activityLog.create({
    data: {
      action: "SOCIAL_CONFIG",
      companyId,
      details: encryptCredentials(config),
    },
  });
}
