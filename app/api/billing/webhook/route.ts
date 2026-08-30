import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAffiliateConversion } from "@/lib/affiliateTracking";
import { apiError, apiOk } from "@/lib/apiError";
import { createHmac, timingSafeEqual } from "crypto";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/emailTemplates";
import { mapLemonSubscriptionStatus, verifyLemonSignature } from "@/lib/lemonsqueezy";
import { mapSafepayEventToStatus, verifySafepaySignature } from "@/lib/safepay";
import {
  PAYMENT_EVENT_DEDUPE_WINDOW_MS,
  createBillingInvoiceAccessToken,
  getHostedBillingInvoiceId,
  isSameCardCharge,
  parsePaymentEventDetails,
} from "@/lib/billingInvoice";
import { markPlatformInvoiceRefunded, recordPlatformInvoice } from "@/lib/platformInvoice";

function safeDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Credit the affiliate who referred this company, if there was one.
 *
 * Runs after the plan is live rather than at signup, because a commission is
 * owed on money received, not on an account being created. recordAffiliateConversion
 * is idempotent per company, so the renewal webhooks that follow every billing
 * cycle cannot pay the same referral twice. Failures are swallowed on purpose:
 * a broken payout calculation must never roll back a successful subscription.
 */
async function creditReferringAffiliate(companyId: string, planCode: string, amount?: number | null) {
  try {
    const owner = await getCompanyOwner(companyId);
    const email = owner?.user?.email;
    if (!email) return;

    const result = await recordAffiliateConversion({
      companyId,
      customerEmail: email,
      customerName: owner?.user?.name,
      plan: planCode,
      planAmount: amount ?? null,
    });

    if (result.recorded) {
      console.log(`[affiliate] conversion recorded for company ${companyId}: ${result.commissionAmt}`);
    }
  } catch (err) {
    console.error("[affiliate] failed to record conversion:", err);
  }
}

async function applySuccessfulPlanUpdate(params: {
  companyId: string;
  planCode: string;
  status: string;
  provider?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  safepayTracker?: string | null;
  safepayOrderId?: string | null;
  currentPeriodEnd?: Date | null;
  billingCycle?: string | null;
  displayCurrency?: string | null;
  displayCountry?: string | null;
  invoiceAmount?: number | null;
}) {
  const normalizedPlan  = String(params.planCode || "STARTER").toUpperCase();
  const normalizedCycle = String(params.billingCycle || "MONTHLY").toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";

  if (normalizedPlan.startsWith("ADDON-")) {
    if (normalizedPlan === "ADDON-AUTOMATION") {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AutomationAddon" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "companyId" TEXT NOT NULL UNIQUE,
          "enabled" BOOLEAN NOT NULL DEFAULT true,
          "plan" TEXT NOT NULL DEFAULT 'MONTHLY',
          "pricePerMonth" DOUBLE PRECISION NOT NULL DEFAULT 79,
          "expiresAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).catch(() => {});
      await prisma.$executeRaw`
        INSERT INTO "AutomationAddon" ("companyId", "enabled", "plan", "pricePerMonth")
        VALUES (${params.companyId}, true, ${normalizedCycle}, 79)
        ON CONFLICT ("companyId") DO UPDATE SET "enabled" = true, "updatedAt" = NOW()
      `.catch(() => {});
    }
    return;
  }

  await prisma.company.update({
    where: { id: params.companyId },
    data: {
      plan: normalizedPlan,
      subscriptionStatus: params.status,
      currentPeriodEnd: params.currentPeriodEnd || undefined,
      // A gateway subscription supersedes any hand-granted period. A company
      // that started on an offline deal and later put a card on file would
      // otherwise still be carrying the old grant date, and the guards would
      // close a paying account the day that date passed.
      accessGrantedUntil: null,
      ...(params.providerCustomerId ? { stripeCustomerId: params.providerCustomerId } : {}),
      ...(params.displayCurrency    ? { baseCurrency: params.displayCurrency }         : {}),
      ...(params.displayCountry     ? { country: params.displayCountry }               : {}),
    },
  });

  const provider = String(params.provider || "LEMONSQUEEZY").toUpperCase();

  await prisma.subscription.upsert({
    where: { companyId: params.companyId },
    update: {
      plan: normalizedPlan,
      status: params.status,
      provider,
      billingCycle: normalizedCycle,
      currentPeriodEnd: params.currentPeriodEnd || undefined,
      ...(params.providerCustomerId     ? { stripeCustomerId: params.providerCustomerId }         : {}),
      ...(params.providerSubscriptionId ? { stripeSubscriptionId: params.providerSubscriptionId } : {}),
      ...(params.safepayTracker         ? { safepayTracker: params.safepayTracker }               : {}),
      ...(params.safepayOrderId         ? { safepayOrderId: params.safepayOrderId }               : {}),
      ...(typeof params.invoiceAmount === "number" ? { pricePerMonth: params.invoiceAmount } : {}),
    },
    create: {
      companyId: params.companyId,
      plan: normalizedPlan,
      status: params.status,
      provider,
      billingCycle: normalizedCycle,
      currentPeriodEnd: params.currentPeriodEnd || undefined,
      stripeCustomerId: params.providerCustomerId || undefined,
      stripeSubscriptionId: params.providerSubscriptionId || undefined,
      safepayTracker: params.safepayTracker || undefined,
      safepayOrderId: params.safepayOrderId || undefined,
      pricePerMonth: typeof params.invoiceAmount === "number" ? params.invoiceAmount : 0,
    },
  });

  await creditReferringAffiliate(params.companyId, normalizedPlan, params.invoiceAmount);
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app";

const PLAN_FEATURES: Record<string, string[]> = {
  starter:      ["Up to 5 users", "Sales & purchase invoices", "Chart of accounts", "Ledger & trial balance", "Basic reports", "Email support"],
  pro:          ["Up to 20 users", "Everything in Starter", "Inventory management", "Bank reconciliation", "Multi-branch support", "HR & payroll", "CRM & advanced reports", "Priority support"],
  professional: ["Up to 20 users", "Everything in Starter", "Inventory management", "Bank reconciliation", "Multi-branch support", "HR & payroll", "CRM & advanced reports", "Priority support"],
  enterprise:   ["Unlimited users", "Everything in Professional", "API access", "Custom integrations", "Multi-currency", "Guided onboarding", "Advanced audit trails", "Dedicated support"],
  custom:       ["Your selected modules", "Flexible billing", "Dedicated account manager", "Priority support", "Custom onboarding"],
};

function planLabel(planCode: string) {
  const key = String(planCode || "starter").toLowerCase();
  if (["pro", "professional"].includes(key)) return "Professional";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

async function getCompanyOwner(companyId: string) {
  return prisma.userCompany.findFirst({
    where:   { companyId, user: { role: { in: ["ADMIN", "OWNER"] } } },
    include: { user: { select: { name: true, email: true } }, company: { select: { country: true } } },
  });
}

// ─── Email senders ────────────────────────────────────────────────────────────

async function sendWelcomeSubscriptionEmail(companyId: string, planCode: string, country?: string | null) {
  try {
    const uc = await getCompanyOwner(companyId);
    if (!uc?.user?.email) return;

    const planKey         = String(planCode || "starter").toLowerCase();
    const features        = PLAN_FEATURES[planKey] || PLAN_FEATURES.starter;
    const resolvedCountry = country || uc.company?.country || "GLOBAL";

    await sendEmail({
      to:      uc.user.email,
      subject: `Welcome to FinovaOS — Your ${planLabel(planCode)} plan is active`,
      html:    emailTemplates.welcomeSubscription(
        uc.user.name || "there",
        planKey,
        features,
        `${APP_URL}/dashboard`,
        resolvedCountry,
      ),
    });
  } catch {}
}

async function sendPaymentConfirmationEmail(
  companyId: string,
  planCode: string,
  amount: number,
  currency: string,
  nextBillingDate: string | null,
) {
  try {
    const uc = await getCompanyOwner(companyId);
    if (!uc?.user?.email) return;
    const invoiceId = getHostedBillingInvoiceId(companyId);
    const invoiceToken = createBillingInvoiceAccessToken(companyId, invoiceId);

    await sendEmail({
      to:      uc.user.email,
      subject: `Payment confirmed — ${planLabel(planCode)} plan receipt`,
      html:    emailTemplates.paymentConfirmation(
        uc.user.name || "there",
        planCode,
        amount,
        currency,
        nextBillingDate,
        `${APP_URL}/api/billing/invoices/pdf?invoiceId=${encodeURIComponent(invoiceId)}&token=${encodeURIComponent(invoiceToken)}`,
        `${APP_URL}/dashboard`,
      ),
    });
  } catch {}
}

async function sendPaymentFailedEmail(
  companyId: string,
  planCode: string,
  amount: number,
  currency: string,
  retryDate: string,
) {
  try {
    const uc = await getCompanyOwner(companyId);
    if (!uc?.user?.email) return;

    await sendEmail({
      to:      uc.user.email,
      subject: `Action required — payment failed for your FinovaOS subscription`,
      html:    emailTemplates.paymentFailed(
        uc.user.name || "there",
        planCode,
        amount,
        currency,
        retryDate,
        `${APP_URL}/dashboard/settings/subscription`,
      ),
    });
  } catch {}
}

// Sent when LemonSqueezy refunds a payment. LemonSqueezy is the source of
// truth for the refund — we only send a receipt confirmation and log the event.
async function sendRefundConfirmationEmail(
  companyId: string,
  planCode: string,
  amount: number,
  currency: string,
) {
  try {
    const uc = await getCompanyOwner(companyId);
    if (!uc?.user?.email) return;

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
        <h2 style="color:#0f766e;">Refund Confirmation</h2>
        <p>Hi ${uc.user.name || "there"},</p>
        <p>Your refund for the <strong>${planLabel(planCode)}</strong> plan has been processed by our payment provider.</p>
        <p><strong>Amount refunded:</strong> ${formattedAmount}</p>
        <p>Refunds typically appear in your account within 5–10 business days depending on your bank or card issuer.</p>
        <p>If you have any questions, reply to this email or visit
          <a href="https://finovaos.app/support" style="color:#0f766e;">finovaos.app/support</a>.
        </p>
        <p style="color:#666;font-size:12px;margin-top:24px;">
          This confirmation was sent because a refund was processed on your FinovaOS subscription.
        </p>
      </div>
    `;

    await sendEmail({
      to:      uc.user.email,
      subject: `Refund processed — ${planLabel(planCode)} plan`,
      html,
    });
  } catch {}
}

// Internal alert to legal@ when a duplicate charge is detected. We do NOT
// auto-refund — a human must review.
async function sendDuplicateChargeAlertEmail(
  companyId: string,
  subscriptionId: string | null,
  amount: number,
  currency: string,
  originalEventAt: Date,
) {
  try {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
        <h2 style="color:#b91c1c;">Possible duplicate charge detected</h2>
        <p>Two successful <code>subscription_payment_success</code> events fired within 60 minutes for the same subscription.</p>
        <ul>
          <li><strong>Company ID:</strong> ${companyId}</li>
          <li><strong>Subscription ID:</strong> ${subscriptionId || "n/a"}</li>
          <li><strong>Amount:</strong> ${amount} ${currency}</li>
          <li><strong>Previous success:</strong> ${originalEventAt.toISOString()}</li>
        </ul>
        <p>Review in LemonSqueezy and issue a manual refund if warranted. Webhook did not auto-refund.</p>
      </div>
    `;
    await sendEmail({
      to:      "legal@finovaos.app",
      subject: `[FinovaOS] Duplicate charge alert — company ${companyId}`,
      html,
    });
  } catch {}
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

async function alreadyProcessed(provider: string, eventKey: string): Promise<boolean> {
  if (!eventKey) return false;
  try {
    await (prisma as any).webhookEvent.create({
      data: { provider, eventKey },
    });
    return false;
  } catch (e: any) {
    // Unique constraint violation => we've seen this event before
    if (e?.code === "P2002") return true;
    // Any other DB error: don't block processing — safer to re-run than drop
    return false;
  }
}

// ─── Lemon Squeezy ───────────────────────────────────────────────────────────

async function handleLemonWebhook(req: NextRequest, raw: string) {
  const signature = req.headers.get("x-signature");
  if (!verifyLemonSignature(raw, signature)) {
    return apiError("Invalid Lemon Squeezy signature", 400);
  }

  const payload   = JSON.parse(raw);
  const meta      = payload?.meta || {};
  const eventName = String(meta?.event_name || "");
  const attrs     = payload?.data?.attributes || {};
  const custom    = meta?.custom_data || attrs?.custom_data || attrs?.first_subscription_item?.custom_data || {};

  // Idempotency — dedupe on (webhook_id || data.id) + eventName. LemonSqueezy retries on failure.
  const webhookId = String(meta?.webhook_id || payload?.data?.id || "");
  const eventKey  = `${eventName}:${webhookId}`;
  if (await alreadyProcessed("lemonsqueezy", eventKey)) {
    return apiOk({ received: true, provider: "lemonsqueezy", duplicate: true });
  }

  const companyId      = String(custom?.company_id || meta?.custom_data?.company_id || "").trim();
  const planCode       = String(custom?.plan_code || attrs?.product_name || "STARTER").toUpperCase();
  const billingCycle   = String(custom?.billing_cycle || attrs?.billing_anchor || "MONTHLY").toUpperCase();
  const displayCurrency = custom?.display_currency ? String(custom.display_currency).toUpperCase() : null;
  const displayCountry  = custom?.display_country  ? String(custom.display_country).toUpperCase()  : null;

  // LemonSqueezy's `subscription_*` events cover TWO unrelated resource
  // types under one prefix: real subscription-status events (data.type
  // "subscriptions", where attrs.status is "active"/"on_trial"/etc — exactly
  // what mapLemonSubscriptionStatus expects) vs subscription-invoice events
  // (data.type "subscription-invoices", where attrs.status is an invoice
  // status like "paid"). subscription_payment_success carries the latter.
  // Previously every subscription_* event ran through mapLemonSubscriptionStatus
  // unconditionally — so a payment_success event's invoice status "paid"
  // fell through the switch's default case to "INACTIVE" and silently
  // overwrote the company's real "ACTIVE" status that subscription_created
  // had just set moments earlier. That's exactly what happened on this
  // company: subscription_created → ACTIVE, subscription_updated → ACTIVE,
  // then subscription_payment_success → INACTIVE (wrong) clobbered both.
  const SUBSCRIPTION_STATUS_EVENTS = new Set([
    "subscription_created", "subscription_updated", "subscription_cancelled",
    "subscription_resumed", "subscription_expired", "subscription_paused", "subscription_unpaused",
  ]);

  if (eventName.startsWith("subscription_") && companyId) {
    const currentPeriodEnd = safeDate(attrs?.renews_at || attrs?.ends_at || attrs?.trial_ends_at);
    const customerId       = attrs?.customer_id ? String(attrs.customer_id) : null;
    const subscriptionId   = payload?.data?.id  ? String(payload.data.id)  : null;
    const invoiceAmount    = typeof attrs?.subtotal === "number" ? Number(attrs.subtotal) / 100 : null;

    if (SUBSCRIPTION_STATUS_EVENTS.has(eventName)) {
      const status = mapLemonSubscriptionStatus(String(attrs?.status || ""));

      await applySuccessfulPlanUpdate({
        companyId, planCode, status,
        providerCustomerId: customerId,
        providerSubscriptionId: subscriptionId,
        currentPeriodEnd, billingCycle, displayCurrency, displayCountry,
        invoiceAmount,
      });

      await prisma.activityLog.create({
        data: {
          companyId, userId: null,
          action: "LEMON_SUBSCRIPTION_EVENT",
          details: JSON.stringify({ eventName, planCode, status, subscriptionId, customerId, currentPeriodEnd: currentPeriodEnd?.toISOString() || null }),
        },
      }).catch(() => {});

      if (eventName === "subscription_created" && (status === "ACTIVE" || status === "TRIALING")) {
        await sendWelcomeSubscriptionEmail(companyId, planCode, displayCountry);
      }
    }

    if (eventName === "subscription_payment_success" && invoiceAmount) {
      const nextBilling = currentPeriodEnd
        ? currentPeriodEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
        : null;
      await sendPaymentConfirmationEmail(companyId, planCode, invoiceAmount, attrs?.currency || "USD", nextBilling);

      // Successful payment ends any dunning streak — clear paymentFailedAt.
      // Guarded because the column may not exist yet in the schema.
      await prisma.$executeRawUnsafe(
        `UPDATE "Company" SET "paymentFailedAt" = NULL WHERE "id" = $1`,
        companyId,
      ).catch(() => {});

      // ── Duplicate charge detection ────────────────────────────────────────
      // Look for another SUCCESS log for the same subscriptionId within the
      // last 60 minutes. If found, flag but do NOT auto-refund — LemonSqueezy
      // remains the source of truth and a human must review.
      if (subscriptionId) {
        const sinceMs = 60 * 60 * 1000;
        const recent = await prisma.activityLog.findFirst({
          where: {
            companyId,
            action: "PAYMENT_EVENT",
            createdAt: { gte: new Date(Date.now() - sinceMs) },
            details: { contains: `"subscriptionId":"${subscriptionId}"` },
          },
          orderBy: { createdAt: "desc" },
        }).catch(() => null);

        if (recent) {
          await prisma.activityLog.create({
            data: {
              companyId, userId: null,
              action: "DUPLICATE_CHARGE_FLAGGED",
              details: JSON.stringify({
                provider: "LEMON_SQUEEZY",
                subscriptionId,
                amount: invoiceAmount,
                currency: attrs?.currency || "USD",
                previousEventAt: recent.createdAt.toISOString(),
                note: "Second successful charge within 60 minutes — flagged for manual review. No auto-refund issued.",
              }),
            },
          }).catch(() => {});

          await sendDuplicateChargeAlertEmail(
            companyId,
            subscriptionId,
            invoiceAmount,
            attrs?.currency || "USD",
            recent.createdAt,
          );
        }
      }
    }

    if (eventName === "subscription_payment_failed") {
      const retryAt = safeDate(attrs?.trial_ends_at || attrs?.ends_at);
      const retryDate = retryAt
        ? retryAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
        : "soon";
      const failedAmount = typeof attrs?.subtotal === "number" ? Number(attrs.subtotal) / 100 : 0;
      await sendPaymentFailedEmail(companyId, planCode, failedAmount, attrs?.currency || "USD", retryDate);

      // ── Dunning state machine kickoff ─────────────────────────────────────
      // Stamp paymentFailedAt on the Company row (idempotent — only set on the
      // first failure of a streak; a subsequent success will clear it via the
      // success handler above). The `platform-dunning` cron then progresses
      // the account: 7 days → READ_ONLY, 30 days → SUSPENDED per Terms.
      // NOTE: `paymentFailedAt` field is NOT yet in prisma/schema.prisma —
      // see report. Using `$executeRawUnsafe` guarded try/catch until migrated.
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Company"
             SET "paymentFailedAt" = COALESCE("paymentFailedAt", NOW()),
                 "subscriptionStatus" = CASE
                   WHEN "subscriptionStatus" IN ('ACTIVE','TRIALING')
                     THEN 'PAST_DUE'
                   ELSE "subscriptionStatus"
                 END
           WHERE "id" = $1`,
          companyId,
        );
      } catch {
        // Column doesn't exist yet — fall back to status-only update.
        await prisma.company.update({
          where: { id: companyId },
          data: { subscriptionStatus: "PAST_DUE" },
        }).catch(() => {});
      }

      await prisma.activityLog.create({
        data: {
          companyId, userId: null,
          action: "PLATFORM_PAYMENT_FAILED",
          details: JSON.stringify({
            provider: "LEMON_SQUEEZY",
            subscriptionId,
            planCode,
            amount: failedAmount,
            currency: attrs?.currency || "USD",
            nextRetry: retryDate,
          }),
        },
      }).catch(() => {});
    }

    // ── Refund handling ─────────────────────────────────────────────────────
    // LemonSqueezy fires `subscription_payment_refunded` when a refund is
    // processed on a subscription payment. We treat this as receipt-only:
    // log it, email the customer, do NOT auto-issue anything from our side.
    if (eventName === "subscription_payment_refunded") {
      const refundedAmount =
        typeof attrs?.subtotal === "number" ? Number(attrs.subtotal) / 100 :
        typeof attrs?.total    === "number" ? Number(attrs.total)    / 100 : 0;
      const refundedCurrency = attrs?.currency || "USD";

      await prisma.activityLog.create({
        data: {
          companyId, userId: null,
          action: "REFUND_PROCESSED",
          details: JSON.stringify({
            provider: "LEMON_SQUEEZY",
            eventName,
            subscriptionId,
            planCode,
            amount: refundedAmount,
            currency: refundedCurrency,
            refundedAt: new Date().toISOString(),
            source: "webhook_receipt", // LemonSqueezy is source of truth
          }),
        },
      }).catch(() => {});

      if (refundedAmount > 0) {
        // The ledger row keeps its number and stays in place — a refund is an
        // amendment, never a deletion, because a filed tax return still has to
        // reconcile against it.
        await markPlatformInvoiceRefunded({
          providerSubscriptionId: subscriptionId,
          companyId,
          amount: refundedAmount,
        });
        await sendRefundConfirmationEmail(companyId, planCode, refundedAmount, refundedCurrency);
      }
    }
  }

  // ── Order-level refund (one-off orders, not subscription payments) ────────
  if (eventName === "order_refunded" && companyId) {
    const refundedAmount =
      typeof attrs?.subtotal === "number" ? Number(attrs.subtotal) / 100 :
      typeof attrs?.total    === "number" ? Number(attrs.total)    / 100 : 0;
    const refundedCurrency = attrs?.currency || "USD";

    await prisma.activityLog.create({
      data: {
        companyId, userId: null,
        action: "REFUND_PROCESSED",
        details: JSON.stringify({
          provider: "LEMON_SQUEEZY",
          eventName,
          orderId: payload?.data?.id || null,
          planCode,
          amount: refundedAmount,
          currency: refundedCurrency,
          refundedAt: new Date().toISOString(),
          source: "webhook_receipt",
        }),
      },
    }).catch(() => {});

    if (refundedAmount > 0) {
      await markPlatformInvoiceRefunded({
        providerOrderId: String(payload?.data?.id || ""),
        companyId,
        amount: refundedAmount,
      });
      await sendRefundConfirmationEmail(companyId, planCode, refundedAmount, refundedCurrency);
    }
  }

  if ((eventName === "order_created" || eventName === "subscription_payment_success") && companyId) {
    const orderKey = String(attrs?.order_id ?? payload?.data?.id ?? "");
    // `total` is what the card was charged. This read `subtotal` first, which
    // is the price *before* the discount — the launch-offer sale that actually
    // collected $24.50 was recorded as $49.00.
    const minorUnits = Number(attrs?.total ?? attrs?.subtotal ?? 0);
    const currency = String(attrs?.currency || "USD").toUpperCase();
    const buyerEmail = String(attrs?.user_email || attrs?.customer_email || "");
    const chargeSubscriptionId = attrs?.subscription_id
      ? String(attrs.subscription_id)
      : eventName.startsWith("subscription_") ? String(payload?.data?.id || "") : null;

    // One card charge fires BOTH order_created and subscription_payment_success,
    // and the two carry different ids (the order id vs the subscription-invoice
    // id) — so keying on the id let both through, producing two invoice rows and
    // two bell notifications for a single payment. Match on the money instead:
    // same amount + currency from a *different* event name inside the window is
    // the same charge. Two events with the SAME name stay separate, so a genuine
    // double charge is still recorded and flagged below.
    const recentPayments = Number.isFinite(minorUnits) && minorUnits > 0
      ? await prisma.activityLog.findMany({
          where: {
            companyId,
            action: "PAYMENT_EVENT",
            createdAt: { gte: new Date(Date.now() - PAYMENT_EVENT_DEDUPE_WINDOW_MS) },
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, details: true },
          take: 20,
        }).catch(() => [])
      : [];

    const now = new Date();
    const alreadyRecorded = recentPayments.some((log) => {
      const det = parsePaymentEventDetails(log.details);
      return isSameCardCharge(
        {
          eventName: det?.eventName,
          amount: Number(det?.amount ?? 0),
          currency: String(det?.currency || "USD").toUpperCase(),
          at: log.createdAt,
        },
        { eventName, amount: minorUnits, currency, at: now },
      );
    });

    if (!alreadyRecorded) {
      // Permanent ledger row. Its number is allocated once, here, and is what
      // the customer's PDF and the admin ledger both show from now on.
      const invoiceCompany = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, country: true },
      }).catch(() => null);

      await recordPlatformInvoice({
        companyId,
        companyName: invoiceCompany?.name,
        provider: "LEMONSQUEEZY",
        // The order id is stable across both events of one charge; the
        // subscription-invoice event falls back to its own id.
        providerEventId: `lemon:${orderKey || payload?.data?.id || eventName}`,
        providerOrderId: orderKey || null,
        providerSubscriptionId: chargeSubscriptionId,
        plan: planCode,
        billingCycle,
        currency,
        // Lemon Squeezy reports every money field in minor units.
        subtotal: Number(attrs?.subtotal ?? minorUnits) / 100,
        discount: Number(attrs?.discount_total ?? 0) / 100,
        taxRate: Number(attrs?.tax_rate ?? 0),
        taxAmount: Number(attrs?.tax ?? 0) / 100,
        taxName: attrs?.tax_name || null,
        total: minorUnits / 100,
        customerName: attrs?.user_name || null,
        customerEmail: buyerEmail || null,
        customerCountry: displayCountry || invoiceCompany?.country || null,
        // No company-level tax registration is captured at signup yet, so this
        // stays null until an admin fills it in on the ledger.
        cardBrand: attrs?.card_brand || null,
        cardLast4: attrs?.card_last_four || null,
        periodEnd: safeDate(attrs?.renews_at),
        issuedAt: safeDate(attrs?.created_at) || new Date(),
      });

      await prisma.activityLog.create({
        data: {
          companyId, userId: null,
          action: "PAYMENT_EVENT",
          details: JSON.stringify({
            provider: "LEMON_SQUEEZY", eventName,
            amount: minorUnits,
            currency,
            orderId: orderKey,
            // Read by the duplicate-charge detector above, which searched for a
            // key this payload never carried and so never fired.
            subscriptionId: chargeSubscriptionId,
            status: "paid",
          }),
        },
      }).catch(() => {});

      // Admin bell notification. Only the Pakistan gateway raised one before, so
      // a Lemon Squeezy sale landed in the revenue figures with nothing in the
      // bell — the $24.50 subscription went unannounced.
      try {
        const already = orderKey
          ? await prisma.notification.findFirst({
              where: { message: { contains: `#${orderKey}` } },
              select: { id: true },
            })
          : null;

        if (!already) {
          const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true },
          }).catch(() => null);

          const amountLabel =
            Number.isFinite(minorUnits) && minorUnits > 0
              ? `${currency} ${(minorUnits / 100).toFixed(2)}`
              : "Payment";

          await prisma.notification.create({
            data: {
              title: `💳 New Subscription: ${amountLabel}`,
              message: [
                company?.name || "Unknown company",
                String(planCode || "").toUpperCase() || "PLAN",
                buyerEmail,
                `#${orderKey}`,
              ].filter(Boolean).join(" · "),
              type: "SUCCESS",
              link: "/admin/subscriptions",
              isRead: false,
            },
          });
        }
      } catch {}
    }
  }

  return apiOk({ received: true, provider: "lemonsqueezy" });
}

// ─── Stripe ───────────────────────────────────────────────────────────────────

async function handleStripeWebhook(req: NextRequest, raw: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return apiError("Stripe webhook not configured", 500);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return apiError("Missing Stripe-Signature", 400);

  const parts  = sig.split(",").map((p) => p.trim());
  const tPart  = parts.find((p) => p.startsWith("t="))  || "";
  const v1Part = parts.find((p) => p.startsWith("v1=")) || "";
  const ts     = Number(tPart.replace("t=", ""));
  const v1     = v1Part.replace("v1=", "");
  if (!ts || !v1) return apiError("Invalid Stripe-Signature", 400);

  const signedPayload = `${ts}.${raw}`;
  const expected      = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
  const isValid       = timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  if (!isValid || Math.abs(Date.now() - ts * 1000) > 5 * 60 * 1000) {
    return apiError("Signature verification failed", 400);
  }

  const payload = JSON.parse(raw);
  const type    = payload.type;
  const data    = payload.data?.object || {};

  // Idempotency — Stripe includes a unique event ID that we dedupe on
  const stripeEventId = String(payload?.id || "");
  const stripeEventKey = `${type}:${stripeEventId}`;
  if (stripeEventId && await alreadyProcessed("stripe", stripeEventKey)) {
    return apiOk({ received: true, provider: "stripe", duplicate: true });
  }

  if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
    const companyId          = data.metadata?.companyId || null;
    const planCode           = data.metadata?.planCode  || null;
    const stripeCustomerId   = data.customer || null;
    const stripeSubscriptionId = data.id || null;
    const currentPeriodEnd   = data.current_period_end ? new Date(data.current_period_end * 1000) : null;

    if (companyId) {
      const dbStatus =
        String(data.status || "").toUpperCase() === "ACTIVE"   ? "ACTIVE"   :
        String(data.status || "").toUpperCase() === "TRIALING" ? "TRIALING" :
        String(data.status || "").toUpperCase() === "PAST_DUE" ? "PAST_DUE" :
        String(data.status || "").toUpperCase() === "CANCELED"  ? "CANCELED"  :
        "INACTIVE";

      await applySuccessfulPlanUpdate({
        companyId,
        planCode: String(planCode || "STARTER"),
        status: dbStatus,
        providerCustomerId: stripeCustomerId,
        providerSubscriptionId: stripeSubscriptionId,
        currentPeriodEnd,
      });

      if (type === "customer.subscription.created" && (dbStatus === "ACTIVE" || dbStatus === "TRIALING")) {
        const countryMeta = data.metadata?.country || null;
        await sendWelcomeSubscriptionEmail(companyId, String(planCode || "starter"), countryMeta);
      }
    }
  }

  if (type === "invoice.payment_succeeded") {
    const companyId    = data.subscription_details?.metadata?.companyId || data.metadata?.companyId || null;
    const planCode     = data.subscription_details?.metadata?.planCode  || data.metadata?.planCode  || "STARTER";
    const amountPaid   = typeof data.amount_paid === "number" ? data.amount_paid / 100 : 0;
    const currency     = String(data.currency || "USD").toUpperCase();
    const periodEnd    = data.lines?.data?.[0]?.period?.end
      ? new Date(data.lines.data[0].period.end * 1000)
      : null;
    const nextBilling  = periodEnd
      ? periodEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
      : null;

    if (companyId && amountPaid > 0) {
      await sendPaymentConfirmationEmail(companyId, planCode, amountPaid, currency, nextBilling);
    }
  }

  if (type === "invoice.payment_failed") {
    const companyId  = data.subscription_details?.metadata?.companyId || data.metadata?.companyId || null;
    const planCode   = data.subscription_details?.metadata?.planCode  || data.metadata?.planCode  || "STARTER";
    const amount     = typeof data.amount_due === "number" ? data.amount_due / 100 : 0;
    const currency   = String(data.currency || "USD").toUpperCase();
    const nextRetry  = data.next_payment_attempt
      ? new Date(data.next_payment_attempt * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
      : "soon";

    if (companyId) {
      await sendPaymentFailedEmail(companyId, planCode, amount, currency, nextRetry);
    }
  }

  if (type === "customer.subscription.deleted") {
    const companyId = data.metadata?.companyId || null;
    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data:  { subscriptionStatus: "INACTIVE" },
      });
    }
  }

  return apiOk({ received: true, provider: "stripe" });
}

// ─── Safepay ──────────────────────────────────────────────────────────────────

async function handleSafepayWebhook(req: NextRequest, raw: string) {
  const sig = req.headers.get("x-sfpy-signature");
  if (!verifySafepaySignature(raw, sig)) {
    return apiError("Invalid Safepay signature", 400);
  }

  const payload  = JSON.parse(raw);
  const event    = String(payload?.type || payload?.event || "");
  const data     = payload?.data || payload?.payload || {};
  const tracker  = String(data?.tracker?.token || data?.tracker || payload?.tracker || "");
  const orderId  = String(data?.order?.ref || data?.order_id || payload?.order_id || "");
  const meta     = data?.metadata || data?.order?.metadata || payload?.metadata || {};

  // Extract companyId from metadata or order ref pattern (fnv-<companyId>-<ts>)
  let companyId = String(meta?.company_id || "").trim();
  if (!companyId && orderId.startsWith("fnv-")) {
    const parts = orderId.split("-");
    if (parts.length >= 2) companyId = parts.slice(1, -1).join("-");
  }
  if (!companyId) return apiError("Missing company_id in Safepay webhook", 400);

  const planCode     = String(meta?.plan_code     || "STARTER").toUpperCase();
  const billingCycle = String(meta?.billing_cycle || "MONTHLY").toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";

  // Idempotency — use tracker or orderId as the unique event key
  const eventKey = `${event}:${tracker || orderId}`;
  if (eventKey !== ":" && await alreadyProcessed("safepay", eventKey)) {
    return apiOk({ received: true, provider: "safepay", duplicate: true });
  }

  const status = mapSafepayEventToStatus(event);

  const amountPkr = typeof data?.order?.amount === "number" ? data.order.amount : null;

  if (status === "ACTIVE") {
    // Calculate 30-day (monthly) or 365-day (yearly) period end
    const periodDays = billingCycle === "YEARLY" ? 365 : 30;
    const currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    await applySuccessfulPlanUpdate({
      companyId,
      planCode,
      status,
      provider: "SAFEPAY",
      safepayTracker: tracker || null,
      safepayOrderId: orderId || null,
      currentPeriodEnd,
      billingCycle,
      displayCurrency: "PKR",
      displayCountry: "PK",
      invoiceAmount: amountPkr,
    });

    const safepayCompany = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    }).catch(() => null);

    // Safepay settles in PKR, so the ledger row is a rupee row — the admin
    // screens total each currency separately rather than mixing them.
    await recordPlatformInvoice({
      companyId,
      companyName: safepayCompany?.name,
      provider: "SAFEPAY",
      providerEventId: `safepay:${tracker || orderId}`,
      providerOrderId: orderId || null,
      plan: planCode,
      billingCycle,
      currency: "PKR",
      total: amountPkr || 0,
      customerCountry: "PK",
      periodEnd: currentPeriodEnd,
    });

    await prisma.activityLog.create({
      data: {
        companyId, userId: null,
        action: "SAFEPAY_PAYMENT_SUCCESS",
        details: JSON.stringify({ event, planCode, billingCycle, tracker, orderId, amountPkr }),
      },
    }).catch(() => {});

    // Clear dunning state on successful payment
    await prisma.$executeRawUnsafe(
      `UPDATE "Company" SET "paymentFailedAt" = NULL WHERE "id" = $1`,
      companyId,
    ).catch(() => {});

    const nextBilling = currentPeriodEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    await sendPaymentConfirmationEmail(companyId, planCode, amountPkr || 0, "PKR", nextBilling);

    if (event.includes("subscription:activated") || event.includes("payment:created")) {
      await sendWelcomeSubscriptionEmail(companyId, planCode, "PK");
    }
  }

  if (status === "PAST_DUE") {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Company"
           SET "paymentFailedAt" = COALESCE("paymentFailedAt", NOW()),
               "subscriptionStatus" = CASE
                 WHEN "subscriptionStatus" IN ('ACTIVE','TRIALING') THEN 'PAST_DUE'
                 ELSE "subscriptionStatus"
               END
         WHERE "id" = $1`,
        companyId,
      );
    } catch {
      await prisma.company.update({
        where: { id: companyId },
        data: { subscriptionStatus: "PAST_DUE" },
      }).catch(() => {});
    }

    await prisma.activityLog.create({
      data: {
        companyId, userId: null,
        action: "SAFEPAY_PAYMENT_FAILED",
        details: JSON.stringify({ event, planCode, tracker, orderId, amountPkr }),
      },
    }).catch(() => {});

    await sendPaymentFailedEmail(companyId, planCode, amountPkr || 0, "PKR", "soon");
  }

  if (status === "CANCELLED") {
    await prisma.company.update({
      where: { id: companyId },
      data:  { subscriptionStatus: "INACTIVE" },
    }).catch(() => {});

    await prisma.activityLog.create({
      data: {
        companyId, userId: null,
        action: "SAFEPAY_SUBSCRIPTION_CANCELLED",
        details: JSON.stringify({ event, planCode, tracker, orderId }),
      },
    }).catch(() => {});
  }

  return apiOk({ received: true, provider: "safepay" });
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (req.headers.get("x-sfpy-signature"))  return await handleSafepayWebhook(req, raw);
    if (req.headers.get("x-signature"))        return await handleLemonWebhook(req, raw);
    if (req.headers.get("stripe-signature"))   return await handleStripeWebhook(req, raw);
    return apiError("Unsupported webhook signature", 400);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
