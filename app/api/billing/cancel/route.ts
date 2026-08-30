import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiError, apiOk } from "@/lib/apiError";
import { cancelLemonSubscription } from "@/lib/lemonsqueezy";

// Data Retention Policy:
//   Day  0      — subscription cancelled, account becomes read-only
//   Day  1–30   — read-only grace period, user can still export data
//   Day 31–90   — account locked (login disabled), data preserved
//   Day 90+     — hard delete triggered by /api/admin/cron/data-cleanup

const RETENTION_DAYS = 90;
const GRACE_PERIOD_DAYS = 30; // read-only window

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return apiError("Company required", 400);

    const userRole = req.headers.get("x-user-role");
    if (userRole?.toUpperCase() !== "ADMIN") return apiError("Forbidden", 403);

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason ? String(body.reason).slice(0, 500) : null;

    // Stop the money first.
    //
    // This route used to write CANCELLED into our own Company row and stop
    // there — nothing ever told Lemon Squeezy. The customer saw a cancelled
    // account and kept being charged every month, which is the one billing
    // failure an apology cannot undo.
    //
    // Deliberately before the local write, and fatal if it fails: leaving the
    // account live and asking them to retry is recoverable, whereas telling
    // them they have cancelled while the card keeps being charged is not. A
    // company with no gateway subscription — an offline deal — has nothing to
    // call and passes straight through.
    const subscription = await prisma.subscription
      .findUnique({
        where: { companyId },
        select: { provider: true, stripeSubscriptionId: true },
      })
      .catch(() => null);

    if (subscription?.stripeSubscriptionId && String(subscription.provider).toUpperCase() === "LEMONSQUEEZY") {
      const cancelled = await cancelLemonSubscription(subscription.stripeSubscriptionId);
      if (!cancelled.ok) {
        await prisma.activityLog.create({
          data: {
            companyId,
            userId: req.headers.get("x-user-id") || null,
            action: "SUBSCRIPTION_CANCEL_PROVIDER_FAILED",
            details: JSON.stringify({
              provider: "LEMONSQUEEZY",
              subscriptionId: subscription.stripeSubscriptionId,
              error: cancelled.error,
              at: new Date().toISOString(),
            }),
          },
        }).catch(() => {});

        return apiError(
          `Could not cancel with the payment provider, so your subscription is still active and has not been changed. Please try again in a moment — if it keeps failing, contact support and we will cancel it by hand. (${cancelled.error})`,
          502,
        );
      }
    }

    const now = new Date();
    const dataRetentionUntil = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const gracePeriodEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    await prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: "CANCELED",
        cancelledAt: now,
        dataRetentionUntil,
      },
    });

    // The Subscription row is what /api/billing/payment-methods and the billing
    // context read. Left ACTIVE, it disagreed with the Company row and the page
    // went on offering to manage a card for a subscription that was gone.
    if (subscription) {
      await prisma.subscription.update({
        where: { companyId },
        data: { status: "CANCELLED", cancelAtPeriodEnd: true, canceledAt: now },
      }).catch(() => {});
    }

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: req.headers.get("x-user-id") || null,
        action: "SUBSCRIPTION_CANCELED",
        details: JSON.stringify({
          reason,
          canceledAt: now.toISOString(),
          dataRetentionUntil: dataRetentionUntil.toISOString(),
          gracePeriodEnd: gracePeriodEnd.toISOString(),
          policy: `Read-only for ${GRACE_PERIOD_DAYS} days, data retained for ${RETENTION_DAYS} days, then permanently deleted.`,
        }),
      },
    }).catch(() => {});

    return apiOk({
      canceled: true,
      dataRetentionUntil: dataRetentionUntil.toISOString(),
      gracePeriodEnd: gracePeriodEnd.toISOString(),
      retentionDays: RETENTION_DAYS,
      message: `Your data will be retained until ${dataRetentionUntil.toLocaleDateString()}. You have ${GRACE_PERIOD_DAYS} days to export your data in read-only mode.`,
    });
  } catch (e: unknown) {
    return apiError(e instanceof Error ? e.message : "Cancel failed", 500);
  }
}
