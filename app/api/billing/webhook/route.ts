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
  const normalizedPlan = String(params.planCode || "STARTER").toUpperCase();
  const normalizedCycle = String(params.billingCycle || "MONTHLY").toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";

  await prisma.company.update({
    where: { id: params.companyId },
    data: {
      plan: normalizedPlan,
      subscriptionStatus: params.status,
      currentPeriodEnd: params.currentPeriodEnd || undefined,
      ...(params.providerCustomerId ? { stripeCustomerId: params.providerCustomerId } : {}),
      ...(params.displayCurrency ? { baseCurrency: params.displayCurrency } : {}),
      ...(params.displayCountry ? { country: params.displayCountry } : {}),
    },
  });

  await prisma.subscription.upsert({
    where: { companyId: params.companyId },
    update: {
      plan: normalizedPlan,
      status: params.status,
      billingCycle: normalizedCycle,
      currentPeriodEnd: params.currentPeriodEnd || undefined,
      ...(params.providerCustomerId ? { stripeCustomerId: params.providerCustomerId } : {}),
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

async function sendWelcomeSubscriptionEmail(companyId: string, planCode: string) {
  try {
    const PLAN_FEATURES: Record<string, string[]> = {
      starter: ["Up to 5 users", "Basic accounting", "Sales & purchase invoices", "Chart of accounts", "Bank reconciliation", "Basic reports", "Email support"],
      pro: ["Up to 20 users", "Advanced accounting", "Multi-branch support", "Inventory management", "Financial reports", "Expense management", "Payment reconciliation", "Priority support", "Audit logging"],
      professional: ["Up to 20 users", "Advanced accounting", "Multi-branch support", "Inventory management", "Financial reports", "Expense management", "Payment reconciliation", "Priority support", "Audit logging"],
      enterprise: ["Unlimited users", "Full accounting suite", "Advanced inventory", "Custom reports", "Guided onboarding", "Custom integrations", "Implementation planning", "Advanced audit trails", "Expanded admin controls"],
      custom: ["Your selected modules", "Flexible billing", "Dedicated account manager", "Priority support", "Custom onboarding"],
    };
    const planKey = String(planCode || "starter").toLowerCase();
    const features = PLAN_FEATURES[planKey] || PLAN_FEATURES.starter;
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app"}/dashboard`;
    const uc = await prisma.userCompany.findFirst({
      where: { companyId, user: { role: { in: ["ADMIN", "OWNER"] } } },
      include: { user: { select: { name: true, email: true } } },
    });
    if (uc?.user?.email) {
      await sendEmail({
        to: uc.user.email,
        subject: `Welcome to FinovaOS! Your ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan is active`,
        html: emailTemplates.welcomeSubscription(uc.user.name || "there", planKey, features, dashboardUrl),
        companyId,
      });
    }
  } catch {}
}

async function handleLemonWebhook(req: NextRequest, raw: string) {
  const signature = req.headers.get("x-signature");
  if (!verifyLemonSignature(raw, signature)) {
    return apiError("Invalid Lemon Squeezy signature", 400);
  }

  const payload = JSON.parse(raw);
  const meta = payload?.meta || {};
  const eventName = String(meta?.event_name || "");
  const attrs = payload?.data?.attributes || {};
  const custom = attrs?.custom_data || attrs?.first_subscription_item?.custom_data || {};

  const companyId = String(custom?.company_id || attrs?.custom_data?.company_id || "").trim();
  const planCode = String(custom?.plan_code || attrs?.product_name || "STARTER").toUpperCase();
  const billingCycle = String(custom?.billing_cycle || attrs?.billing_anchor || "MONTHLY").toUpperCase();
  const displayCurrency = custom?.display_currency ? String(custom.display_currency).toUpperCase() : null;
  const displayCountry = custom?.display_country ? String(custom.display_country).toUpperCase() : null;

  if (eventName.startsWith("subscription_") && companyId) {
    const status = mapLemonSubscriptionStatus(String(attrs?.status || ""));
    const currentPeriodEnd = safeDate(attrs?.renews_at || attrs?.ends_at || attrs?.trial_ends_at);
    const customerId = attrs?.customer_id ? String(attrs.customer_id) : null;
    const subscriptionId = payload?.data?.id ? String(payload.data.id) : null;

    await applySuccessfulPlanUpdate({
      companyId,
      planCode,
      status,
      providerCustomerId: customerId,
      providerSubscriptionId: subscriptionId,
      currentPeriodEnd,
      billingCycle,
      displayCurrency,
      displayCountry,
      invoiceAmount: typeof attrs?.subtotal === "number" ? Number(attrs.subtotal) / 100 : null,
    });

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: null,
        action: "LEMON_SUBSCRIPTION_EVENT",
        details: JSON.stringify({
          eventName,
          planCode,
          status,
          subscriptionId,
          customerId,
          currentPeriodEnd: currentPeriodEnd?.toISOString() || null,
        }),
      },
    }).catch(() => {});

    if (eventName === "subscription_created" && (status === "ACTIVE" || status === "TRIALING")) {
      await sendWelcomeSubscriptionEmail(companyId, planCode);
    }
  }

  if ((eventName === "order_created" || eventName === "subscription_payment_success") && companyId) {
    await prisma.activityLog.create({
      data: {
        companyId,
        userId: null,
        action: "PAYMENT_EVENT",
        details: JSON.stringify({
          provider: "LEMON_SQUEEZY",
          eventName,
          amount: attrs?.subtotal ?? attrs?.total ?? null,
          currency: attrs?.currency || "USD",
          orderId: payload?.data?.id || null,
        }),
      },
    }).catch(() => {});
  }

  return apiOk({ received: true, provider: "lemonsqueezy" });
}

async function handleStripeWebhook(req: NextRequest, raw: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return apiError("Stripe webhook not configured", 500);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return apiError("Missing Stripe-Signature", 400);

  const parts = sig.split(",").map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith("t=")) || "";
  const v1Part = parts.find((p) => p.startsWith("v1=")) || "";
  const ts = Number(tPart.replace("t=", ""));
  const v1 = v1Part.replace("v1=", "");
  if (!ts || !v1) return apiError("Invalid Stripe-Signature", 400);

  const signedPayload = `${ts}.${raw}`;
  const expected = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
  const isValid = timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  const toleranceMs = 5 * 60 * 1000;
  if (!isValid || Math.abs(Date.now() - ts * 1000) > toleranceMs) {
    return apiError("Signature verification failed", 400);
  }

  const payload = JSON.parse(raw);
  const type = payload.type;
  const data = payload.data?.object || {};

  if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
    const companyId = data.metadata?.companyId || null;
    const planCode = data.metadata?.planCode || null;
    const stripeCustomerId = data.customer || null;
    const stripeSubscriptionId = data.id || null;
    const currentPeriodEnd = data.current_period_end ? new Date(data.current_period_end * 1000) : null;

    if (companyId) {
      const dbStatus =
        String(data.status || "").toUpperCase() === "ACTIVE" ? "ACTIVE" :
        String(data.status || "").toUpperCase() === "TRIALING" ? "TRIALING" :
        String(data.status || "").toUpperCase() === "PAST_DUE" ? "PAST_DUE" :
        String(data.status || "").toUpperCase() === "CANCELED" ? "CANCELED" :
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
        await sendWelcomeSubscriptionEmail(companyId, String(planCode || "starter"));
      }
    }
  }

  if (type === "customer.subscription.deleted") {
    const companyId = data.metadata?.companyId || null;
    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: { subscriptionStatus: "INACTIVE" },
      });
    }
  }

  return apiOk({ received: true, provider: "stripe" });
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (req.headers.get("x-signature")) {
      return await handleLemonWebhook(req, raw);
    }
    if (req.headers.get("stripe-signature")) {
      return await handleStripeWebhook(req, raw);
    }
    return apiError("Unsupported webhook signature", 400);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
