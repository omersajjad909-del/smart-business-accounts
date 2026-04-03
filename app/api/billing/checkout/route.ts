import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiError, apiOk } from "@/lib/apiError";
import { getRuntimeAppUrl } from "@/lib/domains";
import { createLemonCheckout, hasLemonSqueezyConfig } from "@/lib/lemonsqueezy";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return apiError("Company required", 400);

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (userRole?.toUpperCase() !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const body = await req.json();
    const planCode = String(body?.planCode || "STARTER").toUpperCase();
    const billingCycle = String(body?.billingCycle || "MONTHLY").toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";
    const successUrl = String(body?.successUrl || "");
    const cancelUrl = body?.cancelUrl ? String(body.cancelUrl) : null;
    const couponCode = body?.couponCode ? String(body.couponCode).toUpperCase().trim() : null;
    const displayCurrency = body?.displayCurrency ? String(body.displayCurrency).toUpperCase() : null;
    const displayCountry = body?.displayCountry ? String(body.displayCountry).toUpperCase() : null;
    const customPrice = Number(body?.customPrice || 0);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, baseCurrency: true, country: true },
    });
    if (!company) return apiError("Company not found", 404);

    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        })
      : null;

    if (hasLemonSqueezyConfig()) {
      const base = getRuntimeAppUrl(req.nextUrl.origin);
      const checkout = await createLemonCheckout({
        planCode,
        billingCycle,
        successUrl: successUrl || `${base}/dashboard/billing?upgrade=success`,
        cancelUrl: cancelUrl || `${base}/dashboard/billing?cancel=1`,
        companyId,
        userId,
        email: user?.email || null,
        name: user?.name || company.name,
        couponCode,
        displayCurrency: displayCurrency || company.baseCurrency,
        displayCountry: displayCountry || company.country,
        customPriceUsd: customPrice > 0 ? customPrice : null,
      });

      await prisma.activityLog.create({
        data: {
          companyId,
          userId: userId || null,
          action: "BILLING_CHECKOUT_CREATED",
          details: JSON.stringify({
            provider: "LEMON_SQUEEZY",
            planCode,
            billingCycle,
            checkoutId: checkout.checkoutId,
            variantId: checkout.variantId,
            couponCode,
            displayCurrency: displayCurrency || company.baseCurrency,
            displayCountry: displayCountry || company.country,
            createdAt: new Date().toISOString(),
          }),
        },
      }).catch(() => {});

      return apiOk({
        url: checkout.url,
        provider: "lemonsqueezy",
        checkoutId: checkout.checkoutId,
      });
    }

    // Fallback for local/demo usage when no billing provider is configured.
    await prisma.company.update({
      where: { id: companyId },
      data: {
        plan: planCode,
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + (billingCycle === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000),
        ...(displayCurrency ? { baseCurrency: displayCurrency } : {}),
        ...(displayCountry ? { country: displayCountry } : {}),
      },
    });

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: userId || null,
        action: "PLAN_ACTIVATED",
        details: JSON.stringify({
          planCode,
          billingCycle,
          activatedAt: new Date().toISOString(),
          displayCurrency,
          displayCountry,
          provider: "DIRECT_FALLBACK",
        }),
      },
    }).catch(() => {});

    if (couponCode) {
      try {
        const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
        if (coupon && coupon.active) {
          await prisma.$transaction([
            prisma.couponRedemption.create({
              data: { couponId: coupon.id, userId: userId || null, companyId },
            }),
            prisma.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            }),
          ]);
        }
      } catch {}
    }

    if (userId) {
      try {
        const referralUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (referralUser) {
          await prisma.referral.updateMany({
            where: { refereeEmail: referralUser.email, status: "signed_up" },
            data: { status: "converted", convertedAt: new Date(), reward: 20 },
          });
        }
      } catch {}
    }

    const base = getRuntimeAppUrl(req.nextUrl.origin);
    const redirectUrl = successUrl || `${base}/dashboard/billing?upgrade=success`;
    return apiOk({ url: redirectUrl, sessionId: "direct" });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
