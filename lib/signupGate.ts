/**
 * Signup gate.
 *
 * FinovaOS has launched, so the doors are OPEN by default. Signup pages,
 * checkout and every "Get Started" CTA behave normally; the "Launching Soon"
 * buttons and the waitlist CTA are gone because this flag now reads true
 * without any environment variable being set.
 *
 * One switch still controls all of it: `NEXT_PUBLIC_SIGNUPS_OPEN`. The default
 * flipped on launch — pre-launch a missing variable meant CLOSED, now it means
 * OPEN. To shut the doors again (an incident, a pause on new signups) set the
 * variable to exactly "false" in the production environment; nothing else has
 * to change.
 *
 * The variable is NEXT_PUBLIC_ deliberately: the same value has to be readable
 * by proxy.ts, by API routes, and by client components that render CTAs. A
 * second server-only flag would be one more thing to keep in sync, and this is
 * not a secret — anyone can see whether signups are open by clicking one.
 */

export const SIGNUPS_OPEN = process.env.NEXT_PUBLIC_SIGNUPS_OPEN !== "false";

/**
 * The launch switch, moved to something a button can actually press.
 *
 * Kept for the admin "Launch Now" button, which writes this row. Now that the
 * default above is OPEN the row is mostly historical: the only way to reach the
 * database lookup below is to have explicitly set NEXT_PUBLIC_SIGNUPS_OPEN to
 * "false", in which case a saved launch row can re-open the doors at runtime
 * without a redeploy.
 */
export const SITE_LAUNCHED_KEY = "siteLaunched";

// Read on every proxied request, so it is cached briefly rather than hitting the
// database each time. A few seconds of staleness on launch day is invisible.
const CACHE_TTL_MS = 15_000;
let cached: { open: boolean; at: number } | null = null;

export async function getSignupsOpen(): Promise<boolean> {
  if (SIGNUPS_OPEN) return true;

  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.open;

  let open = false;
  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.activityLog.findFirst({
      where: {
        action: "ADMIN_SETTING",
        details: { startsWith: `{"key":"${SITE_LAUNCHED_KEY}"` },
      },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    open = JSON.parse(row?.details || "{}")?.value === true;
  } catch {
    // Keep whatever we last knew rather than slamming the doors mid-traffic on
    // a transient database error; closed on a cold start.
    open = cached?.open ?? false;
  }

  cached = { open, at: now };
  return open;
}

export const WAITLIST_PATH = "/waitlist";

/**
 * Page routes that exist only to create an account or take payment. While the
 * gate is closed these redirect to the waitlist.
 * `/onboarding/accept-invite` is deliberately absent — that is an existing
 * company adding a teammate, not a new customer.
 */
export const SIGNUP_PAGE_ROUTES = [
  "/onboarding/signup",
  "/onboarding/choose-plan",
  "/onboarding/payment",
  "/get-started",
];

/** APIs that create an account or start a subscription. Answered with 403. */
export const SIGNUP_API_ROUTES = [
  "/api/auth/signup",
  "/api/onboarding/signup",
  "/api/billing/checkout",
  "/api/public/custom-plan-request",
];

export function isSignupPageRoute(pathname: string): boolean {
  return SIGNUP_PAGE_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isSignupApiRoute(pathname: string): boolean {
  return SIGNUP_API_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Where a "Get Started" style CTA should point right now. Keeps every button on
 * the marketing site honest without each one repeating the check.
 */
export function signupHref(openHref: string): string {
  return SIGNUPS_OPEN ? openHref : WAITLIST_PATH;
}

/** Same decision as `signupHref`, for callers that know the runtime flag. */
export function signupHrefFor(open: boolean, openHref: string): string {
  return open ? openHref : WAITLIST_PATH;
}
