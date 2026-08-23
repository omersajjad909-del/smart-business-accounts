/**
 * POST /api/admin/auth/2fa/verify  — step 2 of 2, and the only place the full
 * `sb_admin` session cookie is ever minted.
 *
 * Takes the 6-digit code off the admin's authenticator (rotates every 30s),
 * checks it against the secret stored at enrolment, and on success upgrades
 * the short-lived pending cookie into a real 8-hour admin session.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verify as verifyTotp } from "@/lib/totp";
import { rateLimitAsync } from "@/lib/rateLimit";
import {
  clearAdminCookies,
  loadAdminAccount,
  logAdminAuthEvent,
  mintAdminToken,
  readAdminPendingToken,
  setAdminCookie,
  type AdminSource,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

/** Six digits is 1-in-a-million per guess; this keeps it that way. */
const MAX_OTP_ATTEMPTS = 8;
const OTP_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent");

  const pending = readAdminPendingToken(req);
  if (!pending) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  const limit = await rateLimitAsync(`admin_otp:${pending.id}`, MAX_OTP_ATTEMPTS, OTP_WINDOW_MS);
  if (!limit.allowed) {
    const res = NextResponse.json(
      { error: "Too many codes tried. Please sign in again." },
      { status: 429 },
    );
    clearAdminCookies(res); // force a fresh password step
    return res;
  }

  let code = "";
  try {
    const body = JSON.parse(await req.text());
    code = String(body?.code || "").replace(/\s+/g, "");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
  }

  const source: AdminSource = pending.src === "platform" ? "platform" : "team";
  const account = await loadAdminAccount(String(pending.id), source);
  if (!account || !account.active) {
    return NextResponse.json({ error: "Account unavailable" }, { status: 403 });
  }
  if (Number(pending.tv ?? 0) !== account.tokenVersion) {
    return NextResponse.json({ error: "Session revoked. Please sign in again." }, { status: 401 });
  }
  if (!account.totpSecret) {
    return NextResponse.json(
      { error: "No authenticator enrolled. Restart the sign-in." },
      { status: 400 },
    );
  }

  if (!verifyTotp({ token: code, secret: account.totpSecret })) {
    await logAdminAuthEvent({
      email: account.email,
      action: "OTP_FAILED",
      ip,
      userAgent,
      adminId: account.id,
    });
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const firstEnrolment = !account.totpEnabled;

  if (source === "team") {
    await (prisma as any).adminUser.update({
      where: { id: account.id },
      data: { totpEnabled: true, lastLoginAt: new Date(), failedAttempts: 0, lockedUntil: null },
    });
  } else {
    await prisma.user.update({
      where: { id: account.id },
      data: { twoFactorEnabled: true },
    });
  }

  const token = mintAdminToken({
    id: account.id,
    email: account.email,
    name: account.name,
    isSuperAdmin: account.isSuperAdmin,
    source,
    tokenVersion: account.tokenVersion,
  });

  const res = NextResponse.json({
    success: true,
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: "ADMIN",
      isSuperAdmin: account.isSuperAdmin,
      allowedPages: account.allowedPages,
      source,
    },
  });
  setAdminCookie(res, token);

  if (firstEnrolment) {
    await logAdminAuthEvent({ email: account.email, action: "OTP_ENROLLED", ip, userAgent, adminId: account.id });
  }
  await logAdminAuthEvent({ email: account.email, action: "LOGIN_SUCCESS", ip, userAgent, adminId: account.id });

  return res;
}
