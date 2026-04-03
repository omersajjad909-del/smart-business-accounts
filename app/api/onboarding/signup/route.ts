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
      customPrice,
      referralCode,
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
      const hasSession = await prisma.session
        .findFirst({
          where: { userId: existing.id },
        })
        .catch(() => null);

      const hasActivity = await prisma.activityLog
        .findFirst({
          where: {
            userId: existing.id,
            action: {
              notIn: ["SIGNUP", "USER_PHONE_SET", "VERIFY_OTP", "EMAIL_OTP"],
            },
          },
        })
        .catch(() => null);

      if (hasSession || hasActivity) {
        return NextResponse.json(
          { error: "Email already registered. Please login." },
          { status: 409 },
        );
      }

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

    const company = await prisma.company.create({
      data: {
        name: companyName,
        isActive: true,
        country: countryCode ? String(countryCode).toUpperCase() : "US",
        baseCurrency: currencyByCountry(countryCode ? String(countryCode).toUpperCase() : "US"),
        businessType: businessType ? String(businessType) as BusinessType : "trading",
        businessSetupDone: Boolean(businessType),
        plan: String(planCode || "STARTER").toUpperCase(),
        subscriptionStatus: "TRIALING",
        activeModules: customModules ? String(customModules) : null,
        customPrice: customPrice ? parseFloat(String(customPrice)) : null,
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
            plan: planCode,
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

    const planPath = String(planCode || "starter").toLowerCase();
    const nextParams = new URLSearchParams();
    nextParams.set(
      "cycle",
      String(billingCycle || "").toLowerCase() === "yearly" ? "yearly" : "monthly",
    );
    if (customModules) nextParams.set("modules", String(customModules));
    if (customPrice) nextParams.set("price", String(customPrice));
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
