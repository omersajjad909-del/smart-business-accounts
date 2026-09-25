import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiError, apiOk } from "@/lib/apiError";
import { getRuntimeAppUrl } from "@/lib/domains";
import { resolvePricingRegion } from "@/lib/geoCountry";
import { createLemonCheckout, hasLemonSqueezyConfig } from "@/lib/lemonsqueezy";
import { getLaunchDiscount } from "@/lib/launchDiscount";
import {
  createSafepayCheckout,
  createSafepaySubscriptionCheckout,
  getSafepayPlanId,
  isSafepayAllowedForCompany,
  isSafepayCheckoutEnabled,
  usdToPkr,
} from "@/lib/safepay";
import { getCompanyExtraSeats } from "@/lib/companySeatLimit";
import { getCustomPlanCycleAmountUsd, getModuleRate, parseCustomModules } from "@/lib/customPlanPricing";
import { FX_USD } from "@/lib/currency";
import { sendPlanActivatedEmail } from "@/lib/email";
import { AUTOMATION_ADDON_ENABLED, isAutomationAddon } from "@/lib/addons";

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
    // Client-supplied only — these reflect what the browser was *showing* and
    // are used for logging/receipt display. They must never reach variant or
    // price selection: the payment page seeds them from `?country=`/`?currency=`
    // query params, so trusting them let anyone self-serve the discounted
    // Pakistan price by editing the URL. See resolvePricingCountry() below.
    const requestedCurrency = body?.displayCurrency ? String(body.displayCurrency).toUpperCase() : null;
    const requestedCountry = body?.displayCountry ? String(body.displayCountry).toUpperCase() : null;
    const customPrice = Number(body?.customPrice || 0);
    const customModulesFromBody = parseCustomModules(body?.customModules);
    const normalizedPlan = normalizePlanKey(planCode);

    // The Automation add-on is not on sale yet — its Lemon Squeezy variants are
    // dead. Refused here rather than only hiding the buttons, because an old
    // link or a saved tab would otherwise still reach a checkout that errors.
    if (isAutomationAddon(planCode) && !AUTOMATION_ADDON_ENABLED) {
      return apiError("The Automation add-on is not available yet.", 403);
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, baseCurrency: true, country: true, activeModules: true },
    });
    if (!company) return apiError("Company not found", 404);

    // Authoritative, server-side pricing region. Derived from the stored
    // company record and edge geo headers only.
    // IP-driven, same resolver /api/public/pricing-region serves the UI from —
    // so the currency on screen is always the currency charged.
    const pricingRegion = resolvePricingRegion(req, company.country);
    const pricingCountry = pricingRegion.country;

    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        })
      : null;

    let pricing = DEFAULT_PRICING;
    let seatPricing = DEFAULT_SEAT_PRICING;
    // Custom-plan module rates as the admin saved them. The hardcoded table in
    // lib/customPlanPricing is only the fallback: reading it here meant Admin →
    // Plans → Module Pricing changed what /pricing quoted while checkout went
    // on charging the old figure.
    let savedCustomModules: any[] | null = null;
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
        if (Array.isArray(cfg?.customPlan?.modules)) savedCustomModules = cfg.customPlan.modules;
      }
    } catch {}

    // Admin-set PKR-native prices — the same PKR_PLAN_CONFIG row /api/public/pricing
    // serves, and therefore the same figure /pricing and the payment page put on
    // screen for a Pakistani visitor.
    //
    // Safepay used to charge usdToPkr(planBasePerMonth) instead, which is the
    // international list price run through FX. Those are not the same number and
    // never were: Starter shows as Rs 4,999 and was charged at Rs 13,720,
    // Enterprise shows as Rs 24,999 and was charged at Rs 69,720. The payment page
    // had already been fixed to stop displaying the FX figure; the charge had not,
    // so the mismatch simply moved out of sight.
    let pkrPlanPricing: Record<string, { monthly: number; yearly: number }> | null = null;
    try {
      const pkrLatest = await prisma.activityLog.findFirst({
        where: { action: "PKR_PLAN_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      });
      const pkr = pkrLatest?.details ? JSON.parse(pkrLatest.details)?.pricing : null;
      if (pkr) {
        // `yearly` is stored per-month and displayed as an annual total — the ×12
        // happens in /api/public/pricing, so it has to happen here too or a yearly
        // plan is charged one month's worth.
        pkrPlanPricing = {
          starter:    { monthly: Number(pkr.starter?.monthly    ?? 4999),  yearly: Number(pkr.starter?.yearly    ?? 3999)  * 12 },
          pro:        { monthly: Number(pkr.pro?.monthly        ?? 9999),  yearly: Number(pkr.pro?.yearly        ?? 7999)  * 12 },
          enterprise: { monthly: Number(pkr.enterprise?.monthly ?? 24999), yearly: Number(pkr.enterprise?.yearly ?? 19999) * 12 },
        };
      }
    } catch {}

    // Rupee totals are converted to USD once, at the end, because Lemon Squeezy
    // settles in USD. Same table the pricing pages display from, so the figure
    // charged tracks the figure quoted.
    const PKR_PER_USD = Number(FX_USD.PKR) || 278;

    /**
     * What the chosen modules cost, in the currency this customer is being
     * billed in and for the cycle they picked.
     *
     * Rupee rates are summed as rupees and converted once at the end, because
     * Lemon Squeezy takes the charge in USD. Summing converted USD instead
     * would bill a Pakistani customer the international rate — the page said
     * Rs 5,498 while checkout asked for $27, which is Rs 7,506.
     */
    const customModuleAmount = (moduleIds: string[], forPakistan: boolean): number => {
      const yearly = billingCycle === "YEARLY";
      const rows = savedCustomModules;
      const rateOf = (id: string): number | null => {
        const saved = rows?.find((m: any) => m?.id === id);
        if (saved) {
          const v = forPakistan
            ? (yearly ? Number(saved.pricePkrYearly) || 0 : Number(saved.pricePkr) || 0)
            : (yearly ? Number(saved.priceYearly) || 0 : Number(saved.price) || 0);
          if (v > 0) return v;
        }
        return getModuleRate(id, forPakistan ? "PKR" : "USD", yearly ? "YEARLY" : "MONTHLY");
      };

      let total = 0;
      for (const id of moduleIds) {
        const rate = rateOf(id);
        // A module with no rate in this currency drops the whole selection back
        // to the USD path rather than billing a partial total.
        if (rate == null || rate <= 0) return 0;
        total += rate;
      }
      if (total <= 0) return 0;
      const perCycle = yearly ? total * 12 : total;
      return forPakistan ? perCycle / PKR_PER_USD : perCycle;
    };

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
    // Pakistan is billed off the rupee card; everyone else off the USD one.
    const customFromRates = customModuleAmount(effectiveCustomModules, pricingRegion.isPakistan);
    const computedCustomCycleAmount =
      customFromRates > 0
        ? customFromRates
        : getCustomPlanCycleAmountUsd(effectiveCustomModules, billingCycle);
    const finalCustomPrice =
      planCode === "CUSTOM"
        ? ((computedCustomCycleAmount > 0 ? computedCustomCycleAmount : (customPrice > 0 ? customPrice : 0)) + seatAddonCycleAmount)
        : computedCycleAmount;

    // ── Safepay (PKR customers) ───────────────────────────────────────────────
    // Server-resolved only. The two client-supplied checks that used to be
    // here (`displayCountry === "PK" || displayCurrency === "PKR"`) meant a
    // request body — or just `?country=PK` in the page URL — granted Pakistan
    // pricing to anyone, anywhere.
    // Purely IP-driven. `company.baseCurrency === "PKR"` used to be OR'd in
    // here, which pinned an account to PKR forever regardless of where the
    // request actually came from — the opposite of the rule we now follow.
    const isPkrCustomer = pricingRegion.isPakistan;

    // Gated on approval, not just on credentials — see isSafepayCheckoutEnabled.
    // While the merchant account is under review this is false, and Pakistan
    // falls through to the Lemon Squeezy branch below, which selects the _PK
    // variants carrying the same PKR-equivalent prices.
    // A Pakistani buyer who does not reach Safepay falls through to Lemon Squeezy
    // in silence, which is correct behaviour but indistinguishable from a
    // misconfiguration — one missing env var on the host sends every PKR customer
    // to the wrong gateway with nothing logged anywhere. Say which piece is absent.
    if (isPkrCustomer && !isSafepayCheckoutEnabled()) {
      console.warn("[safepay] PKR customer routed to Lemon Squeezy — Safepay unavailable:", {
        SAFEPAY_API_KEY:          process.env.SAFEPAY_API_KEY ? "set" : "MISSING",
        SAFEPAY_SECRET_KEY:       process.env.SAFEPAY_SECRET_KEY ? "set" : "MISSING",
        SAFEPAY_WEBHOOK_SECRET:   process.env.SAFEPAY_WEBHOOK_SECRET ? "set" : "MISSING",
        SAFEPAY_CHECKOUT_ENABLED: process.env.SAFEPAY_CHECKOUT_ENABLED?.trim() || "(unset)",
        note: "all four are required; CHECKOUT_ENABLED must be the literal 'true'",
      });
    }

    // The allow-list is normally empty and lets everyone through. It is only
    // populated while production runs against sandbox credentials — see
    // isSafepayAllowedForCompany.
    if (isPkrCustomer && isSafepayCheckoutEnabled() && isSafepayAllowedForCompany(companyId)) {
      const base = getRuntimeAppUrl(req.nextUrl.origin);

      // ── What this customer actually owes, in rupees ──
      //
      // Priority is the PKR-native table, because that is the number on screen.
      // The FX path survives only as a fallback for plans the table does not
      // cover (CUSTOM, add-ons), where the displayed figure is FX-derived too and
      // the two therefore still agree.
      const pkrKey =
        planCode === "PRO" || planCode === "PROFESSIONAL" ? "pro"
        : planCode === "ENTERPRISE"                       ? "enterprise"
        : planCode === "STARTER"                          ? "starter"
        : null;
      const pkrRow      = pkrKey ? pkrPlanPricing?.[pkrKey] : null;
      const pkrBasePrice = pkrRow
        ? (billingCycle === "YEARLY" ? pkrRow.yearly : pkrRow.monthly)
        : null;

      // Extra seats have no PKR-native rate, so they stay on FX. They are added
      // after the discount because the coupon applies to the plan, which is how
      // the payment page reads it too.
      const seatsPkr = seatAddonCycleAmount > 0 ? usdToPkr(seatAddonCycleAmount) : 0;

      // The coupon has to be applied here. Lemon Squeezy redeems the code on its
      // own side, so the branch below just forwards it — Safepay has no such
      // notion, and this branch returns long before the redemption block at the
      // bottom of this route ever runs. A Pakistani buyer entering LAUNCH50 was
      // shown the discounted total and then charged the full one.
      let discountPkr = 0;
      let appliedCoupon: { id: string; type: string; value: number } | null = null;
      if (couponCode && pkrBasePrice !== null) {
        try {
          const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
          const planSlug = pkrKey;
          const usable =
            coupon &&
            coupon.active &&
            (!coupon.expiresAt || coupon.expiresAt >= new Date()) &&
            (!coupon.maxUses || coupon.usedCount < coupon.maxUses) &&
            (!coupon.applicableTo || coupon.applicableTo === planSlug);
          if (usable && coupon) {
            // Same arithmetic the payment page displays with — including that a
            // `fixed` value is subtracted from the rupee figure as-is, not run
            // through FX first. Diverging here would put the old mismatch back.
            discountPkr =
              coupon.type === "percent"
                ? (pkrBasePrice * Number(coupon.value)) / 100
                : Number(coupon.value);
            discountPkr = Math.min(Math.max(0, discountPkr), pkrBasePrice);
            appliedCoupon = { id: coupon.id, type: coupon.type, value: Number(coupon.value) };
          }
        } catch { /* a coupon lookup must never cost the sale */ }
      }

      // The store-wide launch offer (50% off the first 3 months). Lemon Squeezy
      // applies it to its checkouts and repeats it on renewals itself; Safepay
      // charges each month as a fresh one-off payment, so it has to be applied
      // here for as long as the offer runs. The payment page already shows it,
      // so without this a Pakistani buyer saw half price and paid full.
      // Monthly only — the offer does not stack with the yearly 20%. Counting
      // paid monthly invoices from any provider keeps someone who started on
      // Lemon Squeezy from getting a second three months after switching.
      let launchDiscount: { code: string; months: number; paidMonths: number } | null = null;
      if (!appliedCoupon && billingCycle === "MONTHLY" && pkrBasePrice !== null) {
        try {
          const launch = await getLaunchDiscount();
          if (launch) {
            const months = launch.durationMonths ?? 3;
            const paidMonths = await prisma.platformInvoice.count({
              where: {
                companyId,
                billingCycle: "MONTHLY",
                testMode: false,
                status: { in: ["PAID", "PARTIALLY_REFUNDED"] },
                total: { gt: 0 },
              },
            });
            if (paidMonths < months) {
              discountPkr =
                launch.type === "percent"
                  ? (pkrBasePrice * launch.value) / 100
                  : launch.value;
              discountPkr = Math.min(Math.max(0, discountPkr), pkrBasePrice);
              launchDiscount = { code: launch.code, months, paidMonths };
            }
          }
        } catch { /* the launch offer must never cost the sale */ }
      }

      // Not rounded to whole rupees: a 50% coupon on Rs 3,999 is Rs 1,999.5, and
      // the payment page prints exactly that. pkrToPaisa rounds at the paisa, which
      // is the only place rounding belongs.
      const amountPkr = pkrBasePrice !== null
        ? Math.max(0, pkrBasePrice - discountPkr) + seatsPkr
        : usdToPkr(finalCustomPrice > 0 ? finalCustomPrice : planBasePerMonth);

      const orderId = `fnv-${companyId}-${Date.now()}`;

      // ── Monthly plans: a recurring Safepay subscription ──
      //
      // Safepay charges the card every month itself. The launch offer is a
      // separate half-price intro plan limited to 3 billing cycles (see the
      // Subscriptions note in lib/safepay.ts), offered only to a company that has
      // never paid a monthly invoice or started an intro before.
      //
      // Anything a fixed-price plan cannot express — a typed coupon, extra seats,
      // custom plans, yearly — and any tier whose plan id is not configured falls
      // through to the one-off payment below, which prices it exactly.
      if (!appliedCoupon && billingCycle === "MONTHLY" && seatsPkr === 0 && pkrKey) {
        let introEligible = false;
        try {
          const [paidMonths, priorIntro] = await Promise.all([
            prisma.platformInvoice.count({
              where: {
                companyId,
                billingCycle: "MONTHLY",
                testMode: false,
                status: { in: ["PAID", "PARTIALLY_REFUNDED"] },
                total: { gt: 0 },
              },
            }),
            prisma.activityLog.findFirst({
              where: { companyId, action: "SAFEPAY_PAYMENT_SUCCESS", details: { contains: '"intro":true' } },
              select: { id: true },
            }),
          ]);
          introEligible = paidMonths === 0 && !priorIntro;
        } catch { /* unknown history — charge the full plan rather than guess */ }

        const introPlanId = introEligible ? getSafepayPlanId(planCode, true) : "";
        const planId = introPlanId || getSafepayPlanId(planCode, false);

        if (planId) {
          const intro = Boolean(introPlanId);
          const sub = await createSafepaySubscriptionCheckout({
            planId,
            reference: orderId,
            successUrl: successUrl || `${base}/dashboard/billing?upgrade=success`,
            cancelUrl:  cancelUrl  || `${base}/dashboard/billing?cancel=1`,
          });

          await prisma.activityLog.create({
            data: {
              companyId,
              userId: userId || null,
              action: "BILLING_CHECKOUT_CREATED",
              details: JSON.stringify({
                provider: "SAFEPAY",
                mode: "subscription",
                planCode,
                billingCycle,
                orderId,
                safepayPlanId: planId,
                intro,
                pkrBasePrice,
                displayCurrency: "PKR",
                displayCountry:  "PK",
                createdAt: new Date().toISOString(),
              }),
            },
          }).catch(() => {});

          return apiOk({ url: sub.checkoutUrl, provider: "safepay", orderId });
        }
      }

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
            // Kept so a disputed charge can be reconstructed without guessing
            // which price table or coupon was in force at the time.
            pkrBasePrice,
            discountPkr,
            couponCode: appliedCoupon ? couponCode : null,
            launchDiscount,
            seatsPkr,
            displayCurrency: "PKR",
            displayCountry:  "PK",
            baseCycleAmount,
            createdAt: new Date().toISOString(),
          }),
        },
      }).catch(() => {});

      // Redeemed here rather than at the bottom of the route, which this branch
      // never reaches. Recorded at checkout creation, matching what the Lemon
      // Squeezy path does.
      if (appliedCoupon) {
        await prisma.$transaction([
          prisma.couponRedemption.create({
            data: { couponId: appliedCoupon.id, userId: userId || null, companyId },
          }),
          prisma.coupon.update({
            where: { id: appliedCoupon.id },
            data: { usedCount: { increment: 1 } },
          }),
        ]).catch(() => {});
      }

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
      // The Lemon Squeezy "_PK" variant already carries the correct
      // discounted PKR-equivalent price directly in Lemon Squeezy's own
      // catalog. Sending customPriceUsd (always computed from the *global*
      // USD pricing) would override it with the full international rate —
      // exactly what silently charged Pakistani customers the world price.
      // Only override when it's actually needed: Custom-plan pricing is
      // always dynamic, and seat add-ons must be added on top of the base
      // price (PK-specific seat pricing doesn't exist yet, so seat add-ons
      // still price in USD for PK customers — a known follow-up gap, but the
      // common case of a plain plan signup now charges the right amount).
      const skipCustomPriceForPk = isPkrCustomer && planCode !== "CUSTOM" && seatAddonCycleAmount <= 0;
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
        displayCurrency: pricingRegion.currency,
        // Drives _PK variant selection in resolveLemonVariantId — server-resolved.
        displayCountry: pricingCountry,
        customPriceUsd: skipCustomPriceForPk ? null : (finalCustomPrice > 0 ? finalCustomPrice : null),
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
            displayCurrency: pricingRegion.currency,
            displayCountry: pricingCountry,
            pricingRegionSource: pricingRegion.source,
            companyCountry: company.country,
            requestedCountry,
            requestedCurrency,
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

    // No payment provider configured — block checkout in production so a real
    // payment method (Lemon Squeezy) is required instead of silently activating
    // for free. Re-enabled now that Lemon Squeezy is configured — the branch
    // above should handle real checkouts before this is ever reached.
    if (process.env.NODE_ENV === "production") {
      return apiError("Payment provider not configured. Please contact support.", 503);
    }

    // Development/local fallback only — add-ons never touch Company.plan/subscriptionStatus
    if (isAddonPlan) {
      const base = getRuntimeAppUrl(req.nextUrl.origin);
      const successRedirect = String(body?.successUrl || `${base}/dashboard/automation?addon=activated`);

      if (!body?.forceActivate) {
        return apiOk({ url: successRedirect, activated: false, provider: "direct_fallback_dev_only" });
      }

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
      if (user?.email) {
        sendPlanActivatedEmail({
          customerEmail: user.email,
          customerName: user.name,
          planLabel: "Business Automation Add-on",
          billingCycle,
          amountUsd: finalCustomPrice > 0 ? finalCustomPrice : 79,
        }).catch(() => {});
      }
      return apiOk({ url: successRedirect, activated: true });
    }

    // Development/local fallback only — do not change the company until
    // a real payment provider webhook confirms the purchase.
    if (!body?.forceActivate) {
      const base = getRuntimeAppUrl(req.nextUrl.origin);
      const redirectUrl = successUrl || `${base}/dashboard/billing?upgrade=success`;
      return apiOk({ url: redirectUrl, sessionId: "direct", provider: "direct_fallback", activated: false });
    }

    await prisma.company.update({
      where: { id: companyId },
      data: {
        plan: planCode,
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + (billingCycle === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000),
        // Deliberately does NOT write baseCurrency/country from the request.
        // It used to persist the client's claimed values onto the company,
        // which turned a one-off `?country=PK` into a permanent discount on
        // every future renewal. The company's region is set at signup and
        // only an admin should change it.
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
          displayCurrency: pricingRegion.currency,
          displayCountry: pricingCountry,
          requestedCountry,
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

    if (user?.email) {
      sendPlanActivatedEmail({
        customerEmail: user.email,
        customerName: user.name,
        planLabel: `${planCode} Plan`,
        billingCycle,
        amountUsd: finalCustomPrice > 0 ? finalCustomPrice : planBasePerMonth,
      }).catch(() => {});
    }

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
