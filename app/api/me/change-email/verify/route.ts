import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { requireActiveSession, isCredentialChangeAllowed } from "@/lib/sessionGuard";

/** A 6-digit code is only 10^6 wide, so guesses have to be capped. */
const MAX_OTP_ATTEMPTS = 5;

function otpHash(code: string) {
  const secret = process.env.SESSION_SECRET || "dev-insecure-secret";
  return createHmac("sha256", secret).update(code).digest("hex");
}

function hashesEqual(a: string, b: string) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireActiveSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isCredentialChangeAllowed(session)) {
      return NextResponse.json(
        { error: "Email cannot be changed from an impersonated or demo session" },
        { status: 403 },
      );
    }

    const { otp } = await req.json().catch(() => ({}) as any);
    if (!otp || !/^\d{6}$/.test(String(otp).trim())) {
      return NextResponse.json({ error: "6-digit OTP required" }, { status: 400 });
    }

    // Find latest pending OTP for this user
    const log = await prisma.activityLog.findFirst({
      where: { userId: session.userId, action: "EMAIL_CHANGE_OTP" },
      orderBy: { createdAt: "desc" },
      select: { id: true, details: true, createdAt: true },
    });

    if (!log || !log.details) {
      return NextResponse.json({ error: "No email change request found. Please start over." }, { status: 400 });
    }

    let parsed: { h: string; exp: number; newEmail: string; attempts?: number };
    try {
      parsed = JSON.parse(log.details);
    } catch {
      return NextResponse.json({ error: "Invalid request. Please start over." }, { status: 400 });
    }

    if (Date.now() > parsed.exp) {
      await prisma.activityLog.delete({ where: { id: log.id } }).catch(() => {});
      return NextResponse.json({ error: "OTP has expired. Please request a new code." }, { status: 400 });
    }

    const attempts = Number(parsed.attempts || 0);
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.activityLog.delete({ where: { id: log.id } }).catch(() => {});
      return NextResponse.json(
        { error: "Too many incorrect codes. Please start over." },
        { status: 429 },
      );
    }

    if (!hashesEqual(otpHash(String(otp).trim()), parsed.h)) {
      // Burn the attempt before replying, so a client that ignores the response
      // still cannot get a free guess.
      await prisma.activityLog.update({
        where: { id: log.id },
        data: { details: JSON.stringify({ ...parsed, attempts: attempts + 1 }) },
      });
      const left = MAX_OTP_ATTEMPTS - (attempts + 1);
      return NextResponse.json(
        {
          error:
            left > 0
              ? `Incorrect OTP. ${left} attempt${left === 1 ? "" : "s"} remaining.`
              : "Incorrect OTP. No attempts remaining — please start over.",
        },
        { status: 400 },
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });

    // Double-check new email not taken (race condition guard)
    const taken = await prisma.user.findUnique({ where: { email: parsed.newEmail }, select: { id: true } });
    if (taken) {
      return NextResponse.json({ error: "This email was just registered by another account." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: { email: parsed.newEmail },
      }),
      // Every session dies, including this one — the account identity changed.
      prisma.session.deleteMany({ where: { userId: session.userId } }),
      prisma.activityLog.deleteMany({
        where: { userId: session.userId, action: "EMAIL_CHANGE_OTP" },
      }),
      // Any reset link addressed to the old mailbox is void.
      prisma.activityLog.deleteMany({
        where: { userId: session.userId, action: "PASSWORD_RESET_REQUESTED" },
      }),
    ]);

    // Tell the OLD address the move happened. If the change was not authorised,
    // this is the owner's only warning — so it must go out after the fact, not
    // only as the pre-change OTP.
    if (currentUser?.email) {
      sendEmail({
        to: currentUser.email,
        subject: "Your FinovaOS account email was changed",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d1035;color:#fff;border-radius:16px">
            <h2 style="margin:0 0 12px;font-size:22px">Account email changed</h2>
            <p style="color:#94a3b8;margin:0 0 16px">Your FinovaOS sign-in address was changed from <strong style="color:#fff">${currentUser.email}</strong> to <strong style="color:#fff">${parsed.newEmail}</strong> on ${new Date().toUTCString()}.</p>
            <p style="color:#f87171;margin:0">If you did not do this, contact support immediately — this mailbox can no longer sign in or reset the account.</p>
          </div>
        `,
      }).catch((err) => console.error("Email change notice failed:", err));
    }

    const res = NextResponse.json({ ok: true, newEmail: parsed.newEmail, reauth: true });
    res.cookies.set("sb_auth", "", { maxAge: 0, path: "/" });
    return res;
  } catch (e: unknown) {
    console.error("CHANGE EMAIL VERIFY ERROR:", e);
    return NextResponse.json({ error: "Failed to verify email change" }, { status: 500 });
  }
}
