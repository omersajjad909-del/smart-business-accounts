/**
 * "Notify me when live" lists for marketing pages that are currently showing
 * a Coming Soon state — careers and the affiliate program.
 *
 * Backed by the same BusinessWaitlist table the business-type notify-me flow
 * uses (see app/api/public/notify-me/route.ts), keyed by a different set of
 * businessType values so the two features never collide. Keep this list
 * small and specific — it is not the place for general newsletter signups
 * (that's NewsletterSubscriber).
 */
export const COMING_SOON_LISTS: Record<string, {
  label: string;
  emoji: string;
  launchPath: string;
  notifySubject: string;
  notifyIntro: string;
}> = {
  careers: {
    label: "Careers",
    emoji: "💼",
    launchPath: "/careers",
    notifySubject: "🎉 We're hiring at FinovaOS!",
    notifyIntro: "You asked us to let you know when we start hiring — we're now posting open roles.",
  },
  affiliate: {
    label: "Affiliate Program",
    emoji: "💰",
    launchPath: "/affiliate",
    notifySubject: "🎉 The FinovaOS Affiliate Program is live!",
    notifyIntro: "You asked us to let you know when the affiliate program opened — it's live, with commission tiers and monthly payouts.",
  },
};

export type ComingSoonListKey = keyof typeof COMING_SOON_LISTS;
