import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { signJwt } from "@/lib/auth";
import type { BusinessType } from "@/lib/businessModules";
import { prisma } from "@/lib/prisma";
import { currencyByCountry } from "@/lib/currency";
import {
  createVerificationCodeLog,
  getAvailableChannels,
  getMaskedTarget,
  normalizePhone,
  sendVerificationCode,
} from "@/lib/verification";
import {
  getCustomPlanPerMonthForCycleUsd,
  parseCustomModules,
} from "@/lib/customPlanPricing";

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

    const company = await prisma.company.create({
      data: {
        name: companyName,
        isActive: true,
        country: countryCode ? String(countryCode).toUpperCase() : "US",
        // currencyByCountry returns null for countries it has no mapping for —
        // fall back to USD rather than writing null into a non-nullable column.
        baseCurrency: currencyByCountry(countryCode ? String(countryCode).toUpperCase() : "US") || "USD",
        businessType: businessType ? String(businessType) as BusinessType : "trading",
        businessSetupDone: Boolean(businessType),
        plan: normalizedPlanCode,
        subscriptionStatus: "INACTIVE",
        activeModules: customModuleIds.length > 0 ? customModuleIds.join(",") : null,
        customPrice: computedCustomPrice,
      },
    });

    if (countryCode) {
      await prisma.activityLog
        .create({
          data: {
            companyId: company.id,
            userId: null,
            action: "COMPANY_COUNTRY_SET",
            details: JSON.stringify({
              country: String(countryCode).toUpperCase(),
            }),
          },
        })
        .catch(() => {});
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: emailNormalized,
        password: hash,
        role: "ADMIN",
        defaultCompanyId: company.id,
      },
    });

    await prisma.userCompany.create({
      data: { userId: user.id, companyId: company.id, isDefault: true },
    });

    await prisma.activityLog
      .create({
        data: {
          companyId: company.id,
          userId: user.id,
          action: "SIGNUP",
          details: JSON.stringify({
            email: user.email,
            phone: phoneNormalized || null,
            plan: normalizedPlanCode,
            teamSize: teamSize || null,
            referralSource: referralSource || null,
          }),
        },
      })
      .catch(() => {});

    if (phoneNormalized) {
      await prisma.activityLog
        .create({
          data: {
            companyId: company.id,
            userId: user.id,
            action: "USER_PHONE_SET",
            details: JSON.stringify({
              phone: phoneNormalized,
              source: "signup",
            }),
          },
        })
        .catch(() => {});
    }

    // Track referral if a referral code was provided
    if (referralCode) {
      try {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: String(referralCode).toUpperCase().trim() },
          select: { id: true },
        });
        if (referrer && referrer.id !== user.id) {
          await prisma.referral.create({
            data: {
              referrerId:   referrer.id,
              refereeEmail: user.email,
              status:       "signed_up",
            },
          });
        }
      } catch { /* non-critical */ }
    }

    const channel = "email";
    const { code, expMs } = await createVerificationCodeLog({
      companyId: company.id,
      userId: user.id,
      channel,
      target: user.email,
    });

    const sendResult = await sendVerificationCode({
      name: user.name,
      email: user.email,
      phone: phoneNormalized,
      channel,
      code,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          error: "We could not send the verification email. Please try again or contact support.",
        },
        { status: 500 },
      );
    }

    const planPath = String(normalizedPlanCode || "starter").toLowerCase();
    const nextParams = new URLSearchParams();
    nextParams.set("cycle", normalizedBillingCycle.toLowerCase());
    if (customModuleIds.length > 0) nextParams.set("modules", customModuleIds.join(","));
    if (computedCustomPrice !== null) nextParams.set("price", String(computedCustomPrice));
    const next = `/onboarding/payment/${planPath}?${nextParams.toString()}`;

    const verifyToken = signJwt({
      userId: user.id,
      companyId: company.id,
      role: "ADMIN",
      email: user.email,
      phone: phoneNormalized || undefined,
      channel,
      next,
      exp: expMs,
    });

    const availableChannels = getAvailableChannels({
      email: user.email,
      phone: phoneNormalized,
    });

    const res = NextResponse.json({
      needsVerification: true,
      email: user.email,
      phone: phoneNormalized || "",
      availableChannels,
      verifyChannel: channel,
      verifyTarget: getMaskedTarget(channel, {
        email: user.email,
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
