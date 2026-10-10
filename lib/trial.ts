/**
 * The free trial: 14 days, no card, full Professional features, then a short
 * read-only grace before access closes.
 *
 * Everything that needs to know the window — signup, the subscription guards,
 * the dashboard banner, the lifecycle cron — reads it from here, so the length
 * of the trial is changed in one place.
 *
 * A company with no trialEndsAt never had a trial (every account that existed
 * before it launched). trialState() answers "none" for it and callers leave it
 * alone.
 */

export const TRIAL_DAYS = 14;
export const TRIAL_GRACE_DAYS = 3;
export const TRIAL_PLAN = "PRO";

const DAY_MS = 24 * 60 * 60 * 1000;

export type TrialState = "none" | "active" | "grace" | "expired";

/** Fields to spread into a Company create for a new trial signup. */
export function trialCompanyFields(source: string, phone?: string | null, now: Date = new Date()) {
  return {
    plan: TRIAL_PLAN,
    subscriptionStatus: "TRIALING",
    trialStartedAt: now,
    trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS),
    trialSource: source,
    trialPhone: phone || null,
  };
}

/**
 * Where a company stands in its trial. Only a TRIALING company with an end date
 * has one — an ACTIVE company that once trialled has paid and is out of it.
 */
export function trialState(
  status: string | null | undefined,
  trialEndsAt: Date | null | undefined,
  now: number = Date.now(),
): TrialState {
  if (!trialEndsAt || String(status || "").toUpperCase() !== "TRIALING") return "none";
  const overdue = now - trialEndsAt.getTime();
  if (overdue <= 0) return "active";
  return overdue <= TRIAL_GRACE_DAYS * DAY_MS ? "grace" : "expired";
}

/** Whole days left, rounded up, never negative. */
export function trialDaysLeft(trialEndsAt: Date | null | undefined, now: number = Date.now()): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / DAY_MS));
}

export function trialEndedMessage(grace: boolean): string {
  return grace
    ? "Your free trial has ended. Your data is safe and read-only for a few days — choose a plan to keep working."
    : "Your free trial has ended. Please choose a plan to continue.";
}
