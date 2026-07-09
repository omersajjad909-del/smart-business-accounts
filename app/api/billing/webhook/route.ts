import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk } from "@/lib/apiError";
import { createHmac, timingSafeEqual } from "crypto";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/emailTemplates";
import { mapLemonSubscriptionStatus, verifyLemonSignature } from "@/lib/lemonsqueezy";

function safeDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function applySuccessfulPlanUpdate(params: {
  companyId: string;
  planCode: string;
  status: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
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
      ...(params.providerCustomerId ? { stripeCustomerId: params.providerCustomerId } : {}),
      ...(params.displayCurrency    ? { baseCurrency: params.displayCurrency }         : {}),
      ...(params.displayCountry     ? { country: params.displayCountry }               : {}),
    },
  });

  await prisma.subscription.upsert({
    where: { companyId: params.companyId },
    update: {
      plan: normalizedPlan,
      status: params.status,
      billingCycle: normalizedCycle,
      currentPeriodEnd: params.currentPeriodEnd || undefined,
      ...(params.providerCustomerId     ? { stripeCustomerId: params.providerCustomerId }         : {}),
      ...(params.providerSubscriptionId ? { stripeSubscriptionId: params.providerSubscriptionId } : {}),
      ...(typeof params.invoiceAmount === "number" ? { pricePerMonth: params.invoiceAmount } : {}),
    },
    create: {
      companyId: params.companyId,
      plan: normalizedPlan,
      status: params.status,
      billingCycle: normalizedCycle,
      currentPeriodEnd: params.currentPeriodEnd || undefined,
      stripeCustomerId: params.providerCustomerId || undefined,
      stripeSubscriptionId: params.providerSubscriptionId || undefined,
      pricePerMonth: typeof params.invoiceAmount === "number" ? params.invoiceAmount : 0,
    },
  });
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
  nextBillingDate: string,
) {
  try {
    const uc = await getCompanyOwner(companyId);
    if (!uc?.user?.email) return;

    await sendEmail({
      to:      uc.user.email,
      subject: `Payment confirmed — ${planLabel(planCode)} plan receipt`,
      html:    emailTemplates.paymentConfirmation(
        uc.user.name || "there",
        planCode,
        amount,
        currency,
        nextBillingDate,
        `${APP_URL}/dashboard/settings/subscription`,
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

  if (eventName.startsWith("subscription_") && companyId) {
    const status           = mapLemonSubscriptionStatus(String(attrs?.status || ""));
    const currentPeriodEnd = safeDate(attrs?.renews_at || attrs?.ends_at || attrs?.trial_ends_at);
    const customerId       = attrs?.customer_id ? String(attrs.customer_id) : null;
    const subscriptionId   = payload?.data?.id  ? String(payload.data.id)  : null;
    const invoiceAmount    = typeof attrs?.subtotal === "number" ? Number(attrs.subtotal) / 100 : null;

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

    if (eventName === "subscription_payment_success" && invoiceAmount) {
      const nextBilling = currentPeriodEnd
        ? currentPeriodEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
        : "your next billing date";
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
      await sendRefundConfirmationEmail(companyId, planCode, refundedAmount, refundedCurrency);
    }
  }

  if ((eventName === "order_created" || eventName === "subscription_payment_success") && companyId) {
    await prisma.activityLog.create({
      data: {
        companyId, userId: null,
        action: "PAYMENT_EVENT",
        details: JSON.stringify({
          provider: "LEMON_SQUEEZY", eventName,
          amount: attrs?.subtotal ?? attrs?.total ?? null,
          currency: attrs?.currency || "USD",
          orderId: payload?.data?.id || null,
        }),
      },
    }).catch(() => {});
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
      : "your next billing date";

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

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (req.headers.get("x-signature"))     return await handleLemonWebhook(req, raw);
    if (req.headers.get("stripe-signature")) return await handleStripeWebhook(req, raw);
    return apiError("Unsupported webhook signature", 400);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
