import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { hasLemonSqueezyConfig } from "@/lib/lemonsqueezy";

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

  const provider = subscription?.provider || (hasLemonSqueezyConfig() ? "LEMONSQUEEZY" : "INTERNAL");

  if (provider !== "LEMONSQUEEZY" || !subscription?.stripeSubscriptionId) {
    return NextResponse.json({
      provider,
      managedExternally: provider === "LEMONSQUEEZY",
      paymentMethod: null,
      updateUrl: null,
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

  return NextResponse.json({
    provider: "LEMONSQUEEZY",
    managedExternally: true,
    paymentMethod: brand || lastFour ? { brand, lastFour } : null,
    updateUrl,
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
