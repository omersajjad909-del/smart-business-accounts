import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiError, apiOk } from "@/lib/apiError";
import { getRuntimeAppUrl } from "@/lib/domains";
import { createLemonCheckout, hasLemonSqueezyConfig } from "@/lib/lemonsqueezy";
import { createSafepayCheckout, hasSafepayConfig, usdToPkr } from "@/lib/safepay";
import { getCompanyExtraSeats } from "@/lib/companySeatLimit";
import { getCustomPlanCycleAmountUsd, parseCustomModules } from "@/lib/customPlanPricing";

const DEFAULT_PRICING = {
  starter: { monthly: 49, yearly: 39 },
  pro: { monthly: 99, yearly: 79 },
  enterprise: { monthly: 249, yearly: 199 },
  // $828/yr ($69/mo equivalent) — matches the yearly price shown on the addon payment page
  addon_automation: { monthly: 79, yearly: 69 },
};
const DEFAULT_SEAT_PRICING = {
  monthly: 7,
  yearly: 6,
};

function normalizePlanKey(planCode: string): "starter" | "pro" | "enterprise" | "addon_automation" {
  const normalized = String(planCode || "").toUpperCase();
  if (normalized === "PRO" || normalized === "PROFESSIONAL") return "pro";
  if (normalized === "ENTERPRISE") return "enterprise";
  if (normalized === "ADDON-AUTOMATION") return "addon_automation";
  return "starter";
}

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
    const isAddonPlan = planCode.startsWith("ADDON-");

    const billingCycle = String(body?.billingCycle || "MONTHLY").toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";
    const successUrl = String(body?.successUrl || "");
    const cancelUrl = body?.cancelUrl ? String(body.cancelUrl) : null;
    const couponCode = body?.couponCode ? String(body.couponCode).toUpperCase().trim() : null;
    const displayCurrency = body?.displayCurrency ? String(body.displayCurrency).toUpperCase() : null;
    const displayCountry = body?.displayCountry ? String(body.displayCountry).toUpperCase() : null;
    const customPrice = Number(body?.customPrice || 0);
    const customModulesFromBody = parseCustomModules(body?.customModules);
    const normalizedPlan = normalizePlanKey(planCode);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, baseCurrency: true, country: true, activeModules: true },
    });
    if (!company) return apiError("Company not found", 404);

    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        })
      : null;

    let pricing = DEFAULT_PRICING;
    let seatPricing = DEFAULT_SEAT_PRICING;
    try {
      const latest = await prisma.activityLog.findFirst({
        where: { action: "PLAN_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      });
      if (latest?.details) {
        const cfg = JSON.parse(latest.details);
        if (cfg?.pricing) pricing = { ...pricing, ...cfg.pricing };
        if (cfg?.seatPricing) seatPricing = { ...seatPricing, ...cfg.seatPricing };
      }
    } catch {}

    // Extra-seat billing applies to the base ERP plan's user count — not to
    // standalone add-ons like Automation, which are flat-priced.
    const extraSeats = isAddonPlan ? 0 : await getCompanyExtraSeats(companyId);
    const planBasePerMonth =
      Number(pricing[normalizedPlan]?.[billingCycle === "YEARLY" ? "yearly" : "monthly"]) ||
      Number(DEFAULT_PRICING[normalizedPlan][billingCycle === "YEARLY" ? "yearly" : "monthly"]);
    const seatPricePerMonth =
      Number(seatPricing[billingCycle === "YEARLY" ? "yearly" : "monthly"]) ||
      Number(DEFAULT_SEAT_PRICING[billingCycle === "YEARLY" ? "yearly" : "monthly"]);
    const seatAddonPerMonth = extraSeats > 0 ? extraSeats * seatPricePerMonth : 0;
    const computedPerMonth = planBasePerMonth + seatAddonPerMonth;
    const computedCycleAmount = billingCycle === "YEARLY" ? computedPerMonth * 12 : computedPerMonth;
    const baseCycleAmount = billingCycle === "YEARLY" ? planBasePerMonth * 12 : planBasePerMonth;
    const seatAddonCycleAmount = billingCycle === "YEARLY" ? seatAddonPerMonth * 12 : seatAddonPerMonth;
    const companyCustomModules = parseCustomModules(company.activeModules || "");
    const effectiveCustomModules = companyCustomModules.length > 0 ? companyCustomModules : customModulesFromBody;
    const computedCustomCycleAmount = getCustomPlanCycleAmountUsd(effectiveCustomModules, billingCycle);
    const finalCustomPrice =
      planCode === "CUSTOM"
        ? ((computedCustomCycleAmount > 0 ? computedCustomCycleAmount : (customPrice > 0 ? customPrice : 0)) + seatAddonCycleAmount)
        : computedCycleAmount;

    // ── Safepay (PKR customers) ───────────────────────────────────────────────
    const isPkrCustomer =
      displayCountry === "PK" ||
      displayCurrency === "PKR" ||
      company.country === "PK" ||
      company.baseCurrency === "PKR";

    if (isPkrCustomer && hasSafepayConfig()) {
      const base      = getRuntimeAppUrl(req.nextUrl.origin);
      const amountPkr = usdToPkr(finalCustomPrice > 0 ? finalCustomPrice : planBasePerMonth);
      const orderId   = `fnv-${companyId}-${Date.now()}`;

      const checkout = await createSafepayCheckout({
        orderId,
        amountPkr,
        companyId,
        userId,
        planCode,
        billingCycle,
        successUrl: successUrl || `${base}/dashboard/billing?upgrade=success`,
        cancelUrl:  cancelUrl  || `${base}/dashboard/billing?cancel=1`,
        customerEmail: user?.email || null,
        customerName:  user?.name  || company.name || null,
      });

      await prisma.activityLog.create({
        data: {
          companyId,
          userId: userId || null,
          action: "BILLING_CHECKOUT_CREATED",
          details: JSON.stringify({
            provider: "SAFEPAY",
            planCode,
            billingCycle,
            orderId,
            tracker: checkout.tracker,
            amountPkr,
            displayCurrency: "PKR",
            displayCountry:  "PK",
            baseCycleAmount,
            createdAt: new Date().toISOString(),
          }),
        },
      }).catch(() => {});

      return apiOk({
        url:      checkout.checkoutUrl,
        provider: "safepay",
        tracker:  checkout.tracker,
        orderId,
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

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
        customPriceUsd: finalCustomPrice > 0 ? finalCustomPrice : null,
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
            baseCycleAmount,
            seatAddonCycleAmount,
            seatAddonPerMonth,
            extraSeats,
            customModules: effectiveCustomModules,
            checkoutCycleAmount: finalCustomPrice,
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

    // TEMPORARY: Lemon Squeezy isn't activated yet, so no payment provider is
    // configured in production either. Rather than blocking every signup with
    // a hard error, fall through to the same no-payment activation path used
    // in dev. Remove this bypass once Lemon Squeezy is live.
    //
    // Direct activation fallback — add-ons never touch Company.plan/subscriptionStatus
    if (isAddonPlan) {
      const base = getRuntimeAppUrl(req.nextUrl.origin);
      if (planCode === "ADDON-AUTOMATION") {
        // Schema must match the table the admin panel actually created
        // (app/api/admin/automation-addon/route.ts) — columns are "price" and
        // "activatedAt", not "pricePerMonth"/"createdAt"/"updatedAt". Using the
        // wrong names here previously made the insert fail with "column ...
        // does not exist" — silently swallowed, so checkout reported
        // "activated" while nothing was actually saved.
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "AutomationAddon" (
            "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "companyId"   TEXT NOT NULL UNIQUE,
            "enabled"     BOOLEAN NOT NULL DEFAULT true,
            "plan"        TEXT NOT NULL DEFAULT 'monthly',
            "price"       DOUBLE PRECISION NOT NULL DEFAULT 79,
            "activatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
            "expiresAt"   TIMESTAMPTZ,
            "notes"       TEXT
          )
        `);
        await prisma.$executeRaw`
          INSERT INTO "AutomationAddon" ("companyId", "enabled", "plan", "price")
          VALUES (${companyId}, true, ${billingCycle.toLowerCase()}, ${finalCustomPrice > 0 ? finalCustomPrice : 79})
          ON CONFLICT ("companyId") DO UPDATE SET "enabled" = true, "plan" = EXCLUDED.plan, "price" = EXCLUDED.price, "activatedAt" = now()
        `;
      }
      await prisma.activityLog.create({
        data: { companyId, userId: userId || null, action: "ADDON_AUTOMATION_ACTIVATED", details: JSON.stringify({ planCode, billingCycle, activatedAt: new Date().toISOString(), provider: "DIRECT_FALLBACK_DEV_ONLY" }) },
      }).catch(() => {});
      const successRedirect = String(body?.successUrl || `${base}/dashboard/automation?addon=activated`);
      return apiOk({ url: successRedirect, activated: true });
    }

    // Development/local fallback only
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
          baseCycleAmount,
          seatAddonCycleAmount,
          seatAddonPerMonth,
          extraSeats,
          customModules: effectiveCustomModules,
          checkoutCycleAmount: finalCustomPrice,
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
