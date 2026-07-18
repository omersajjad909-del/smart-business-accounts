import { createHmac, timingSafeEqual } from "crypto";

// ─── Safepay API base URLs ─────────────────────────────────────────────────────
// Adjust these if Safepay updates their endpoints.
const SANDBOX_BASE  = "https://sandbox.api.getsafepay.com";
const PROD_BASE     = "https://api.getsafepay.com";
const SANDBOX_CHECKOUT = "https://sandbox.safepay.pk/checkout";
const PROD_CHECKOUT    = "https://www.safepay.pk/checkout";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function getBase() {
  return env("SAFEPAY_ENVIRONMENT") === "production" ? PROD_BASE : SANDBOX_BASE;
}
function getCheckoutBase() {
  return env("SAFEPAY_ENVIRONMENT") === "production" ? PROD_CHECKOUT : SANDBOX_CHECKOUT;
}

export function hasSafepayConfig() {
  return Boolean(env("SAFEPAY_API_KEY") && env("SAFEPAY_WEBHOOK_SECRET"));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafepayCheckoutInput = {
  orderId: string;          // Our unique reference (e.g. company_id + timestamp)
  amountPkr: number;        // Amount in PKR (rupees, not paisa)
  companyId: string;
  userId?: string | null;
  planCode: string;
  billingCycle: "MONTHLY" | "YEARLY";
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  customerName?: string | null;
};

export type SafepayCheckoutResult = {
  checkoutUrl: string;      // Full URL to redirect user to
  tracker: string;          // Safepay tracker token — store on Subscription row
  orderId: string;
};

// ─── Create checkout session ──────────────────────────────────────────────────

export async function createSafepayCheckout(input: SafepayCheckoutInput): Promise<SafepayCheckoutResult> {
  const apiKey = env("SAFEPAY_API_KEY");
  if (!apiKey) throw new Error("Safepay is not configured.");

  const body = {
    intent: "PAYFAST",
    mode: "payment",
    currency: "PKR",
    amount: Math.round(input.amountPkr),   // Safepay expects integer rupees
    order_id: input.orderId,
    cancel_url: input.cancelUrl,
    success_url: input.successUrl,
    metadata: {
      company_id:    input.companyId,
      user_id:       input.userId || "",
      plan_code:     input.planCode,
      billing_cycle: input.billingCycle,
    },
    ...(input.customerEmail ? { customer: { email: input.customerEmail, name: input.customerName || "" } } : {}),
  };

  const response = await fetch(`${getBase()}/order/v1/init`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      json?.message ||
      json?.error ||
      json?.errors?.[0]?.message ||
      "Failed to create Safepay checkout session.";
    throw new Error(detail);
  }

  // Safepay returns the tracker token in data.tracker.token
  const tracker = json?.data?.tracker?.token || json?.tracker?.token || json?.token;
  if (!tracker) {
    throw new Error("Safepay checkout tracker token was missing in response.");
  }

  const checkoutUrl = `${getCheckoutBase()}?tracker=${tracker}&source=custom`;

  return { checkoutUrl, tracker: String(tracker), orderId: input.orderId };
}

// ─── Webhook signature verification ──────────────────────────────────────────
// Safepay signs webhooks with HMAC-SHA256 of the raw body using the webhook secret.
// The signature is sent in the `x-sfpy-signature` header.

export function verifySafepaySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = env("SAFEPAY_WEBHOOK_SECRET");
  if (!secret || !signatureHeader || !rawBody) return false;

  try {
    const provided = Buffer.from(signatureHeader.replace(/^sha256=/, ""), "hex");
    const expected = Buffer.from(
      createHmac("sha256", secret).update(rawBody).digest("hex"),
      "hex",
    );
    if (provided.length === 0 || provided.length !== expected.length) return false;
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

// ─── Status mapping ───────────────────────────────────────────────────────────
// Maps Safepay event/payment state to our internal subscription status.

export function mapSafepayEventToStatus(event: string): "ACTIVE" | "PAST_DUE" | "CANCELLED" | "INACTIVE" {
  switch (String(event || "").toLowerCase()) {
    case "payment:created":
    case "payment:success":
    case "payment.success":
    case "subscription:activated":
      return "ACTIVE";
    case "payment:failed":
    case "payment.failed":
    case "subscription:past_due":
      return "PAST_DUE";
    case "subscription:cancelled":
    case "subscription:canceled":
      return "CANCELLED";
    default:
      return "INACTIVE";
  }
}

// ─── PKR pricing helpers ──────────────────────────────────────────────────────
// Convert USD plan price to PKR for the Safepay checkout.
// Uses SAFEPAY_USD_PKR_RATE env var (set from your admin panel or a fixed rate).
// Default fallback: 1 USD = 280 PKR.

export function usdToPkr(usd: number): number {
  const rate = parseFloat(env("SAFEPAY_USD_PKR_RATE") || "280");
  return Math.round(usd * rate);
}
