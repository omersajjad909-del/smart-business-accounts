/**
 * lib/adminAuth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The single server-side guard for the platform admin console.
 *
 *   export async function GET(req: NextRequest) {
 *     const admin = await requireAdmin(req);
 *     if (admin instanceof NextResponse) return admin;   // 401/403
 *     // admin.id, admin.email, admin.isSuperAdmin, admin.allowedPages
 *   }
 *
 * Four things this does that the previous version did not:
 *
 *  1. Reads its OWN cookie (`sb_admin`), never `sb_auth`. A tenant session can
 *     no longer be mistaken for an admin one at any layer.
 *  2. Confirms the account is still live in the database on every call —
 *     `active`, and the token's `tv` claim still matching the row's token
 *     version. Disabling an admin, or changing their password, now kills every
 *     live session instantly instead of leaving a 12-hour window.
 *  3. Requires TOTP to have been completed (`otp: true` in the token). A
 *     password-only pre-auth token cannot reach any endpoint.
 *  4. Enforces `AdminUser.allowedPages` server-side, resolved fresh from the
 *     database, and reserves the destructive pages for super admins.
 *
 * proxy.ts still blocks unauthenticated traffic at the edge, but nothing here
 * depends on that — every route is independently safe if the edge is bypassed.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_PENDING_COOKIE,
  getAdminTokenFromRequest,
  signJwt,
  verifyJwt,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  UNLOCK_COOKIE,
  getAdminPageLock,
  hasValidUnlock,
  isPageLocked,
} from "@/lib/adminPageLock";
import {
  SUPER_ADMIN_ONLY_PAGES,
  adminPageForApiPath,
  isAlwaysAllowedAdminApi,
  normalizeAllowedPages,
} from "@/lib/adminPages";

/**
 * Admin sessions are short — the blast radius of a stolen one is total.
 *
 * Two limits, and whichever comes first wins:
 *   • this one, enforced by the token's own `exp`, which the server checks;
 *   • closing the browser, because the cookie below is a session cookie.
 */
export const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
/** Password verified, OTP not yet entered. Long enough to open an authenticator. */
export const ADMIN_PENDING_TTL_MS = 5 * 60 * 1000;

export type AdminSource = "platform" | "team";

export interface AdminContext {
  id: string;
  email: string;
  name: string;
  role: "ADMIN";
  isSuperAdmin: boolean;
  /** null = unrestricted (super admin). Otherwise the ticked page ids. */
  allowedPages: string[] | null;
  source: AdminSource;
}

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

// ─── Token minting ──────────────────────────────────────────────────────────

/** Full, OTP-completed admin session token. */
export function mintAdminToken(opts: {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  source: AdminSource;
  tokenVersion: number;
}): string {
  return signJwt(
    {
      id: opts.id,
      email: opts.email,
      name: opts.name,
      role: "ADMIN",
      scope: "admin",
      isSuperAdmin: opts.isSuperAdmin,
      src: opts.source,
      tv: opts.tokenVersion,
      otp: true,
    },
    { ttlMs: ADMIN_SESSION_TTL_MS },
  );
}

/**
 * Password-verified, OTP-pending token. Deliberately carries `otp: false` and
 * a different scope so it can never satisfy `requireAdmin` — the only thing it
 * unlocks is /api/admin/auth/2fa/*.
 */
export function mintAdminPendingToken(opts: {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  source: AdminSource;
  tokenVersion: number;
  /** true when the account has no authenticator yet and must enrol first. */
  enrol: boolean;
}): string {
  return signJwt(
    {
      id: opts.id,
      email: opts.email,
      name: opts.name,
      scope: "admin_pending",
      isSuperAdmin: opts.isSuperAdmin,
      src: opts.source,
      tv: opts.tokenVersion,
      enrol: opts.enrol,
      otp: false,
    },
    { ttlMs: ADMIN_PENDING_TTL_MS },
  );
}

const secureCookie = process.env.NODE_ENV === "production";

export function setAdminCookie(res: NextResponse, token: string) {
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: secureCookie,
    // The console is only ever reached by typing its host or from inside
    // itself — no cross-site navigation needs to carry this cookie.
    sameSite: "strict",
    path: "/",
    // No maxAge and no expires on purpose: that makes this a *session* cookie,
    // which the browser throws away when it closes. Signing in again is then
    // required after every browser restart, not merely after the token expires.
    // The token's own `exp` is still the server-side limit — a browser that is
    // never closed does not get an endless session.
  });
  clearAdminPendingCookie(res);
}

export function setAdminPendingCookie(res: NextResponse, token: string) {
  res.cookies.set(ADMIN_PENDING_COOKIE, token, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(ADMIN_PENDING_TTL_MS / 1000),
  });
}

export function clearAdminPendingCookie(res: NextResponse) {
  res.cookies.set(ADMIN_PENDING_COOKIE, "", { maxAge: 0, path: "/" });
}

export function clearAdminCookies(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
  clearAdminPendingCookie(res);
}

/** Read + verify the pre-auth token. Used only by the 2FA endpoints. */
export function readAdminPendingToken(req: NextRequest): Record<string, any> | null {
  const raw = req.cookies.get(ADMIN_PENDING_COOKIE)?.value;
  if (!raw) return null;
  const payload = verifyJwt(raw, { maxAgeMs: ADMIN_PENDING_TTL_MS });
  if (!payload || payload.scope !== "admin_pending" || !payload.id) return null;
  return payload;
}

// ─── Account lookup ─────────────────────────────────────────────────────────

export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  active: boolean;
  isSuperAdmin: boolean;
  allowedPages: string[] | null;
  source: AdminSource;
  tokenVersion: number;
  totpEnabled: boolean;
  totpSecret: string | null;
  lockedUntil: Date | null;
  failedAttempts: number;
}

function parseAllowedPages(raw: unknown): string[] | null {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeAllowedPages(parsed.map(String)) : [];
  } catch {
    return [];
  }
}

/**
 * Is this `User` row a *platform* super admin rather than the ADMIN (owner) of
 * some tenant company?
 *
 * `SUPER_ADMIN_EMAILS` is now the only answer. The old fallback — "any ADMIN
 * with no company links" — meant every orphaned account in the User table was
 * a working admin login, and the console has a button that creates exactly
 * those. In production, an unset allowlist now denies rather than guesses.
 */
export function platformSuperAdminAllowlist(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isPlatformSuperAdmin(userId: string, email: string): Promise<boolean> {
  const allowlist = platformSuperAdminAllowlist();
  if (allowlist.length > 0) return allowlist.includes(email.toLowerCase());

  if (process.env.NODE_ENV === "production") {
    // Fail closed. A misconfigured deployment must not hand out admin access.
    console.error(
      "[adminAuth] SUPER_ADMIN_EMAILS is not set — platform super-admin login is disabled.",
    );
    return false;
  }
  // Dev convenience only: a standalone ADMIN row with no company membership.
  const membership = await prisma.userCompany.count({ where: { userId } });
  return membership === 0;
}

/** Load the live admin row for a token, or null if it no longer qualifies. */
export async function loadAdminAccount(
  id: string,
  source: AdminSource,
): Promise<AdminAccount | null> {
  if (source === "team") {
    const row = await (prisma as any).adminUser?.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      active: Boolean(row.active),
      isSuperAdmin: Boolean(row.isSuperAdmin),
      allowedPages: row.isSuperAdmin ? null : parseAllowedPages(row.allowedPages),
      source: "team",
      tokenVersion: Number(row.tokenVersion ?? 0),
      totpEnabled: Boolean(row.totpEnabled),
      totpSecret: row.totpSecret ?? null,
      lockedUntil: row.lockedUntil ?? null,
      failedAttempts: Number(row.failedAttempts ?? 0),
    };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || String(user.role).toUpperCase() !== "ADMIN") return null;
  if (!(await isPlatformSuperAdmin(user.id, user.email))) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    active: Boolean(user.active),
    isSuperAdmin: true,
    allowedPages: null,
    source: "platform",
    tokenVersion: Number((user as any).adminTokenVersion ?? 0),
    totpEnabled: Boolean(user.twoFactorEnabled),
    totpSecret: user.twoFactorSecret ?? null,
    lockedUntil: null,
    failedAttempts: 0,
  };
}

/** Look an admin up by email across both tables, for the login endpoint. */
export async function findAdminByEmail(email: string): Promise<
  (AdminAccount & { passwordHash: string }) | null
> {
  const normalized = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (user && String(user.role).toUpperCase() === "ADMIN") {
    if (await isPlatformSuperAdmin(user.id, user.email)) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        active: Boolean(user.active),
        isSuperAdmin: true,
        allowedPages: null,
        source: "platform",
        tokenVersion: Number((user as any).adminTokenVersion ?? 0),
        totpEnabled: Boolean(user.twoFactorEnabled),
        totpSecret: user.twoFactorSecret ?? null,
        lockedUntil: null,
        failedAttempts: 0,
        passwordHash: user.password,
      };
    }
  }

  const row = await (prisma as any).adminUser?.findUnique({ where: { email: normalized } });
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    active: Boolean(row.active),
    isSuperAdmin: Boolean(row.isSuperAdmin),
    allowedPages: row.isSuperAdmin ? null : parseAllowedPages(row.allowedPages),
    source: "team",
    tokenVersion: Number(row.tokenVersion ?? 0),
    totpEnabled: Boolean(row.totpEnabled),
    totpSecret: row.totpSecret ?? null,
    lockedUntil: row.lockedUntil ?? null,
    failedAttempts: Number(row.failedAttempts ?? 0),
    passwordHash: row.passwordHash,
  };
}

// ─── Guards ─────────────────────────────────────────────────────────────────

export interface RequireAdminOptions {
  /** Page id to authorise against. Defaults to the one derived from the URL. */
  page?: string;
  /** Skip the allowedPages check entirely (own-profile style endpoints). */
  anyPage?: boolean;
  /** Reject anyone who is not a super admin. */
  superAdmin?: boolean;
}

/**
 * Authenticate + authorise an admin request. Returns a NextResponse on any
 * failure, which the caller must return as-is.
 */
export async function requireAdmin(
  req: NextRequest,
  opts: RequireAdminOptions = {},
): Promise<AdminContext | NextResponse> {
  const token = getAdminTokenFromRequest(req as any);
  if (!token) return deny(401, "Admin authentication required");

  const payload = verifyJwt(token);
  if (
    !payload ||
    payload.scope !== "admin" ||
    payload.otp !== true ||
    String(payload.role).toUpperCase() !== "ADMIN" ||
    !payload.id
  ) {
    return deny(401, "Admin authentication required");
  }

  const source: AdminSource = payload.src === "platform" ? "platform" : "team";
  const account = await loadAdminAccount(String(payload.id), source);
  if (!account) return deny(401, "Admin account no longer exists");
  if (!account.active) return deny(403, "Account is disabled");
  if (Number(payload.tv ?? 0) !== account.tokenVersion) {
    return deny(401, "Session revoked — please sign in again");
  }
  if (!account.totpEnabled) {
    return deny(403, "Two-factor authentication must be set up before continuing");
  }

  const ctx: AdminContext = {
    id: account.id,
    email: account.email,
    name: account.name,
    role: "ADMIN",
    isSuperAdmin: account.isSuperAdmin,
    allowedPages: account.allowedPages,
    source: account.source,
  };

  if (opts.superAdmin && !ctx.isSuperAdmin) {
    return deny(403, "Super admin access required");
  }

  // `nextUrl` is absent when a handler is typed as taking a plain `Request`,
  // so fall back to the raw URL rather than silently authorising nothing.
  let pathname = req.nextUrl?.pathname || "";
  if (!pathname) {
    try {
      pathname = new URL(req.url).pathname;
    } catch {
      pathname = "";
    }
  }

  if (opts.anyPage || isAlwaysAllowedAdminApi(pathname)) return ctx;

  const page = opts.page ?? adminPageForApiPath(pathname);
  const authorised = canAccessPage(ctx, page);
  if (!authorised) return deny(403, "You do not have access to this section");

  // Extra page password, on top of being signed in. 423 rather than 403 so the
  // console can tell "you may not have this" apart from "ask for the password".
  const lock = await getAdminPageLock();
  if (isPageLocked(lock, page)) {
    const unlockToken = req.cookies.get(UNLOCK_COOKIE)?.value;
    if (!hasValidUnlock(unlockToken, ctx.id, lock, page as string)) {
      return NextResponse.json(
        { error: "This section is password protected", locked: true, page },
        { status: 423 },
      );
    }
  }

  return ctx;
}

/** Convenience wrapper — destructive, platform-wide endpoints. */
export async function requireSuperAdmin(
  req: NextRequest,
  opts: Omit<RequireAdminOptions, "superAdmin"> = {},
): Promise<AdminContext | NextResponse> {
  return requireAdmin(req, { ...opts, superAdmin: true });
}

/**
 * Is `admin` allowed on `page`?
 *
 * `page === null` means the URL matched nothing in the map — a brand new
 * endpoint. That is treated as super-admin-only so adding a route never
 * silently widens a scoped team member's reach.
 */
export function canAccessPage(admin: AdminContext, page: string | null): boolean {
  if (page === null) return admin.isSuperAdmin;
  if (SUPER_ADMIN_ONLY_PAGES.has(page)) return admin.isSuperAdmin;
  if (admin.isSuperAdmin || admin.allowedPages === null) return true;
  return admin.allowedPages.includes(page);
}

// ─── Revocation ─────────────────────────────────────────────────────────────

/**
 * Invalidate every live session for an admin by bumping their token version.
 * Called on password change, deactivation, and "sign out everywhere".
 */
export async function revokeAdminSessions(id: string, source: AdminSource): Promise<void> {
  try {
    if (source === "team") {
      await (prisma as any).adminUser.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } },
      });
    } else {
      await prisma.user.update({
        where: { id },
        data: { adminTokenVersion: { increment: 1 } } as any,
      });
    }
  } catch {
    // Never let revocation bookkeeping break the caller's main flow.
  }
}

// ─── Audit ──────────────────────────────────────────────────────────────────

/**
 * Log an admin action to the AdminActionLog table.
 * Fire-and-forget — never throws so it never breaks the main request.
 */
export async function logAdminAction(opts: {
  adminId: string;
  adminEmail: string;
  action: string; // e.g. "CHANGE_PLAN", "IMPERSONATE", "DELETE_USER"
  targetType: string; // e.g. "Company", "User", "Subscription"
  targetId?: string;
  targetLabel?: string; // e.g. company name or user email
  details?: Record<string, any>;
  companyId?: string;
}) {
  try {
    await (prisma as any).adminActionLog.create({
      data: {
        adminId: opts.adminId,
        adminEmail: opts.adminEmail,
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId || null,
        targetLabel: opts.targetLabel || null,
        details: opts.details ? JSON.stringify(opts.details) : null,
        companyId: opts.companyId || null,
      },
    });
  } catch {
    // Silently ignore — logging must never break business logic
  }
}

/** Record a failed / blocked admin sign-in attempt so it shows in the audit trail. */
export async function logAdminAuthEvent(opts: {
  email: string;
  action: "LOGIN_FAILED" | "LOGIN_LOCKED" | "LOGIN_SUCCESS" | "OTP_FAILED" | "OTP_ENROLLED" | "LOGOUT";
  ip?: string | null;
  userAgent?: string | null;
  adminId?: string;
  details?: Record<string, any>;
}) {
  await logAdminAction({
    adminId: opts.adminId || "unknown",
    adminEmail: opts.email,
    action: opts.action,
    targetType: "AdminAuth",
    targetLabel: opts.email,
    details: { ip: opts.ip || null, userAgent: opts.userAgent || null, ...(opts.details || {}) },
  });
}
