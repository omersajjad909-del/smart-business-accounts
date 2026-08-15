import { NextRequest, NextResponse } from "next/server";

import { signJwt, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createVerificationCodeLog,
  getAvailableChannels,
  getLatestVerificationLog,
  getMaskedTarget,
  getOtpHash,
  getUserVerificationTargets,
  isUserVerified,
  newOtpCode,
  OTP_TTL_MS,
  safeJson,
  VerificationChannel,
  sendVerificationCode,
} from "@/lib/verification";

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
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const requestedChannel = String(body?.channel || "").toLowerCase() as
      | VerificationChannel
      | "";

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // A signup awaiting its first code has no User row yet — it lives on
    // PendingSignup until /api/auth/verify/confirm promotes it. Checked before
    // the User lookup below, which would otherwise 404 the whole resend button.
    const pending = await prisma.pendingSignup.findUnique({ where: { email } });
    if (pending) {
      const payload = safeJson(pending.payload) || {};
      const pendingName = String(payload.name || "there");
      const pendingPhone = payload.phone ? String(payload.phone) : null;
      const channel: VerificationChannel =
        requestedChannel === "sms" && pendingPhone ? "sms" : "email";

      if (requestedChannel === "sms" && !pendingPhone) {
        return NextResponse.json(
          { error: "No phone number is available for SMS verification." },
          { status: 400 },
        );
      }

      const targets = { email: pending.email, phone: pendingPhone };
      const existingToken = (() => {
        const raw = req.cookies.get("sb_verify")?.value;
        if (!raw) return null;
        const decoded = verifyJwt(raw);
        return decoded && decoded.pendingId === pending.id ? decoded : null;
      })();
      const nextPath = String(body?.next || existingToken?.next || "/dashboard");

      // Same 20s floor the verified-user path uses, so mashing "Resend" cannot
      // invalidate the code the visitor is already typing.
      const throttled = Date.now() - pending.lastSentAt.getTime() < 20_000;
      let expMs = pending.otpExpiresAt.getTime();

      if (!throttled) {
        const fresh = newOtpCode();
        expMs = fresh.expMs;
        await prisma.pendingSignup.update({
          where: { id: pending.id },
          data: {
            otpHash: getOtpHash(fresh.code),
            otpExpiresAt: new Date(fresh.expMs),
            lastSentAt: new Date(),
            channel,
            // A new code deserves a new budget of tries.
            attempts: 0,
          },
        });

        const sent = await sendVerificationCode({
          name: pendingName,
          email: pending.email,
          phone: pendingPhone,
          channel,
          code: fresh.code,
        });

        if (!sent.success) {
          console.error("Verification send failed:", sent.error);
          return NextResponse.json(
            {
              error:
                sent.error ||
                "We could not send the verification code. Please try again in a moment.",
            },
            { status: 500 },
          );
        }
      }

      const token = signJwt({
        pendingId: pending.id,
        email: pending.email,
        phone: pendingPhone || undefined,
        role: "ADMIN",
        channel,
        next: nextPath,
        exp: expMs,
      });

      const res = NextResponse.json({
        ok: true,
        ...(throttled ? { throttled: true } : {}),
        availableChannels: getAvailableChannels(targets),
        verifyChannel: channel,
        verifyTarget: getMaskedTarget(channel, targets),
      });
      res.cookies.set("sb_verify", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });
      return res;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const companyId = await getCompanyIdForUser(user.id);
    if (!companyId) {
      return NextResponse.json({ error: "Company missing" }, { status: 400 });
    }

    if (await isUserVerified(user.id)) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const targets = await getUserVerificationTargets(user.id);
    if (!targets) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const channel: VerificationChannel =
      requestedChannel === "sms" && targets.phone ? "sms" : "email";

    if (requestedChannel === "sms" && !targets.phone) {
      return NextResponse.json(
        { error: "No phone number is available for SMS verification." },
        { status: 400 },
      );
    }

    const last = await getLatestVerificationLog(companyId, user.id);
    if (last && Date.now() - last.createdAt.getTime() < 20_000) {
      const existing = (() => {
        const raw = req.cookies.get("sb_verify")?.value;
        if (!raw) return null;
        const payload = verifyJwt(raw);
        return payload && payload.userId === user.id ? payload : null;
      })();

      const expMs = Number(existing?.exp || Date.now() + OTP_TTL_MS);
      const token = signJwt({
        userId: user.id,
        companyId,
        role: existing?.role,
        email: targets.email,
        phone: targets.phone || undefined,
        channel,
        next: String(body?.next || existing?.next || "/dashboard"),
        exp: expMs,
      });

      const res = NextResponse.json({
        ok: true,
        throttled: true,
        availableChannels: targets.availableChannels,
        verifyChannel: channel,
        verifyTarget: getMaskedTarget(channel, targets),
      });
      res.cookies.set("sb_verify", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });
      return res;
    }

    const { code, expMs } = await createVerificationCodeLog({
      companyId,
      userId: user.id,
      channel,
      target: channel === "sms" ? targets.phone || "" : targets.email,
    });

    const result = await sendVerificationCode({
      name: targets.name,
      email: targets.email,
      phone: targets.phone,
      channel,
      code,
    });

    if (!result.success) {
      console.error("Verification send failed:", result.error);
      return NextResponse.json(
        {
          error:
            result.error ||
            "We could not send the verification code. Please try again in a moment.",
        },
        { status: 500 },
      );
    }

    const existing = (() => {
      const raw = req.cookies.get("sb_verify")?.value;
      if (!raw) return null;
      const payload = verifyJwt(raw);
      return payload && payload.userId === user.id ? payload : null;
    })();

    const nextPath = String(body?.next || existing?.next || "/dashboard");
    const token = signJwt({
      userId: user.id,
      companyId,
      role: existing?.role,
      email: targets.email,
      phone: targets.phone || undefined,
      channel,
      next: nextPath,
      exp: expMs,
    });

    const res = NextResponse.json({
      ok: true,
      availableChannels: targets.availableChannels,
      verifyChannel: channel,
      verifyTarget: getMaskedTarget(channel, targets),
    });
    res.cookies.set("sb_verify", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
    return res;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
