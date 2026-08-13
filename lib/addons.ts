// FILE: lib/addons.ts
//
// The Business Automation add-on is built but not sellable yet: its Lemon
// Squeezy variants are test-mode objects that return 404 on the live key, and
// the catalogue price ($79/mo, $758/yr) disagrees with the app's own
// DEFAULT_PRICING ($69/mo billed yearly = $828/yr). A buyer reaching checkout
// today gets an error, not a subscription.
//
// So it is hidden behind one switch rather than commented out in five files —
// the marketing section, the choose-plan upsell, the two dashboard CTAs and the
// payment page each had their own entry point, and missing one leaves a live
// buy button pointing at a broken checkout.
//
// To launch it later: create live variants, fix the price disagreement, set
// NEXT_PUBLIC_AUTOMATION_ADDON=true, redeploy. Nothing else to undo.
//
// Default is OFF. A deploy that forgets the variable keeps it hidden, which is
// the safe direction for something that cannot currently be paid for.

export const AUTOMATION_ADDON_ENABLED =
  process.env.NEXT_PUBLIC_AUTOMATION_ADDON === "true";

/** Plan codes that are add-ons rather than plans, in the checkout's spelling. */
export const AUTOMATION_PLAN_CODES = ["ADDON-AUTOMATION", "addon-automation"];

export function isAutomationAddon(planCode: string | null | undefined): boolean {
  return String(planCode || "").toUpperCase() === "ADDON-AUTOMATION";
}
