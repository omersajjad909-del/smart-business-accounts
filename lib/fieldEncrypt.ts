/**
 * AES-256-GCM field-level encryption for sensitive database fields.
 *
 * Encrypted format (stored as string): "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * The "enc:v1:" prefix lets us detect and skip already-encrypted values.
 *
 * Requires env: FIELD_ENCRYPTION_KEY — 64 hex chars (32 bytes / 256 bits)
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";
const IV_BYTES = 12;   // 96-bit IV — recommended for GCM
const TAG_BYTES = 16;  // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY env var is missing or invalid. " +
      "Generate one: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt a plaintext string. Returns the enc:v1:... string. */
export function encryptField(plaintext: string): string {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext; // already encrypted

  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/** Decrypt an enc:v1:... string. Returns plaintext. Non-encrypted values pass through unchanged. */
export function decryptField(value: string): string {
  if (!value) return value;
  if (!value.startsWith(PREFIX)) return value; // not encrypted — pass through

  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted field format");

  const [ivHex, tagHex, ctHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ctHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Returns true if the value is an encrypted field */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/**
 * Encrypt an object's specified fields in-place.
 * Usage: encryptFields(data, ["email", "phone"])
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      result[field] = encryptField(result[field] as string) as any;
    }
  }
  return result;
}

/**
 * Decrypt an object's specified fields in-place.
 * Usage: decryptFields(record, ["email", "phone"])
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      result[field] = decryptField(result[field] as string) as any;
    }
  }
  return result;
}

/** Safely compare two plaintext values — use this instead of === for encrypted fields */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
