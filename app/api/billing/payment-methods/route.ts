import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { hasLemonSqueezyConfig } from "@/lib/lemonsqueezy";
import { isSafepayCheckoutEnabled } from "@/lib/safepay";
import { resolvePricingRegion } from "@/lib/geoCountry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/billing/payment-methods
 *
 * FinovaOS never sees a card — Lemon Squeezy is the merchant of record and
 * holds it. But "we don't store it" is not the same as "we can't show it": the
 * subscription record carries the brand and last four digits, and Lemon Squeezy
 * mints a signed, single-use link for changing the card. That is enough to show
 * `Mastercard •••• 7726` with an Update button, which is all a customer wants
 * from this page.
 *
 * Previously this route returned a hard-coded empty list and the billing page
 * said "No card details are stored in FinovaOS" — technically true, and useless
 * to someone whose card was about to expire.
 */

type LemonSubscriptionAttrs = {
  card_brand?: string | null;
  card_last_four?: string | null;
  status?: string | null;
  renews_at?: string | null;
  urls?: { update_payment_method?: string | null } | null;
};

async function fetchLemonSubscription(subscriptionId: string): Promise<LemonSubscriptionAttrs | null> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data?.attributes as LemonSubscriptionAttrs) || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const subscription = await prisma.subscription
    .findUnique({
      where: { companyId },
      select: { provider: true, stripeSubscriptionId: true, status: true },
    })
    .catch(() => null);

  // An admin-granted subscription — an offline deal, paid by bank transfer.
  //
  // There is no gateway behind it, so the branch below (which knows only
  // "gateway subscription" or "nothing") told a fully paid-up customer
  // "No active subscription yet — a card is collected at checkout", directly
  // under a green Active badge and a paid invoice. Answered on its own terms
  // instead: no card is stored, and that is correct rather than incomplete.
  const company = await prisma.company
    .findUnique({ where: { id: companyId }, select: { accessGrantedUntil: true, country: true } })
    .catch(() => null);

  /**
   * Whether the customer should be offered a fresh checkout on the plan they
   * already have — normally a no-op, and so normally hidden.
   *
   * Two cases need it, and neither had any route through the UI: an offline
   * customer moving onto a card, and a Pakistani customer moving from Lemon
   * Squeezy to Safepay once that gateway is live. In both, the plan is not
   * changing, so the Plans tab — which disables the button on the current plan
   * — offered nothing, and the only way through was to buy a *different* plan.
   */
  function reCheckout(): { canReCheckout: boolean; reCheckoutLabel: string | null; reCheckoutReason: string | null } {
    if (!subscription?.stripeSubscriptionId) {
      return {
        canReCheckout: true,
        reCheckoutLabel: "Pay by card",
        reCheckoutReason: "Move this workspace onto card billing. Your data and settings stay exactly as they are.",
      };
    }
    // Region is resolved server-side from the request, the same way checkout
    // does it — a client-supplied country must not decide who gets Safepay.
    const region = resolvePricingRegion(req, company?.country || null);
    const wouldUseSafepay = region.isPakistan && isSafepayCheckoutEnabled();
    if (wouldUseSafepay && String(subscription.provider).toUpperCase() === "LEMONSQUEEZY") {
      return {
        canReCheckout: true,
        reCheckoutLabel: "Switch to local payment",
        reCheckoutReason:
          "Pay in rupees through Safepay instead of an international card. Your current subscription is cancelled automatically once the new one is paid — you are never billed twice.",
      };
    }
    return { canReCheckout: false, reCheckoutLabel: null, reCheckoutReason: null };
  }

  const onManualBilling =
    !subscription?.stripeSubscriptionId &&
    Boolean(company?.accessGrantedUntil && company.accessGrantedUntil.getTime() > Date.now());

  if (onManualBilling) {
    return NextResponse.json({
      provider: "MANUAL",
      managedExternally: false,
      manualBilling: true,
      paymentMethods: [],
      paymentMethod: null,
      defaultId: null,
      updateUrl: null,
      ...reCheckout(),
      note: "This workspace is billed directly by arrangement — we issue your invoice each period and no card is stored here.",
    });
  }

  const provider = subscription?.provider || (hasLemonSqueezyConfig() ? "LEMONSQUEEZY" : "INTERNAL");

  if (provider !== "LEMONSQUEEZY" || !subscription?.stripeSubscriptionId) {
    return NextResponse.json({
      provider,
      managedExternally: provider === "LEMONSQUEEZY",
      paymentMethod: null,
      updateUrl: null,
      ...reCheckout(),
      note:
        provider === "LEMONSQUEEZY"
          ? "No active subscription yet — a card is collected at checkout."
          : "Payment methods are not configured yet for this workspace.",
    });
  }

  const attrs = await fetchLemonSubscription(subscription.stripeSubscriptionId);

  // The update link is short-lived and signed by Lemon Squeezy, so it is
  // fetched per request rather than stored.
  const updateUrl = attrs?.urls?.update_payment_method || null;
  const brand = attrs?.card_brand ? String(attrs.card_brand) : null;
  const lastFour = attrs?.card_last_four ? String(attrs.card_last_four) : null;

  // Returned in the same array shape the billing page already renders, so the
  // existing card row lights up without a UI rewrite. Expiry is deliberately
  // absent — Lemon Squeezy does not expose it, and inventing a value here
  // would put a wrong expiry date in front of the customer.
  const paymentMethods =
    brand || lastFour
      ? [
          {
            id: subscription.stripeSubscriptionId,
            brand: (brand || "unknown").toLowerCase(),
            last4: lastFour || "••••",
            expMonth: 0,
            expYear: 0,
            holderName: "",
            isDefault: true,
          },
        ]
      : [];

  return NextResponse.json({
    provider: "LEMONSQUEEZY",
    managedExternally: true,
    paymentMethods,
    defaultId: paymentMethods[0]?.id ?? null,
    updateUrl,
    ...reCheckout(),
    subscriptionStatus: attrs?.status || subscription.status || null,
    renewsAt: attrs?.renews_at || null,
    note: updateUrl
      ? null
      : "Could not reach Lemon Squeezy for the current card. Try again shortly.",
  });
}

function externallyManaged() {
  return NextResponse.json(
    {
      error:
        "Cards are held by Lemon Squeezy, not FinovaOS. Use the Update button to change the card on file.",
    },
    { status: 400 },
  );
}

export const POST = externallyManaged;
export const PATCH = externallyManaged;
export const DELETE = externallyManaged;
