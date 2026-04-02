import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/emailTemplates";
import { getRuntimeAppUrl } from "@/lib/domains";

const RESET_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
    const rl = rateLimit(`forgot-password:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many reset requests. Please wait a moment." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const genericResponse = NextResponse.json({
      ok: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, active: true },
    });

    if (!user || !user.active) {
      return genericResponse;
    }

    const companyId = await getCompanyIdForUser(user.id);
    if (!companyId) {
      return genericResponse;
    }

    const lastReset = await prisma.activityLog.findFirst({
      where: { userId: user.id, companyId, action: "PASSWORD_RESET_REQUESTED" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (lastReset && Date.now() - lastReset.createdAt.getTime() < 60_000) {
      return genericResponse;
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(token);
    const expiresAt = Date.now() + RESET_TTL_MS;
    const baseUrl = getRuntimeAppUrl(req.nextUrl.origin);
    const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        details: JSON.stringify({
          tokenHash,
          exp: expiresAt,
          requestedAt: Date.now(),
        }),
      },
    });

    const emailResult = await sendEmail({
      to: user.email,
      subject: "Reset your Finova password",
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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process reset request",
      },
      { status: 500 },
    );
  }
}
