import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "crypto";

import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rateLimit";
import { validatePassword } from "@/lib/passwordPolicy";
import { sendEmail } from "@/lib/email";

const RESET_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashesEqual(a: string, b: string) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** One reply for every rejection, so the endpoint reveals nothing about tokens. */
function invalidToken() {
  return NextResponse.json(
    { error: "Invalid or expired reset token" },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "unknown")
      .split(",")[0]
      .trim();
    const rl = await rateLimitAsync(`reset-password:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a moment." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    // A reset token is 64 hex chars. Anything else is not worth a DB query.
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return invalidToken();
    }

    const tokenHash = hashResetToken(token);
    const resetLog = await prisma.activityLog.findFirst({
      where: {
        action: "PASSWORD_RESET_REQUESTED",
        details: { contains: tokenHash } satisfies Prisma.StringNullableFilter,
        // Belt-and-braces alongside the `exp` claim inside `details`: a token
        // older than the TTL can never match, whatever the stored payload says.
        createdAt: { gte: new Date(Date.now() - RESET_TTL_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        companyId: true,
        details: true,
        createdAt: true,
      },
    });

    if (!resetLog?.userId) {
      return invalidToken();
    }

    const details = safeJson(resetLog.details);
    const storedHash = String(details?.tokenHash || "");
    const expiresAt = Number(details?.exp || 0);
    const usedAt = Number(details?.usedAt || 0);

    if (
      !storedHash ||
      !hashesEqual(storedHash, tokenHash) ||
      !expiresAt ||
      Date.now() > expiresAt ||
      usedAt
    ) {
      return invalidToken();
    }

    const user = await prisma.user.findUnique({
      where: { id: resetLog.userId },
      select: { id: true, active: true, email: true, name: true, password: true },
    });

    // Deliberately the same reply as a bad token — an inactive or deleted
    // account must not be distinguishable through this endpoint.
    if (!user || !user.active) {
      return invalidToken();
    }

    const policy = validatePassword(password, [user.email, user.name]);
    if (!policy.ok) {
      return NextResponse.json({ error: policy.error }, { status: 400 });
    }

    if (user.password && (await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { error: "New password must be different from your current password" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.activityLog.deleteMany({
        where: {
          userId: user.id,
          action: "PASSWORD_RESET_REQUESTED",
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          companyId: resetLog.companyId,
          action: "PASSWORD_RESET",
          details: JSON.stringify({
            resetRequestId: resetLog.id,
            requestedAt: details?.requestedAt ?? null,
            resetAt: Date.now(),
            ip,
          }),
        },
      }),
      // Any pending email-change OTP is abandoned: whoever held the old
      // password must not be able to finish moving the account to their inbox.
      prisma.activityLog.deleteMany({
        where: { userId: user.id, action: "EMAIL_CHANGE_OTP" },
      }),
      // Every existing login is killed. `requireActiveSession` checks this
      // table, so deleting the rows genuinely logs other devices out.
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    // Out-of-band notice to the account's own address. If the owner did not do
    // this, it is the signal that something is wrong — and it goes to the real
    // mailbox, not to whatever address was typed into the form.
    sendEmail({
      to: user.email,
      subject: "Your FinovaOS password was changed",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1035;color:#fff;border-radius:16px">
          <h2 style="margin:0 0 12px;font-size:22px">Password changed</h2>
          <p style="color:#94a3b8;margin:0 0 16px">The password for your FinovaOS account (${user.email}) was just reset, and all active sessions were signed out.</p>
          <p style="color:#94a3b8;margin:0 0 16px">Request came from IP <strong style="color:#fff">${ip}</strong> at ${new Date().toUTCString()}.</p>
          <p style="color:#f87171;margin:0">If this wasn't you, reset your password again immediately and contact support.</p>
        </div>
      `,
    }).catch((err) => console.error("Password change notice failed:", err));

    const res = NextResponse.json({ ok: true });
    // Clear any auth cookies still on this browser so the reset always lands
    // the user on a clean login.
    for (const name of ["sb_auth", "sb_verify", "sb_2fa_pending"]) {
      res.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
    return res;
  } catch (error: unknown) {
    console.error("RESET PASSWORD ERROR:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 },
    );
  }
}
