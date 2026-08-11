import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rateLimit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getRuntimeAppUrl } from "@/lib/domains";

const RESET_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Per-email limiter key. The raw address is hashed so the rate-limit store
 * (Upstash) never holds user email addresses in plaintext.
 */
function emailKey(email: string) {
  return createHash("sha256").update(email).digest("hex").slice(0, 32);
}

async function getCompanyIdForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultCompanyId: true },
  });
  if (user?.defaultCompanyId) return user.defaultCompanyId;

  const membership = await prisma.userCompany.findFirst({
    where: { userId },
    select: { companyId: true },
  });
  return membership?.companyId || null;
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "unknown")
      .split(",")[0]
      .trim();

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // The response is identical whether or not the address has an account, so
    // this endpoint cannot be used to enumerate which emails are registered.
    const genericResponse = NextResponse.json({
      ok: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    });

    // Two independent limits: one per source IP (stops a single host spraying
    // many addresses) and one per target address (stops a distributed attempt
    // to flood one person's inbox from rotating IPs).
    const ipLimit = await rateLimitAsync(`forgot-password:ip:${ip}`, 5, 60_000);
    const emailLimit = await rateLimitAsync(
      `forgot-password:email:${emailKey(email)}`,
      3,
      15 * 60_000,
    );
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many reset requests. Please wait a moment." },
        { status: 429 },
      );
    }
    // A per-address limit must not answer differently from the generic reply,
    // otherwise it becomes an enumeration oracle of its own.
    if (!emailLimit.allowed) {
      return genericResponse;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, active: true },
    });

    if (!user || !user.active) {
      return genericResponse;
    }

    // ActivityLog.companyId is optional; a user who has not been attached to a
    // company yet must still be able to recover their account.
    const companyId = await getCompanyIdForUser(user.id);

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(token);
    const expiresAt = Date.now() + RESET_TTL_MS;
    const baseUrl = getRuntimeAppUrl(req.nextUrl.origin);
    const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    // Only one reset link may be live at a time. Issuing a new one kills every
    // previous outstanding link for this user, so an attacker who triggered a
    // reset cannot sit on a valid token while the owner requests their own.
    await prisma.$transaction([
      prisma.activityLog.deleteMany({
        where: { userId: user.id, action: "PASSWORD_RESET_REQUESTED" },
      }),
      prisma.activityLog.create({
        data: {
          companyId,
          userId: user.id,
          action: "PASSWORD_RESET_REQUESTED",
          details: JSON.stringify({
            tokenHash,
            exp: expiresAt,
            requestedAt: Date.now(),
            ip,
          }),
        },
      }),
    ]);

    // The link is only ever mailed to the address stored on the account. The
    // address typed into the form is used to *look up* the account, never as a
    // destination — so a stranger cannot redirect someone's reset link to
    // themselves.
    const emailResult = await sendEmail({
      to: user.email,
      subject: "Reset your FinovaOS password",
      html: emailTemplates.passwordReset(
        { name: user.name || user.email },
        resetUrl,
      ),
    });

    if (!emailResult.success) {
      console.error("Password reset email failed:", emailResult.error);
    }

    return genericResponse;
  } catch (error: unknown) {
    // Never surface internal error text on an unauthenticated endpoint.
    console.error("FORGOT PASSWORD ERROR:", error);
    return NextResponse.json(
      { error: "Failed to process reset request" },
      { status: 500 },
    );
  }
}
