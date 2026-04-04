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

export function resolveLemonVariantId(planCode: string, billingCycle: BillingCycle) {
  const normalizedPlan = String(planCode || "STARTER").toUpperCase();
  const cycle = billingCycle === "YEARLY" ? "YEARLY" : "MONTHLY";

  const exactMap: Record<string, string> = {
    STARTER_MONTHLY: env("LEMONSQUEEZY_VARIANT_STARTER_MONTHLY"),
    STARTER_YEARLY: env("LEMONSQUEEZY_VARIANT_STARTER_YEARLY"),
    PRO_MONTHLY: env("LEMONSQUEEZY_VARIANT_PRO_MONTHLY"),
    PRO_YEARLY: env("LEMONSQUEEZY_VARIANT_PRO_YEARLY"),
    PROFESSIONAL_MONTHLY: env("LEMONSQUEEZY_VARIANT_PRO_MONTHLY") || env("LEMONSQUEEZY_VARIANT_PROFESSIONAL_MONTHLY"),
    PROFESSIONAL_YEARLY: env("LEMONSQUEEZY_VARIANT_PRO_YEARLY") || env("LEMONSQUEEZY_VARIANT_PROFESSIONAL_YEARLY"),
    ENTERPRISE_MONTHLY: env("LEMONSQUEEZY_VARIANT_ENTERPRISE_MONTHLY"),
    ENTERPRISE_YEARLY: env("LEMONSQUEEZY_VARIANT_ENTERPRISE_YEARLY"),
    CUSTOM_MONTHLY: env("LEMONSQUEEZY_VARIANT_CUSTOM_MONTHLY"),
    CUSTOM_YEARLY: env("LEMONSQUEEZY_VARIANT_CUSTOM_YEARLY"),
  };

  return exactMap[`${normalizedPlan}_${cycle}`] || "";
}

export async function createLemonCheckout(input: LemonCheckoutInput) {
  const apiKey = env("LEMONSQUEEZY_API_KEY");
  const storeId = env("LEMONSQUEEZY_STORE_ID");
  if (!apiKey || !storeId) {
    throw new Error("Lemon Squeezy is not configured.");
  }

  const variantId = resolveLemonVariantId(input.planCode, input.billingCycle);
  if (!variantId) {
    throw new Error(`Missing Lemon Squeezy variant for ${input.planCode} ${input.billingCycle}.`);
  }

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
          ...(input.couponCode ? { discount_code: input.couponCode } : {}),
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

  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      json?.errors?.[0]?.detail ||
      json?.errors?.[0]?.title ||
      json?.message ||
      "Failed to create Lemon Squeezy checkout.";
    throw new Error(detail);
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
