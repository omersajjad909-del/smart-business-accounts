/**
 * Minimal TOTP (RFC 6238) implementation using Node built-in crypto.
 * Replaces otplib authenticator API which changed incompatibly in v13.
 */
import { createHmac, randomBytes } from "crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
  const str = input.toUpperCase().replace(/=+$/, "");
  const bits: number[] = [];
  for (const ch of str) {
    const val = BASE32_CHARS.indexOf(ch);
    if (val === -1) throw new Error(`Invalid base32 char: ${ch}`);
    for (let i = 4; i >= 0; i--) bits.push((val >> i) & 1);
  }
  const bytes: number[] = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31];
  return output;
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** 6).padStart(6, "0");
}

/** Generate a random base32 secret suitable for TOTP */
export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

/** Build an otpauth:// URI for QR code display */
export function keyuri(account: string, issuer: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Verify a 6-digit TOTP code.
 * Accepts ±1 time step (30s window) to account for clock drift.
 */
export function verify({ token, secret }: { token: string; secret: string }): boolean {
  const key = base32Decode(secret);
  const step = Math.floor(Date.now() / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    if (hotp(key, step + delta) === String(token).trim()) return true;
  }
  return false;
}
