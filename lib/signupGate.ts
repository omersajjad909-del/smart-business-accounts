/**
 * Signup gate.
 *
 * FinovaOS is introduced to the market but not selling yet, so every door that
 * would create a new account is closed and visitors are sent to the waitlist
 * instead — their interest is captured rather than lost.
 *
 * One switch controls all of it: `NEXT_PUBLIC_SIGNUPS_OPEN`. On launch day set
 * it to "true" in the production environment and everything below opens at
 * once — no code change, no redeploy of individual components.
 *
 * The variable is NEXT_PUBLIC_ deliberately: the same value has to be readable
 * by proxy.ts, by API routes, and by client components that render CTAs. A
 * second server-only flag would be one more thing to keep in sync, and this is
 * not a secret — anyone can see whether signups are open by clicking one.
 *
 * Default is CLOSED. A deploy that forgets the variable should keep the doors
 * shut rather than quietly start taking money we cannot yet service.
 */

export const SIGNUPS_OPEN = process.env.NEXT_PUBLIC_SIGNUPS_OPEN === "true";

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
