import { createHmac, timingSafeEqual } from "crypto";

type BillingCycle = "MONTHLY" | "YEARLY";

type LemonCheckoutInput = {
  planCode: string;
  billingCycle: BillingCycle;
  successUrl: string;
  cancelUrl?: string | null;
  email?: string | null;
  name?: string | null;
  couponCode?: string | null;
  customPriceUsd?: number | null;
  companyId: string;
  userId?: string | null;
  displayCurrency?: string | null;
  displayCountry?: string | null;
  testMode?: boolean;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function hasLemonSqueezyConfig() {
  return Boolean(env("LEMONSQUEEZY_API_KEY") && env("LEMONSQUEEZY_STORE_ID"));
}

export function resolveLemonVariantId(
  planCode: string,
  billingCycle: BillingCycle,
  isPakistan = false,
) {
  // "ADDON-AUTOMATION" -> "AUTOMATION" so it resolves against the
  // LEMONSQUEEZY_VARIANT_AUTOMATION_* env vars below.
  const normalizedPlan = String(planCode || "STARTER").toUpperCase().replace(/^ADDON-/, "");
  const cycle = billingCycle === "YEARLY" ? "YEARLY" : "MONTHLY";
  const suffix = isPakistan ? "_PK" : "";

  const exactMap: Record<string, string> = {
    // Global variants
    STARTER_MONTHLY:      env("LEMONSQUEEZY_VARIANT_STARTER_MONTHLY"),
    STARTER_YEARLY:       env("LEMONSQUEEZY_VARIANT_STARTER_YEARLY"),
    PRO_MONTHLY:          env("LEMONSQUEEZY_VARIANT_PRO_MONTHLY"),
    PRO_YEARLY:           env("LEMONSQUEEZY_VARIANT_PRO_YEARLY"),
    PROFESSIONAL_MONTHLY: env("LEMONSQUEEZY_VARIANT_PRO_MONTHLY") || env("LEMONSQUEEZY_VARIANT_PROFESSIONAL_MONTHLY"),
    PROFESSIONAL_YEARLY:  env("LEMONSQUEEZY_VARIANT_PRO_YEARLY")  || env("LEMONSQUEEZY_VARIANT_PROFESSIONAL_YEARLY"),
    ENTERPRISE_MONTHLY:   env("LEMONSQUEEZY_VARIANT_ENTERPRISE_MONTHLY"),
    ENTERPRISE_YEARLY:    env("LEMONSQUEEZY_VARIANT_ENTERPRISE_YEARLY"),
    CUSTOM_MONTHLY:       env("LEMONSQUEEZY_VARIANT_CUSTOM_MONTHLY"),
    CUSTOM_YEARLY:        env("LEMONSQUEEZY_VARIANT_CUSTOM_YEARLY"),
    AUTOMATION_MONTHLY:   env("LEMONSQUEEZY_VARIANT_AUTOMATION_MONTHLY"),
    AUTOMATION_YEARLY:    env("LEMONSQUEEZY_VARIANT_AUTOMATION_YEARLY"),
    // Pakistan variants ($14/$32/$54 — matches PKR 3999/8999/14999)
    STARTER_MONTHLY_PK:      env("LEMONSQUEEZY_VARIANT_STARTER_MONTHLY_PK"),
    STARTER_YEARLY_PK:       env("LEMONSQUEEZY_VARIANT_STARTER_YEARLY_PK"),
    PRO_MONTHLY_PK:          env("LEMONSQUEEZY_VARIANT_PRO_MONTHLY_PK"),
    PRO_YEARLY_PK:           env("LEMONSQUEEZY_VARIANT_PRO_YEARLY_PK"),
    PROFESSIONAL_MONTHLY_PK: env("LEMONSQUEEZY_VARIANT_PRO_MONTHLY_PK"),
    PROFESSIONAL_YEARLY_PK:  env("LEMONSQUEEZY_VARIANT_PRO_YEARLY_PK"),
    ENTERPRISE_MONTHLY_PK:   env("LEMONSQUEEZY_VARIANT_ENTERPRISE_MONTHLY_PK"),
    ENTERPRISE_YEARLY_PK:    env("LEMONSQUEEZY_VARIANT_ENTERPRISE_YEARLY_PK"),
  };

  // Try PK variant first; fall back to global if PK not configured
  const pkKey = `${normalizedPlan}_${cycle}_PK`;
  if (isPakistan && exactMap[pkKey]) return exactMap[pkKey];

  return exactMap[`${normalizedPlan}_${cycle}`] || "";
}

export async function createLemonCheckout(input: LemonCheckoutInput) {
  const apiKey = env("LEMONSQUEEZY_API_KEY");
  const storeId = env("LEMONSQUEEZY_STORE_ID");
  if (!apiKey || !storeId) {
    throw new Error("Lemon Squeezy is not configured.");
  }

  // Was never passing isPakistan — the discounted _PK variant (which has its
  // own correct PKR-equivalent price set directly in Lemon Squeezy's catalog)
  // was never selected, so every Pakistani customer was silently checked out
  // on the full global-price variant instead.
  const isPakistan = String(input.displayCountry || "").toUpperCase() === "PK";
  const variantId = resolveLemonVariantId(input.planCode, input.billingCycle, isPakistan);
  if (!variantId) {
    throw new Error(`Missing Lemon Squeezy variant for ${input.planCode} ${input.billingCycle}.`);
  }

  // An explicit coupon the buyer typed, otherwise the store-wide launch code.
  const autoDiscountCode = env("LEMONSQUEEZY_LAUNCH_DISCOUNT") || null;
  const discountCode = input.couponCode || autoDiscountCode;

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        ...(input.customPriceUsd && input.customPriceUsd > 0
          ? { custom_price: Math.round(input.customPriceUsd * 100) }
          : {}),
        product_options: {
          redirect_url: input.successUrl,
          receipt_button_text: "Open FinovaOS",
          receipt_link_url: input.cancelUrl || input.successUrl,
          receipt_thank_you_note: "Your FinovaOS subscription is being activated.",
          enabled_variants: [Number(variantId)],
        },
        checkout_options: {
          embed: false,
          media: true,
          logo: true,
          desc: true,
          discount: true,
          subscription_preview: true,
          button_color: "#6366f1",
          button_text_color: "#ffffff",
        },
        checkout_data: {
          ...(input.email ? { email: input.email } : {}),
          ...(input.name ? { name: input.name } : {}),
          ...(input.displayCountry ? { billing_address: { country: input.displayCountry } } : {}),
          // Use provided coupon OR auto-apply launch discount if set
          ...(discountCode ? { discount_code: discountCode } : {}),
          custom: {
            company_id: input.companyId,
            user_id: input.userId || "",
            plan_code: input.planCode,
            billing_cycle: input.billingCycle,
            display_currency: input.displayCurrency || "",
            display_country: input.displayCountry || "",
          },
        },
        test_mode: input.testMode ?? env("LEMONSQUEEZY_TEST_MODE") === "true",
      },
      relationships: {
        store: {
          data: { type: "stores", id: String(storeId) },
        },
        variant: {
          data: { type: "variants", id: String(variantId) },
        },
      },
    },
  };

  async function postCheckout(payload: unknown) {
    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json().catch(() => ({}));
    const detail =
      json?.errors?.[0]?.detail ||
      json?.errors?.[0]?.title ||
      json?.message ||
      "Failed to create Lemon Squeezy checkout.";
    return { ok: response.ok, json, detail };
  }

  let result = await postCheckout(body);

  // The launch code is applied to every checkout from an env var, so a typo or
  // a code that was never created in Lemon Squeezy ("The discount code X does
  // not exist.") took down *all* checkouts — the buyer just saw an error and
  // could not pay at all. A store-wide promo failing is not a reason to refuse
  // the sale: drop it and retry at full price. A coupon the buyer typed
  // themselves still fails loudly, because they need to know it was rejected.
  const discountRejected =
    !result.ok && Boolean(autoDiscountCode) && !input.couponCode && /discount/i.test(result.detail);

  if (discountRejected) {
    const retryBody = JSON.parse(JSON.stringify(body));
    delete retryBody.data.attributes.checkout_data.discount_code;
    result = await postCheckout(retryBody);
  }

  const json = result.json;
  if (!result.ok) {
    throw new Error(result.detail);
  }

  const checkoutUrl = json?.data?.attributes?.url;
  if (!checkoutUrl) {
    throw new Error("Lemon Squeezy checkout URL was missing.");
  }

  return {
    url: String(checkoutUrl),
    checkoutId: String(json?.data?.id || ""),
    variantId: String(variantId),
    raw: json,
  };
}

export function verifyLemonSignature(rawBody: string, signatureHeader: string | null) {
  const secret = env("LEMONSQUEEZY_WEBHOOK_SECRET");
  if (!secret || !signatureHeader || !rawBody) return false;

  const provided = Buffer.from(signatureHeader, "hex");
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "hex");
  if (provided.length === 0 || expected.length === 0 || provided.length !== expected.length) return false;
  return timingSafeEqual(expected, provided);
}

export function mapLemonSubscriptionStatus(status: string) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "ACTIVE";
    case "on_trial":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "cancelled":
      return "CANCELLED";
    case "expired":
      return "INACTIVE";
    case "paused":
      return "SUSPENDED";
    case "unpaid":
      return "PAST_DUE";
    default:
      return "INACTIVE";
  }
}
