/**
 * lib/adminPageLock.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * A second lock, inside the admin console.
 *
 * Signing in gets you into the console. This adds an extra password on top of
 * whichever pages a super admin picks — so even a signed-in admin has to type
 * it before Revenue, Companies, Backup, or whatever else is ticked, will open.
 * Unlocking lasts 30 minutes and then the pages close again by themselves.
 *
 * Stored as an ActivityLog row (newest wins), the same way the admin settings
 * and the company security policy are stored, so this needs no migration.
 * Only a bcrypt hash of the password is ever written.
 */

import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt, verifyJwt } from "@/lib/auth";

export const ADMIN_PAGE_LOCK_ACTION = "ADMIN_PAGE_LOCK";
export const UNLOCK_COOKIE = "sb_admin_unlock";
/**
 * Hard ceiling on one unlock — a safety net, not the normal lifetime.
 *
 * The console re-locks the moment you navigate away from the page or close the
 * tab, the way a phone's app lock does. This cap only matters when that signal
 * never arrives (a crashed tab, a killed browser), so it is deliberately short.
 */
export const UNLOCK_TTL_MS = 10 * 60 * 1000;

/**
 * The lock screen itself can never be locked — it is the only way back in for
 * a super admin who forgets the password, so locking it would be a one-way
 * door out of the console.
 */
export const NEVER_LOCKABLE = new Set<string>(["admin-security"]);

export type AdminPageLock = {
  enabled: boolean;
  /** Page ids that require the password. */
  pages: string[];
  passwordHash: string | null;
  updatedAt: string | null;
  updatedByEmail: string | null;
};

const EMPTY_LOCK: AdminPageLock = {
  enabled: false,
  pages: [],
  passwordHash: null,
  updatedAt: null,
  updatedByEmail: null,
};

// requireAdmin already does one database read per admin request; this keeps
// the lock config from making it two on every single call.
let cache: { value: AdminPageLock; at: number } | null = null;
const CACHE_TTL_MS = 10_000;

export function invalidateAdminPageLockCache() {
  cache = null;
}

export async function getAdminPageLock(): Promise<AdminPageLock> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  let value: AdminPageLock = { ...EMPTY_LOCK };
  try {
    const row = await prisma.activityLog.findFirst({
      where: { action: ADMIN_PAGE_LOCK_ACTION },
      orderBy: { createdAt: "desc" },
      select: { details: true, createdAt: true },
    });
    if (row?.details) {
      const parsed = JSON.parse(row.details);
      value = {
        enabled: parsed.enabled === true,
        pages: Array.isArray(parsed.pages) ? parsed.pages.map(String) : [],
        passwordHash: typeof parsed.passwordHash === "string" ? parsed.passwordHash : null,
        updatedAt: row.createdAt?.toISOString() ?? null,
        updatedByEmail: parsed.updatedByEmail ?? null,
      };
    }
  } catch {
    // A read failure must not lock anyone out of the console.
    value = { ...EMPTY_LOCK };
  }

  cache = { value, at: Date.now() };
  return value;
}

export async function saveAdminPageLock(opts: {
  enabled: boolean;
  pages: string[];
  /** Plaintext; only supply when setting or changing it. */
  password?: string | null;
  existingHash: string | null;
  updatedByEmail: string;
  updatedById: string;
}): Promise<AdminPageLock> {
  const passwordHash = opts.password
    ? await bcrypt.hash(opts.password, 12)
    : opts.existingHash;

  const pages = [...new Set(opts.pages.map(String))].filter((p) => !NEVER_LOCKABLE.has(p));

  // Without a password there is nothing to ask for, so the lock cannot be on.
  const enabled = opts.enabled && Boolean(passwordHash) && pages.length > 0;

  await prisma.activityLog.create({
    data: {
      action: ADMIN_PAGE_LOCK_ACTION,
      userId: null, // admin ids live in two tables; the email below identifies them
      details: JSON.stringify({
        enabled,
        pages,
        passwordHash,
        updatedByEmail: opts.updatedByEmail,
      }),
    },
  });

  invalidateAdminPageLockCache();
  return {
    enabled,
    pages,
    passwordHash,
    updatedAt: new Date().toISOString(),
    updatedByEmail: opts.updatedByEmail,
  };
}

/** Is this page currently behind the extra password? */
export function isPageLocked(lock: AdminPageLock, page: string | null): boolean {
  if (!lock.enabled || !lock.passwordHash) return false;
  if (!page || NEVER_LOCKABLE.has(page)) return false;
  return lock.pages.includes(page);
}

/**
 * A short fingerprint of the config. It rides along in the unlock token, so
 * changing the password or the page list instantly invalidates every unlock
 * anyone is currently holding.
 */
export function lockFingerprint(lock: AdminPageLock): string {
  return createHash("sha256")
    .update(`${lock.passwordHash || ""}|${[...lock.pages].sort().join(",")}|${lock.enabled}`)
    .digest("base64url")
    .slice(0, 16);
}

export async function verifyLockPassword(lock: AdminPageLock, password: string): Promise<boolean> {
  if (!lock.passwordHash) return false;
  return bcrypt.compare(password, lock.passwordHash);
}

// ─── Unlock token ───────────────────────────────────────────────────────────

/**
 * Bound to one admin, one config version, and ONE page.
 *
 * Per-page on purpose: unlocking Companies must not also open Revenue. Only
 * one page is unlocked at a time — minting a new token replaces the old one,
 * so stepping from one locked page to another asks again.
 */
export function mintUnlockToken(adminId: string, lock: AdminPageLock, page: string): string {
  return signJwt(
    { scope: "admin_unlock", aid: adminId, fp: lockFingerprint(lock), page },
    { ttlMs: UNLOCK_TTL_MS },
  );
}

/** Does this cookie unlock `page` for this admin, right now? */
export function hasValidUnlock(
  rawToken: string | null | undefined,
  adminId: string,
  lock: AdminPageLock,
  page: string,
): boolean {
  if (!rawToken) return false;
  const payload = verifyJwt(rawToken, { maxAgeMs: UNLOCK_TTL_MS });
  if (!payload || payload.scope !== "admin_unlock") return false;
  if (payload.aid !== adminId) return false;
  if (payload.page !== page) return false;
  return payload.fp === lockFingerprint(lock);
}

/** Which page, if any, the cookie currently unlocks. */
export function unlockedPageFrom(
  rawToken: string | null | undefined,
  adminId: string,
  lock: AdminPageLock,
): string | null {
  if (!rawToken) return null;
  const payload = verifyJwt(rawToken, { maxAgeMs: UNLOCK_TTL_MS });
  if (!payload || payload.scope !== "admin_unlock") return null;
  if (payload.aid !== adminId) return null;
  if (payload.fp !== lockFingerprint(lock)) return null;
  return typeof payload.page === "string" ? payload.page : null;
}

export function setUnlockCookie(res: NextResponse, token: string) {
  res.cookies.set(UNLOCK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(UNLOCK_TTL_MS / 1000),
  });
}

export function clearUnlockCookie(res: NextResponse) {
  res.cookies.set(UNLOCK_COOKIE, "", { maxAge: 0, path: "/" });
}
