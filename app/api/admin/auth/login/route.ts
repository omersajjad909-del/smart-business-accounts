/**
 * POST /api/admin/auth/login — the whole sign-in, in one step.
 *
 * A correct password mints the `sb_admin` session directly. There is no OTP
 * step: two-factor was removed from the admin console at the owner's request,
 * because it was being re-entered many times a day.
 *
 * What still stands between this endpoint and an attacker: per-IP and
 * per-email rate limits, per-account lockout after repeated failures, constant
 * response time on unknown accounts, and a session that dies with the browser.
 *
 * The /api/admin/auth/2fa/* endpoints are still present but unreachable —
 * they only accept the pre-auth cookie, which nothing mints any more. Putting
 * the OTP step back means restoring the pending-token branch below.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimitAsync } from "@/lib/rateLimit";
import {
  findAdminByEmail,
  logAdminAuthEvent,
  mintAdminToken,
  setAdminCookie,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

/** Never reveal whether the email exists, or which half of the pair was wrong. */
const INVALID_CREDS = { message: "Invalid credentials" };

/** Per-account lockout. Rotating IPs does not get an attacker past this. */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * A real bcrypt hash of a random string, compared against when the account
 * does not exist. Without it, "unknown email" returns in ~1ms and "wrong
 * password" in ~100ms, which is a working account-enumeration oracle.
 */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const userAgent = req.headers.get("user-agent");

    // Upstash-backed when configured, so the limit is shared across every
    // serverless instance rather than reset by whichever one answers.
    const ipLimit = await rateLimitAsync(`admin_login_ip:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { message: "Too many login attempts. Try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }

    let body: any;
    try {
      body = JSON.parse(await req.text());
    } catch {
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }

    const email = (body?.email || "").toString().toLowerCase().trim();
    const password = (body?.password || "").toString();
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 });
    }

    const emailLimit = await rateLimitAsync(`admin_login_email:${email}`, 10, 15 * 60 * 1000);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { message: "Too many login attempts. Try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }

    const account = await findAdminByEmail(email);

    if (!account) {
      await bcrypt.compare(password, DUMMY_HASH); // equalise response time
      await logAdminAuthEvent({ email, action: "LOGIN_FAILED", ip, userAgent, details: { reason: "no_account" } });
      return NextResponse.json(INVALID_CREDS, { status: 401 });
    }

    if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((account.lockedUntil.getTime() - Date.now()) / 60000);
      await logAdminAuthEvent({ email, action: "LOGIN_LOCKED", ip, userAgent, adminId: account.id });
      return NextResponse.json(
        { message: `Account locked. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
        { status: 423 },
      );
    }

    const match = await bcrypt.compare(password, account.passwordHash || DUMMY_HASH);
    if (!match) {
      await registerFailure(account.id, account.source, account.failedAttempts);
      await logAdminAuthEvent({ email, action: "LOGIN_FAILED", ip, userAgent, adminId: account.id, details: { reason: "bad_password" } });
      return NextResponse.json(INVALID_CREDS, { status: 401 });
    }

    // Checked only after the password, so a disabled account is not a way to
    // confirm that an address is registered.
    if (!account.active) {
      await logAdminAuthEvent({ email, action: "LOGIN_FAILED", ip, userAgent, adminId: account.id, details: { reason: "disabled" } });
      return NextResponse.json({ message: "Account is disabled." }, { status: 403 });
    }

    await clearFailures(account.id, account.source);

    const token = mintAdminToken({
      id: account.id,
      email: account.email,
      name: account.name,
      isSuperAdmin: account.isSuperAdmin,
      source: account.source,
      tokenVersion: account.tokenVersion,
    });

    // `lastLoginAt` used to be stamped by the OTP step, which no longer runs.
    // Losing it would leave the admin list showing every team member as having
    // never signed in.
    if (account.source === "team") {
      try {
        await (prisma as any).adminUser.update({
          where: { id: account.id },
          data: { lastLoginAt: new Date() },
        });
      } catch {
        // A missing column must not cost somebody their session.
      }
    }

    const res = NextResponse.json({
      success: true,
      step: "done",
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: "ADMIN",
        isSuperAdmin: account.isSuperAdmin,
        allowedPages: account.allowedPages,
        source: account.source,
      },
    });
    setAdminCookie(res, token);
    await logAdminAuthEvent({ email: account.email, action: "LOGIN_SUCCESS", ip, userAgent, adminId: account.id });
    return res;
  } catch {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

async function registerFailure(id: string, source: "platform" | "team", current: number) {
  if (source !== "team") return; // platform admins are covered by the IP+email limiter
  const next = current + 1;
  try {
    await (prisma as any).adminUser.update({
      where: { id },
      data: {
        failedAttempts: next,
        lockedUntil: next >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
    });
  } catch {}
}

async function clearFailures(id: string, source: "platform" | "team") {
  if (source !== "team") return;
  try {
    await (prisma as any).adminUser.update({
      where: { id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  } catch {}
}
