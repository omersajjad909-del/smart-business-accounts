import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiError, apiOk } from "@/lib/apiError";
import { fetchSafepayPaymentStatus, hasSafepayConfig } from "@/lib/safepay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/billing/safepay/status?tracker=<token>
 *
 * Asks Safepay directly what happened to a checkout, rather than inferring it
 * from the fact that the browser came back.
 *
 * The success redirect (`/dashboard/billing?upgrade=success`) fires whenever the
 * buyer returns from Safepay — including when they abandoned at the card form
 * and hit back. Until now the only other signal was our own subscription row,
 * which flips to ACTIVE only once the webhook lands. That left two situations
 * indistinguishable on screen: "paid, webhook is seconds behind" and "never paid
 * at all". Both showed the same amber "activating your plan…" banner, one of
 * which resolves itself and one of which never will.
 *
 * `settled` is Safepay's answer, `planActive` is ours. The pair is what makes
 * the two cases tell apart:
 *   settled && planActive    → done
 *   settled && !planActive   → paid; the webhook has not arrived yet (or failed
 *                              signature verification — worth an admin alert if
 *                              it persists past a minute)
 *   !settled                 → no money moved; stop promising activation
 *
 * Read-only on purpose. It does not activate a plan: settlement runs in exactly
 * one place, the webhook handler, so there is a single writer for money.
 */
export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return apiError("Company required", 400);

  if (!hasSafepayConfig()) return apiError("Safepay is not configured.", 503);

  const tracker = String(req.nextUrl.searchParams.get("tracker") || "").trim();
  if (!tracker) return apiError("tracker is required", 400);

  // A tracker token is a bearer-ish reference to someone's payment, so it is
  // only answerable for the company it was issued to. Without this check any
  // signed-in user could probe another tenant's checkout by guessing tokens.
  const subscription = await prisma.subscription.findUnique({
    where:  { companyId },
    select: { safepayTracker: true, status: true, currentPeriodEnd: true },
  });

  const ownsTracker =
    subscription?.safepayTracker === tracker ||
    // The subscription row only ever holds the *latest* tracker, and a customer
    // who retried a failed card has older ones. The checkout log is the full
    // history, scoped to this company either way.
    Boolean(
      await prisma.activityLog.findFirst({
        where:  { companyId, action: "BILLING_CHECKOUT_CREATED", details: { contains: tracker } },
        select: { id: true },
      }).catch(() => null),
    );

  if (!ownsTracker) return apiError("Unknown tracker for this company", 404);

  const status = await fetchSafepayPaymentStatus(tracker);
  if (!status) return apiError("Could not reach Safepay to confirm this payment.", 502);

  const planActive = ["ACTIVE", "TRIALING"].includes(String(subscription?.status || "").toUpperCase());

  return apiOk({
    tracker,
    state:     status.state,
    settled:   status.paid,
    planActive,
    amountPkr: status.amountPkr,
    currentPeriodEnd: subscription?.currentPeriodEnd || null,
  });
}
