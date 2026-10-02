/**
 * lib/analytics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Conversion tracking for the marketing site.
 *
 * GA4 is loaded in app/layout.tsx with Consent Mode defaulting to denied, and
 * AnalyticsLoader flips analytics_storage once the visitor accepts cookies.
 * Consent Mode is what governs whether an event may use cookies, so events are
 * always handed to gtag — a denied visitor still produces a cookieless ping,
 * a granted one produces a full attributed hit.
 *
 * Until this file existed the site sent GA nothing but automatic page_views,
 * which is why every "Key events" column in the GA4 reports read 0.
 *
 * After deploying, each name below must be marked as a Key Event in
 * GA4 → Admin → Events, otherwise they are recorded but not counted as
 * conversions.
 */

/** Every conversion the marketing site reports. Keep this list and GA4 in sync. */
export type ConversionEvent =
  | "waitlist_submit"
  | "demo_booking"
  | "signup_start"
  | "signup_complete"
  | "pricing_plan_click";

type EventParams = Record<string, string | number | boolean | undefined>;

/**
 * Send one event to GA4. Safe to call anywhere: no-ops during SSR, when the
 * gtag snippet is blocked, or when an ad blocker removed it.
 */
export function trackEvent(event: ConversionEvent, params: EventParams = {}) {
  if (typeof window === "undefined") return;

  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;

  // Strip undefined so GA does not receive empty parameters.
  const clean: EventParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") clean[k] = v;
  }

  try {
    gtag("event", event, clean);
  } catch {
    // Analytics must never break a signup or a booking.
  }
}

/**
 * Google Ads conversion action "Signup Complete" (goal: Sign-up).
 *
 * GA4 events do not reach Google Ads on their own, which is why Ads reported 0
 * conversions while GA4 saw every signup_complete. The Ads tag (AW-18478573284)
 * is already configured in app/layout.tsx; this only adds the event snippet.
 * Label from Google Ads → Goals → Conversions → Signup Complete → Tag setup.
 */
const ADS_SIGNUP_SEND_TO = "AW-18478573284/l4uXCMPt7I0dEOTNoutE";

/** Report a completed signup to Google Ads. Same no-op guarantees as trackEvent. */
export function trackAdsSignupConversion() {
  if (typeof window === "undefined") return;

  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;

  try {
    gtag("event", "conversion", { send_to: ADS_SIGNUP_SEND_TO, value: 1.0, currency: "PKR" });
  } catch {
    // Analytics must never break a signup.
  }
}

/**
 * Fire an event at most once per page load.
 *
 * signup_start would otherwise re-fire on every React re-render of the signup
 * page, inflating the count the same way duplicate page_views inflate views.
 */
const fired = new Set<string>();

export function trackEventOnce(event: ConversionEvent, params: EventParams = {}) {
  const key = `${event}:${params.plan ?? ""}`;
  if (fired.has(key)) return;
  fired.add(key);
  trackEvent(event, params);
}
