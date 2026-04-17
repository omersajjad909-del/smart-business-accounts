/**
 * POST /api/auth/2fa/complete
 * Called during login when user has 2FA enabled.
 * Reads the sb_2fa_pending cookie (short-lived pre-auth token),
 * verifies the TOTP code, then issues a full session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt, signJwt } from "@/lib/auth";
import { verify as verifyTotp } from "@/lib/totp";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`2fa-complete:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
  }

  const pendingToken = req.cookies.get("sb_2fa_pending")?.value;
  if (!pendingToken) {
    return NextResponse.json({ error: "No pending 2FA session. Please log in again." }, { status: 401 });
  }

  const payload = verifyJwt(pendingToken);
  if (!payload?.userId || !payload.twoFactorPending) {
    return NextResponse.json({ error: "Invalid or expired 2FA session." }, { status: 401 });
  }

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "TOTP code required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { permissions: true },
  });
  if (!user || !user.twoFactorSecret) {
    return NextResponse.json({ error: "User not found or 2FA not configured." }, { status: 400 });
  }

  const isValid = verifyTotp({ token: code, secret: user.twoFactorSecret });
  if (!isValid) {
    return NextResponse.json({ error: "Invalid or expired TOTP code." }, { status: 400 });
  }

  // Issue full session token
  const sessionToken = signJwt({
    userId: user.id,
    role: user.role.toUpperCase(),
    companyId: payload.companyId,
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  try {
    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
        companyId: payload.companyId || "",
        ip: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent") || null,
      },
    });
  } catch {}

  const res = NextResponse.json({ success: true });
  // Clear pending cookie
  res.cookies.set("sb_2fa_pending", "", { maxAge: 0, path: "/" });
  // Set full auth cookie
  res.cookies.set("sb_auth", sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
