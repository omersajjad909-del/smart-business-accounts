import { createHmac, timingSafeEqual } from "crypto";

// ─── Safepay API hosts ────────────────────────────────────────────────────────
// Verified against @sfpy/node-core 0.3.5 (the library Safepay's own docs tell
// you to install). Everything below that looks arbitrary was read out of that
// package rather than guessed — see the note on the checkout host.
const SANDBOX_BASE = "https://sandbox.api.getsafepay.com";
const PROD_BASE    = "https://api.getsafepay.com";

// Hosted checkout is NOT served from the API host in production, and the path
// is /embedded/, not /checkout/pay. Three earlier values were all dead ends;
// don't "restore" any of them from an old gist or doc page:
//   safepay.pk/checkout  — that domain never served this flow.
//   .../components       — retired; 301s to getsafepay.pk, dropping the buyer
//                          on the marketing site mid-purchase.
//   .../checkout/pay     — answered with a checkout-looking shell, but it is
//                          not the v3 entry point and never carries the tbt.
// hostUrls in @sfpy/node-core/esm/Checkout.js is the authority here.
const SANDBOX_CHECKOUT = "https://sandbox.api.getsafepay.com/embedded/";
const PROD_CHECKOUT    = "https://getsafepay.com/embedded/";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function isProduction() {
  return env("SAFEPAY_ENVIRONMENT") === "production";
}
function getBase() {
  return isProduction() ? PROD_BASE : SANDBOX_BASE;
}
function getCheckoutBase() {
  return isProduction() ? PROD_CHECKOUT : SANDBOX_CHECKOUT;
}

/** The literal Safepay expects in the `environment` query param and v3 body. */
function getEnvName(): "production" | "sandbox" {
  return isProduction() ? "production" : "sandbox";
}

/**
 * Server-to-server auth. Safepay issues two credentials and they are not
 * interchangeable:
 *   SAFEPAY_API_KEY    — the public merchant key. Travels in the v3 request
 *                        *body* as `merchant_api_key`.
 *   SAFEPAY_SECRET_KEY — the secret. Travels in the `x-sfpy-merchant-secret`
 *                        *header*. Never in a body, never in a URL.
 * Sending the key as `Authorization: Bearer` (what the old v1 code did before
 * it gave up and moved the key into the body) makes Safepay answer 417 with
 * "Expected required but got for field: Client / Environment" — the credential
 * is never read at all.
 */
function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-sfpy-merchant-secret": env("SAFEPAY_SECRET_KEY"),
  };
}

export function hasSafepayConfig() {
  return Boolean(
    env("SAFEPAY_API_KEY") && env("SAFEPAY_SECRET_KEY") && env("SAFEPAY_WEBHOOK_SECRET"),
  );
}

/**
 * Whether Safepay may take a live customer's payment.
 *
 * Credentials alone are not permission. The merchant account goes through
 * Safepay's KYC review before live keys are issued, and having sandbox keys
 * present once routed every Pakistani customer to a checkout that either failed
 * outright or succeeded against sandbox and took no real money while looking
 * like it had. Until approval lands, Pakistan checks out through Lemon
 * Squeezy's _PK variants, which carry the same PKR-equivalent prices.
 *
 * Deliberately opt-in rather than opt-out: an unapproved gateway must not
 * become reachable just because someone left a key in the environment. Set
 * SAFEPAY_CHECKOUT_ENABLED=true once the account is live to switch back.
 *
 * This gates checkout only. The webhook keeps verifying and processing
 * whatever Safepay sends, so a sandbox test still settles correctly.
 */
export function isSafepayCheckoutEnabled() {
  return hasSafepayConfig() && env("SAFEPAY_CHECKOUT_ENABLED").toLowerCase() === "true";
}

// ─── Money ────────────────────────────────────────────────────────────────────
// Safepay represents every amount in the currency's minor unit: PKR in paisa,
// USD in cents. Sending rupees where paisa were expected undercharges by 100x
// (a Rs 13,720 plan collects Rs 137.20); reading a paisa figure back as rupees
// overstates revenue by the same factor. Both directions go through here.

export function pkrToPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paisaToPkr(paisa: number): number {
  return Math.round(paisa) / 100;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafepayCheckoutInput = {
  orderId: string;          // Our unique reference (e.g. company_id + timestamp)
  amountPkr: number;        // Amount in PKR (rupees — converted to paisa here)
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

// ─── Error reporting ──────────────────────────────────────────────────────────

/**
 * Safepay reports failures under `status`, not at the top level. Reading only
 * the top level turned every error into the same useless "Failed to create
 * Safepay checkout session." with the real reason discarded.
 */
function safepayError(step: string, response: Response, json: any): Error {
  const detail =
    (Array.isArray(json?.status?.errors) && json.status.errors.length
      ? json.status.errors.join("; ")
      : null) ||
    json?.status?.message ||
    json?.message ||
    json?.error ||
    json?.errors?.[0]?.message ||
    "no detail returned";
  return new Error(`Safepay ${step} failed (HTTP ${response.status}): ${detail}`);
}

// ─── Create checkout session ──────────────────────────────────────────────────

/**
 * Express Checkout, as documented at
 * https://safepay-docs.netlify.app/build-your-integration/express-checkout
 *
 * Three calls, in order, and all three are load-bearing:
 *   1. POST /order/payments/v3/       → tracker token
 *   2. POST /client/passport/v1/token → time-based token (tbt)
 *   3. build the /embedded/ URL carrying both
 *
 * The tbt is what the old v1 integration was missing. Without it the checkout
 * page loads and then cannot authenticate its own client-side calls, which is
 * why hand-built URLs kept half-working.
 */
export async function createSafepayCheckout(input: SafepayCheckoutInput): Promise<SafepayCheckoutResult> {
  const apiKey = env("SAFEPAY_API_KEY");
  if (!apiKey) throw new Error("Safepay is not configured.");
  if (!env("SAFEPAY_SECRET_KEY")) throw new Error("SAFEPAY_SECRET_KEY is not set.");

  // ── 1. Payment session ──
  // Unlike v1's /order/v1/init, v3 stores `metadata` and hands it back on the
  // webhook. That is the whole reason the webhook no longer has to reverse a
  // companyId out of the order-ID string.
  const sessionBody = {
    merchant_api_key: apiKey,
    intent:           "CYBERSOURCE",   // card payments (Visa / Mastercard)
    mode:             "payment",
    entry_mode:       "raw",
    currency:         "PKR",
    amount:           pkrToPaisa(input.amountPkr),
    metadata: {
      order_id:      input.orderId,
      company_id:    input.companyId,
      plan_code:     input.planCode,
      billing_cycle: input.billingCycle,
      ...(input.userId ? { user_id: input.userId } : {}),
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      ...(input.customerName ? { customer_name: input.customerName } : {}),
    },
  };

  const sessionRes = await fetch(`${getBase()}/order/payments/v3/`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(sessionBody),
  });
  const sessionJson = await sessionRes.json().catch(() => ({}));
  if (!sessionRes.ok) throw safepayError("payment session setup", sessionRes, sessionJson);

  const tracker = sessionJson?.data?.tracker?.token || sessionJson?.data?.token;
  if (!tracker) {
    throw new Error("Safepay payment session returned no tracker token.");
  }

  // ── 2. Passport (time-based) token ──
  const passportRes = await fetch(`${getBase()}/client/passport/v1/token`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({}),
  });
  const passportJson = await passportRes.json().catch(() => ({}));
  if (!passportRes.ok) throw safepayError("passport token", passportRes, passportJson);

  const tbt = typeof passportJson?.data === "string" ? passportJson.data : passportJson?.data?.token;
  if (!tbt) {
    throw new Error("Safepay passport token was missing in response.");
  }

  // ── 3. Hosted checkout URL ──
  // `source` is a closed set — "hosted" | "mobile" | "popup" | "woocommerce" |
  // "shopify". The old code sent "finovaos", which is not one of them.
  const params = new URLSearchParams({
    environment:  getEnvName(),
    tracker:      String(tracker),
    tbt:          String(tbt),
    source:       "hosted",
    order_id:     input.orderId,
    redirect_url: input.successUrl,
    cancel_url:   input.cancelUrl,
    ...(input.userId ? { user_id: input.userId } : {}),
  });
  const checkoutUrl = `${getCheckoutBase()}?${params.toString()}`;

  return { checkoutUrl, tracker: String(tracker), orderId: input.orderId };
}

// ─── Payment status ───────────────────────────────────────────────────────────

export type SafepayPaymentStatus = {
  state: string;            // e.g. TRACKER_STARTED, TRACKER_ENDED
  paid: boolean;
  amountPkr: number | null;
  raw: any;
};

/**
 * Ask Safepay directly what happened to a tracker.
 *
 * The webhook is still the system of record, but it is delivered best-effort —
 * a retry window that outlasts the buyer's patience leaves a paying customer
 * sitting on an unactivated plan. The success redirect can call this to settle
 * immediately and let the webhook arrive later as a no-op (the alreadyProcessed
 * guard in the webhook route makes the second one idempotent).
 */
export async function fetchSafepayPaymentStatus(tracker: string): Promise<SafepayPaymentStatus | null> {
  if (!tracker || !env("SAFEPAY_SECRET_KEY")) return null;

  try {
    const res = await fetch(
      `${getBase()}/reporter/api/v1/payments/${encodeURIComponent(tracker)}`,
      { method: "GET", headers: authHeaders() },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return null;

    const t = json?.data?.tracker || json?.data || {};
    const state = String(t?.state || "");
    const rawAmount = typeof t?.amount === "number" ? t.amount : null;

    return {
      state,
      paid: state.toUpperCase() === "TRACKER_ENDED",
      amountPkr: rawAmount == null ? null : paisaToPkr(rawAmount),
      raw: json,
    };
  } catch {
    return null;
  }
}

// ─── Webhook signature verification ──────────────────────────────────────────
// Safepay signs the raw request body with HMAC-SHA512 and sends the hex digest
// in the `X-SFPY-SIGNATURE` header. This was SHA-256 until it was checked
// against the docs, which meant the digest lengths never even matched and every
// genuine webhook was rejected with "Invalid Safepay signature" — no Safepay
// payment could ever activate a plan.

/**
 * Safepay's docs warn that a rotated HMAC key takes time to propagate and that
 * you must keep accepting the previous one meanwhile. Set
 * SAFEPAY_WEBHOOK_SECRET_PREVIOUS for the duration of a rotation, then remove it.
 */
function webhookSecrets(): string[] {
  return [env("SAFEPAY_WEBHOOK_SECRET"), env("SAFEPAY_WEBHOOK_SECRET_PREVIOUS")].filter(Boolean);
}

export function verifySafepaySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secrets = webhookSecrets();
  if (!secrets.length || !signatureHeader || !rawBody) return false;

  // Tolerate a `sha512=` prefix; Safepay sends a bare hex digest today, but
  // prefixed digests are common enough that stripping one costs nothing.
  const provided = Buffer.from(signatureHeader.trim().replace(/^sha512=/i, ""), "hex");
  if (provided.length === 0) return false;

  for (const secret of secrets) {
    try {
      const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest();
      if (provided.length !== expected.length) continue;
      if (timingSafeEqual(expected, provided)) return true;
    } catch {
      // try the next secret
    }
  }
  return false;
}

// ─── Status mapping ───────────────────────────────────────────────────────────
// Event names come from
// https://safepay-docs.netlify.app/developers/webhooks/webhook-types and are
// dot-separated. The v1 colon-separated spellings (payment:created,
// subscription:cancelled) are kept as aliases only because nothing has yet
// confirmed which set a live account emits; drop them once sandbox has.

export function mapSafepayEventToStatus(event: string): "ACTIVE" | "PAST_DUE" | "CANCELLED" | "REFUNDED" | "INACTIVE" {
  switch (String(event || "").toLowerCase()) {
    // A completed charge — initial purchase or a renewal.
    case "payment.succeeded":
    case "subscription.created":
    case "subscription.resumed":
    case "subscription.payment.succeeded":
    // v1 aliases
    case "payment:created":
    case "payment:success":
    case "payment.success":
    case "payment:succeeded":
    case "subscription:activated":
      return "ACTIVE";

    // A charge that did not go through. Renewal failures land here too, which
    // is what keeps a lapsing customer out of ACTIVE — the old mapper had no
    // case for subscription.payment.failed at all, so renewals silently did
    // nothing and a failing card never showed as past due.
    case "payment.failed":
    case "subscription.payment.failed":
    case "subscription.paused":
    case "payment:failed":
    case "subscription:past_due":
      return "PAST_DUE";

    case "subscription.canceled":
    case "subscription.cancelled":
    case "subscription.ended":
    case "subscription:cancelled":
    case "subscription:canceled":
      return "CANCELLED";

    case "payment.refunded":
      return "REFUNDED";

    // authorization.* and void.* describe an auth hold, not settled money, and
    // deliberately fall through — acting on them would activate a plan against
    // a charge that has not captured.
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
