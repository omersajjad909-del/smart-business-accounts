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

/**
 * Which companies Safepay is allowed to take to checkout.
 *
 * Empty (the default) means everyone in Pakistan, which is the shape this is
 * meant to end up in. It exists for the window where SAFEPAY_CHECKOUT_ENABLED
 * is true on production while SAFEPAY_ENVIRONMENT is still "sandbox" — testing
 * the live deployment against test money.
 *
 * That window is not harmless. The webhook handler has no environment guard: a
 * sandbox `payment.succeeded` is signed with the same secret the deployment
 * holds, so it verifies and activates a plan on the production database. A real
 * customer who upgrades during that window gets their plan switched on for
 * free, and nothing about it looks like an error afterwards.
 *
 * Setting SAFEPAY_TEST_COMPANY_IDS to a comma-separated list closes the window
 * to everyone but the tester. Everybody else keeps checking out through Lemon
 * Squeezy exactly as before. Clear the variable once the account is live and
 * SAFEPAY_ENVIRONMENT says production.
 */
export function isSafepayAllowedForCompany(companyId: string): boolean {
  const allowList = env("SAFEPAY_TEST_COMPANY_IDS")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (!allowList.length) return true;
  return allowList.includes(String(companyId || "").trim());
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
  // Safepay refuses a customer record without one, so prefill stays off until
  // there is a real number to send.
  customerPhone?: string | null;
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

// ─── Customer (Express Checkout, step 2) ─────────────────────────────────────

/**
 * Register the buyer with Safepay and hand back their customer token.
 *
 * Step 2 of
 * https://safepay-docs.netlify.app/build-your-integration/express-checkout —
 * optional in the sense that a checkout works without it, but it is what makes
 * the hosted page arrive with the name and email already filled in, and it is
 * the only legitimate source of the `user_id` the checkout URL takes. Before
 * this existed we sent our own database user id there, which is not a Safepay
 * token and means nothing to their side.
 *
 * `is_guest` is true because these buyers are not signing up for a Safepay
 * account — they are paying once, through us.
 *
 * The path is /user/customers/v1/, not the /user/customers the docs print.
 * That one answers 404 — read out of @sfpy/node-core's Customers/Object.js and
 * confirmed against sandbox on 2026-09-22.
 *
 * `phone_number` is mandatory: omitting it is rejected with "the phone number
 * supplied is not a number", not treated as absent. Neither Company nor User
 * carries a phone today, so in practice this step is skipped and the buyer
 * types their own details on Safepay's page — which is the documented fallback,
 * since the whole customer step is optional. Start passing `phone` here the day
 * we collect one and prefill starts working on its own.
 *
 * Deliberately non-fatal: a failure here costs a pre-filled form, not the sale,
 * so it returns null and the checkout carries on without a customer token.
 */
export async function createSafepayCustomer(input: {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  country?: string;
}): Promise<string | null> {
  if (!input.email) return null;

  // Safepay wants digits, not a formatted string. Anything that does not survive
  // that test would only earn a 400, so skip the call rather than log noise on
  // every checkout.
  const phone = String(input.phone || "").replace(/[^\d+]/g, "");
  if (!phone || phone.replace(/\D/g, "").length < 10) return null;

  const parts = String(input.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || String(input.email).split("@")[0];
  const lastName  = parts.length > 1 ? parts.slice(1).join(" ") : "-";

  try {
    const res = await fetch(`${getBase()}/user/customers/v1/`, {
      method:  "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        first_name: firstName,
        last_name:  lastName,
        email:        input.email,
        phone_number: phone,
        country:      input.country || "PK",
        is_guest:   true,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[safepay] customer create failed — continuing without prefill:",
        json?.status?.message || json?.message || res.status);
      return null;
    }
    const token = json?.data?.token || json?.data?.customer?.token;
    return token ? String(token) : null;
  } catch (err) {
    console.warn("[safepay] customer create errored — continuing without prefill:", err);
    return null;
  }
}

// ─── Create checkout session ──────────────────────────────────────────────────

/**
 * Express Checkout, as documented at
 * https://safepay-docs.netlify.app/build-your-integration/express-checkout
 *
 * Four calls, in order:
 *   0. POST /user/customers           → customer token (optional; prefill only)
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

  // ── 0. Customer ──
  // Best-effort. Null here just means the buyer types their own details.
  const customerToken = await createSafepayCustomer({
    email: input.customerEmail,
    name:  input.customerName,
    phone: input.customerPhone,
  });

  // ── 1. Payment session ──
  //
  // `metadata` is NOT a free-form bag, whatever the docs imply. Sandbox rejects
  // any key outside a fixed allow-list with HTTP 500 "unsupported meta key
  // <name>", and the whole request fails — so one stray key loses the sale.
  // Probed against sandbox on 2026-09-18; only these two are accepted:
  //
  //     order_id   source
  //
  // company_id, plan_code, billing_cycle, user_id, customer_email,
  // customer_name, udf1-5, reference, invoice_id, description, note, cart_id,
  // external_id and a dozen similar guesses were all refused. Do not add one
  // back without re-probing.
  //
  // That is why `fnv-<companyId>-<ts>` is still load-bearing: order_id is the
  // only channel we have, so the company has to be encoded *into* it, and the
  // plan and cycle have to be recovered from our own BILLING_CHECKOUT_CREATED
  // log by tracker. See handleSafepayWebhook.
  const sessionBody = {
    merchant_api_key: apiKey,
    intent:           "CYBERSOURCE",   // card payments (Visa / Mastercard)
    mode:             "payment",
    entry_mode:       "raw",
    currency:         "PKR",
    amount:           pkrToPaisa(input.amountPkr),
    // Ties the session to the customer record so the hosted page knows who is
    // paying. Omitted entirely when there is no token — sending `user: null`
    // is not the same as not sending it.
    ...(customerToken ? { user: customerToken } : {}),
    metadata: {
      order_id: input.orderId,
      source:   "finovaos",
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
    // Safepay's customer token from step 0 — NOT input.userId, which is our own
    // database id and is meaningless to Safepay.
    ...(customerToken ? { user_id: customerToken } : {}),
  });
  const checkoutUrl = `${getCheckoutBase()}?${params.toString()}`;

  return { checkoutUrl, tracker: String(tracker), orderId: input.orderId };
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
//
// Monthly plans are billed as Safepay subscriptions so the card is charged
// every month without the customer coming back. Safepay has no intro-price or
// discount-for-N-cycles feature and no API to move a subscription between
// plans (the only calls are cancel / pause / resume), so the launch offer is
// two plans per tier in the Safepay dashboard:
//
//   SAFEPAY_<STAGE>_PLAN_<TIER>_INTRO   — half price, "Number of Billing Cycles" = 3.
//                                         Safepay ends it itself after the third charge.
//   SAFEPAY_<STAGE>_PLAN_<TIER>_MONTHLY — full price, cycles = 0 (runs until cancelled).
//
// A new customer subscribes to the intro plan; when it ends the webhook keeps
// the account running to the end of the paid period and asks them to continue
// on the full plan, which reuses the card already in their Safepay wallet.
//
// Checkout URL and cancel endpoint are from Safepay's own safepay-node SDK
// (src/utils/constants.ts, builder.ts, resources/subscription.ts).

const SANDBOX_SUBSCRIBE = "https://sandbox.api.getsafepay.com/checkout/subscribe";
const PROD_SUBSCRIBE    = "https://getsafepay.com/checkout/subscribe";

type SafepayTier = "STARTER" | "PRO" | "ENTERPRISE";

function tierOf(planCode: string): SafepayTier | null {
  const p = String(planCode || "").toUpperCase();
  if (p === "STARTER") return "STARTER";
  if (p === "PRO" || p === "PROFESSIONAL") return "PRO";
  if (p === "ENTERPRISE") return "ENTERPRISE";
  return null;
}

/** How many discounted months the launch offer gives in total. */
export const SAFEPAY_INTRO_MONTHS = 3;

/**
 * Plan ids live in SAFEPAY_<PRODUCTION|SANDBOX>_PLAN_<TIER>_<suffix>, kept per
 * environment because a sandbox plan id means nothing to production.
 *
 *   _MONTHLY  full price, billing cycles 0
 *   _INTRO    half price, billing cycles 3 — a brand-new customer
 *   _INTRO_2  half price, billing cycles 2 — switched over after 1 discounted month
 *   _INTRO_1  half price, billing cycles 1 — switched over after 2 discounted months
 *
 * The shorter intros exist for customers moving from Lemon Squeezy part-way
 * through the offer, so they get exactly the discounted months they have left.
 */
function planEnv(tier: SafepayTier, introCycles: number): string {
  const stage = isProduction() ? "PRODUCTION" : "SANDBOX";
  const suffix =
    introCycles <= 0                    ? "MONTHLY"
    : introCycles >= SAFEPAY_INTRO_MONTHS ? "INTRO"
    : `INTRO_${introCycles}`;
  return env(`SAFEPAY_${stage}_PLAN_${tier}_${suffix}`);
}

/**
 * The Safepay plan id for a tier, or "" when that plan is not configured.
 * `introCycles` is the number of half-price months to give; 0 = full price.
 */
export function getSafepayPlanId(planCode: string, introCycles: number): string {
  const tier = tierOf(planCode);
  return tier ? planEnv(tier, introCycles) : "";
}

/** Reverse of getSafepayPlanId — which tier a webhook's plan id belongs to. */
export function resolveSafepayPlanId(planId: string): { planCode: SafepayTier; intro: boolean } | null {
  const id = String(planId || "").trim();
  if (!id) return null;
  for (const tier of ["STARTER", "PRO", "ENTERPRISE"] as const) {
    if (planEnv(tier, 0) === id) return { planCode: tier, intro: false };
    for (let n = 1; n <= SAFEPAY_INTRO_MONTHS; n++) {
      if (planEnv(tier, n) === id) return { planCode: tier, intro: true };
    }
  }
  return null;
}

/**
 * Hosted subscription checkout. `reference` is our `fnv-<companyId>-<ts>` order
 * ref, so the webhook can find the company the same way it does for payments.
 */
export async function createSafepaySubscriptionCheckout(input: {
  planId: string;
  reference: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string }> {
  if (!env("SAFEPAY_SECRET_KEY")) throw new Error("SAFEPAY_SECRET_KEY is not set.");

  const passportRes = await fetch(`${getBase()}/client/passport/v1/token`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({}),
  });
  const passportJson = await passportRes.json().catch(() => ({}));
  if (!passportRes.ok) throw safepayError("passport token", passportRes, passportJson);

  const authToken = typeof passportJson?.data === "string" ? passportJson.data : passportJson?.data?.token;
  if (!authToken) throw new Error("Safepay passport token was missing in response.");

  const params = new URLSearchParams({
    plan_id:      input.planId,
    auth_token:   String(authToken),
    env:          getEnvName(),
    cancel_url:   input.cancelUrl,
    redirect_url: input.successUrl,
    reference:    input.reference,
  });
  const base = isProduction() ? PROD_SUBSCRIBE : SANDBOX_SUBSCRIBE;
  return { checkoutUrl: `${base}?${params.toString()}` };
}

export async function cancelSafepaySubscription(subscriptionId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${getBase()}/client/subscriptions/v1/${encodeURIComponent(subscriptionId)}/cancel`,
      { method: "POST", headers: authHeaders(), body: JSON.stringify({}) },
    );
    if (res.ok) return { ok: true };
    const json = await res.json().catch(() => ({}));
    return { ok: false, error: safepayError("subscription cancel", res, json).message };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err) };
  }
}

// ─── Payment status ───────────────────────────────────────────────────────────

/**
 * Flatten Safepay's metadata back into plain `{ key: value }`.
 *
 * It does not hand back what you sent. `metadata: { order_id: "fnv-x-1" }` comes
 * out of the reporter (and, by the same shape, the webhook) as:
 *
 *   metadata: { order_id: { token, tracker, key: "order_id", value: "fnv-x-1", … } }
 *
 * Read naively, `String(meta.order_id)` is the string "[object Object]", which
 * then fails the `fnv-` prefix test and loses the company the payment belongs
 * to. Both shapes are accepted here so this keeps working if Safepay ever
 * flattens it themselves.
 */
export function normalizeSafepayMetadata(meta: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (!meta || typeof meta !== "object") return out;

  for (const [key, entry] of Object.entries<any>(meta)) {
    if (entry == null) continue;
    if (typeof entry === "object") {
      if (entry.value != null) out[String(entry.key || key)] = String(entry.value);
    } else {
      out[key] = String(entry);
    }
  }
  return out;
}

export type SafepayPaymentStatus = {
  state: string;            // e.g. TRACKER_STARTED, TRACKER_ENDED
  paid: boolean;
  amountPkr: number | null;
  metadata: Record<string, string>;
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

    // The charge lives under purchase_totals, not on the tracker itself — there
    // is no top-level `amount` on this response at all, so reading one returned
    // null for every payment.
    const rawAmount =
      typeof t?.purchase_totals?.quote_amount?.amount === "number" ? t.purchase_totals.quote_amount.amount
      : typeof t?.purchase_totals?.base_amount?.amount === "number" ? t.purchase_totals.base_amount.amount
      : typeof t?.amount === "number"                               ? t.amount
      : null;

    return {
      state,
      paid: state.toUpperCase() === "TRACKER_ENDED",
      amountPkr: rawAmount == null ? null : paisaToPkr(rawAmount),
      metadata: normalizeSafepayMetadata(t?.metadata),
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
