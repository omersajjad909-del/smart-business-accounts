import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { signJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAvailableChannels,
  getMaskedTarget,
  getOtpHash,
  newOtpCode,
  normalizePhone,
  sendVerificationCode,
} from "@/lib/verification";
import {
  getCustomPlanPerMonthForCycleUsd,
  parseCustomModules,
} from "@/lib/customPlanPricing";

/**
 * Step one of signup: hold the submission, send a code, create nothing.
 *
 * This route used to write Company + User + UserCompany before the OTP was even
 * sent. Two consequences, both bad: anyone could register a company under an
 * address they did not own, and every abandoned attempt left a half-built tenant
 * behind (which is also what pushed real customers from #100003 to #100017 —
 * each one consumed a `Company.companyNo`).
 *
 * The form now rests on a PendingSignup row. /api/auth/verify/confirm is the
 * only place that promotes it into real rows, and only once the code matches.
 */
export async function POST(req: NextRequest) {
  try {
    const {
      companyName,
      name,
      email,
      password,
      phone,
      countryCode,
      businessType,
      planCode,
      billingCycle,
      customModules,
      referralCode,
      teamSize,
      referralSource,
    } = await req.json();

    if (!companyName || !name || !email || !password) {
      return NextResponse.json(
        { error: "companyName, name, email, password required" },
        { status: 400 },
      );
    }

    const emailNormalized = String(email).trim().toLowerCase();
    const phoneNormalized = normalizePhone(phone);

    const existing = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existing) {
      // Legacy cleanup. New signups never reach the User table before
      // verification, but accounts half-built by the old flow still exist.
      //
      // Everything the onboarding funnel itself writes. Reaching any of these
      // only proves the visitor started signing up — not that an account worth
      // protecting exists. Verifying the email logs several of them *and*
      // creates a Session, which is why a `session` lookup used to be here and
      // why abandoning checkout after the OTP left the address permanently
      // unusable: the user was told "already registered" but had no plan, no
      // data and nothing to log in to.
      const ONBOARDING_ONLY_ACTIONS = [
        "SIGNUP",
        "USER_PHONE_SET",
        "VERIFY_OTP",
        "EMAIL_OTP",
        "COMPANY_COUNTRY_SET",
        "ACCOUNT_VERIFIED",
        "LOGIN",
        "LOGOUT",
        "LOGIN_FAILED",
      ];

      const [realActivity, paidCompany, sharedCompany] = await Promise.all([
        // Any action beyond the funnel means the product was actually used.
        prisma.activityLog
          .findFirst({
            where: {
              userId: existing.id,
              action: { notIn: ONBOARDING_ONLY_ACTIONS },
            },
            select: { id: true },
          })
          .catch(() => null),

        // Money is the strongest signal — never reclaim an account that paid.
        existing.defaultCompanyId
          ? prisma.company
              .findFirst({
                where: {
                  id: existing.defaultCompanyId,
                  NOT: { subscriptionStatus: "INACTIVE" },
                },
                select: { id: true },
              })
              .catch(() => null)
          : Promise.resolve(null),

        // Someone else's colleague — deleting this would take them down too.
        existing.defaultCompanyId
          ? prisma.userCompany
              .count({
                where: {
                  companyId: existing.defaultCompanyId,
                  NOT: { userId: existing.id },
                },
              })
              .catch(() => 0)
          : Promise.resolve(0),
      ]);

      if (realActivity || paidCompany || (sharedCompany ?? 0) > 0) {
        return NextResponse.json(
          { error: "Email already registered. Please login." },
          { status: 409 },
        );
      }

      // Abandoned signup — clear the half-built account so the same address can
      // start over. Sessions must go too, or the stale cookie outlives the user
      // row it points at.
      await prisma.session.deleteMany({ where: { userId: existing.id } }).catch(() => {});

      try {
        await prisma.userCompany.deleteMany({ where: { userId: existing.id } });
        await prisma.activityLog.deleteMany({ where: { userId: existing.id } });
        if (existing.defaultCompanyId) {
          const otherUsers = await prisma.userCompany.count({
            where: { companyId: existing.defaultCompanyId },
          });
          if (otherUsers === 0) {
            await prisma.company
              .delete({ where: { id: existing.defaultCompanyId } })
              .catch(() => {});
          }
        }
        await prisma.user.delete({ where: { id: existing.id } });
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
        return NextResponse.json(
          { error: "Email already registered. Please login." },
          { status: 409 },
        );
      }
    }

    const normalizedPlanCode = String(planCode || "STARTER").toUpperCase();
    const normalizedBillingCycle =
      String(billingCycle || "").toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";
    const customModuleIds =
      normalizedPlanCode === "CUSTOM" ? parseCustomModules(customModules) : [];
    const computedCustomPrice =
      normalizedPlanCode === "CUSTOM"
        ? getCustomPlanPerMonthForCycleUsd(customModuleIds, normalizedBillingCycle)
        : null;

    const planPath = String(normalizedPlanCode || "starter").toLowerCase();
    const nextParams = new URLSearchParams();
    nextParams.set("cycle", normalizedBillingCycle.toLowerCase());
    if (customModuleIds.length > 0) nextParams.set("modules", customModuleIds.join(","));
    if (computedCustomPrice !== null) nextParams.set("price", String(computedCustomPrice));
    const next = `/onboarding/payment/${planPath}?${nextParams.toString()}`;

    const channel = "email";
    const { code, expMs } = newOtpCode();

    // Hashed before it rests anywhere, including this row — a PendingSignup leak
    // must not hand over usable passwords.
    const passwordHash = await bcrypt.hash(password, 10);

    // Re-submitting the form replaces the previous attempt rather than stacking
    // rows, so the newest code is always the only valid one.
    const pending = await prisma.pendingSignup.upsert({
      where: { email: emailNormalized },
      update: {
        payload: JSON.stringify({
          companyName,
          name,
          passwordHash,
          phone: phoneNormalized || null,
          countryCode: countryCode ? String(countryCode).toUpperCase() : null,
          businessType: businessType ? String(businessType) : null,
          planCode: normalizedPlanCode,
          billingCycle: normalizedBillingCycle,
          customModuleIds,
          customPrice: computedCustomPrice,
          referralCode: referralCode || null,
          teamSize: teamSize || null,
          referralSource: referralSource || null,
        }),
        otpHash: getOtpHash(code),
        otpExpiresAt: new Date(expMs),
        channel,
        attempts: 0,
        lastSentAt: new Date(),
      },
      create: {
        email: emailNormalized,
        payload: JSON.stringify({
          companyName,
          name,
          passwordHash,
          phone: phoneNormalized || null,
          countryCode: countryCode ? String(countryCode).toUpperCase() : null,
          businessType: businessType ? String(businessType) : null,
          planCode: normalizedPlanCode,
          billingCycle: normalizedBillingCycle,
          customModuleIds,
          customPrice: computedCustomPrice,
          referralCode: referralCode || null,
          teamSize: teamSize || null,
          referralSource: referralSource || null,
        }),
        otpHash: getOtpHash(code),
        otpExpiresAt: new Date(expMs),
        channel,
      },
    });

    const sendResult = await sendVerificationCode({
      name,
      email: emailNormalized,
      phone: phoneNormalized,
      channel,
      code,
    });

    if (!sendResult.success) {
      // Nothing durable was created, so drop the row rather than leaving a
      // pending signup nobody can ever redeem.
      await prisma.pendingSignup.delete({ where: { id: pending.id } }).catch(() => {});
      return NextResponse.json(
        {
          error: "We could not send the verification email. Please try again or contact support.",
        },
        { status: 500 },
      );
    }

    const verifyToken = signJwt({
      pendingId: pending.id,
      email: emailNormalized,
      phone: phoneNormalized || undefined,
      role: "ADMIN",
      channel,
      next,
      exp: expMs,
    });

    const availableChannels = getAvailableChannels({
      email: emailNormalized,
      phone: phoneNormalized,
    });

    const res = NextResponse.json({
      needsVerification: true,
      email: emailNormalized,
      phone: phoneNormalized || "",
      availableChannels,
      verifyChannel: channel,
      verifyTarget: getMaskedTarget(channel, {
        email: emailNormalized,
        phone: phoneNormalized,
      }),
      next,
    });

    res.cookies.set("sb_verify", verifyToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    return res;
  } catch (error: unknown) {
    console.error("[signup]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signup failed" },
      { status: 500 },
    );
  }
}
