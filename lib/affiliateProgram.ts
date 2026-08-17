/**
 * The affiliate program's on/off switch.
 *
 * The machinery behind it is finished and wired end to end — `?ref=` capture in
 * proxy.ts, first-touch claim at signup, and commission credited from the
 * billing webhook (see lib/affiliateTracking.ts). What is deliberately not
 * finished is the *business* side: at 4 paying customers there is no known
 * churn or LTV, so a 20–35% recurring payout cannot yet be priced honestly, and
 * there is nothing worth an affiliate's time to earn.
 *
 * Until that changes the public page shows a Coming Soon notice rather than a
 * promise nobody can be held to. Flip AFFILIATE_PROGRAM_LIVE to true to launch;
 * nothing else needs to change.
 */
export const AFFILIATE_PROGRAM_LIVE = true;

/**
 * Whether applications are accepted while the program is not yet live.
 *
 * Kept separate on purpose. Collecting a list of interested partners before
 * launch is reasonable, but only if the page is honest that nothing pays out
 * yet — so this stays off until that copy is written and agreed.
 */
export const AFFILIATE_APPLICATIONS_OPEN = false;
