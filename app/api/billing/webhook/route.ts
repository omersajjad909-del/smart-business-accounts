import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk } from "@/lib/apiError";
import { createHmac, timingSafeEqual } from "crypto";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/emailTemplates";

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return apiError("Stripe webhook not configured", 500);
    }

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return apiError("Missing Stripe-Signature", 400);
    }

    const raw = await req.text();
    const parts = sig.split(",").map((p) => p.trim());
    const tPart = parts.find((p) => p.startsWith("t=")) || "";
    const v1Part = parts.find((p) => p.startsWith("v1=")) || "";
    const ts = Number(tPart.replace("t=", ""));
    const v1 = v1Part.replace("v1=", "");
    if (!ts || !v1) {
      return apiError("Invalid Stripe-Signature", 400);
    }
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
      const status = (data.status || "active").toUpperCase();
      const currentPeriodEnd = data.current_period_end ? new Date(data.current_period_end * 1000) : null;

      if (companyId) {
        // Map Stripe status → our DB status properly
        const dbStatus =
          status === "ACTIVE"   ? "ACTIVE"   :
          status === "TRIALING" ? "TRIALING" :
          status === "PAST_DUE" ? "PAST_DUE" :
          status === "CANCELED" ? "CANCELED" :
          "INACTIVE";

        await prisma.company.update({
          where: { id: companyId },
          data: {
            stripeCustomerId: stripeCustomerId || undefined,
            subscriptionStatus: dbStatus,
            plan: planCode || undefined,
            currentPeriodEnd: currentPeriodEnd || undefined,
          },
        });
        await prisma.subscription.upsert({
          where: { companyId },
          update: {
            stripeCustomerId: stripeCustomerId || undefined,
            stripeSubscriptionId: stripeSubscriptionId || undefined,
            status: dbStatus,
            plan: String(planCode || "STARTER").toUpperCase(),
            currentPeriodEnd: currentPeriodEnd || undefined,
          },
          create: {
            companyId,
            stripeCustomerId: stripeCustomerId || undefined,
            stripeSubscriptionId: stripeSubscriptionId || undefined,
            status: dbStatus,
            plan: String(planCode || "STARTER").toUpperCase(),
            currentPeriodEnd: currentPeriodEnd || undefined,
          },
        });

        // ── Send welcome email on new subscription ──────────────────────────
        if (type === "customer.subscription.created" && (dbStatus === "ACTIVE" || dbStatus === "TRIALING")) {
          try {
            const PLAN_FEATURES: Record<string, string[]> = {
              starter:    ["Up to 5 users", "Basic accounting", "Sales & purchase invoices", "Chart of accounts", "Bank reconciliation", "Basic reports", "Email support"],
              pro:        ["Up to 20 users", "Advanced accounting", "Multi-branch support", "Inventory management", "Financial reports", "Expense management", "Payment reconciliation", "Priority support", "Audit logging"],
              enterprise: ["Unlimited users", "Full accounting suite", "Advanced inventory", "Custom reports", "Guided onboarding", "Custom integrations", "Implementation planning", "Advanced audit trails", "Expanded admin controls"],
              custom:     ["Your selected modules", "Flexible billing", "Dedicated account manager", "Priority support", "Custom onboarding"],
            };
            const planKey = String(planCode || "starter").toLowerCase();
            const features = PLAN_FEATURES[planKey] || PLAN_FEATURES.starter;
            const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://usefinova.app"}/dashboard`;

            // Find admin user of this company
            const uc = await prisma.userCompany.findFirst({
              where: { companyId, user: { role: { in: ["ADMIN", "OWNER"] } } },
              include: { user: { select: { name: true, email: true } } },
            });
            if (uc?.user?.email) {
              await sendEmail({
                to: uc.user.email,
                subject: `Welcome to Finova! Your ${planKey.charAt(0).toUpperCase()+planKey.slice(1)} plan is active 🎉`,
                html: emailTemplates.welcomeSubscription(uc.user.name || "there", planKey, features, dashboardUrl),
                companyId,
              });
            }
          } catch { /* non-blocking — don't fail webhook */ }
        }
      }
    }

    if (type === "customer.subscription.deleted") {
      const dataObj = payload.data?.object || {};
      const companyId = dataObj.metadata?.companyId || null;
      if (companyId) {
        await prisma.company.update({
          where: { id: companyId },
          data: { subscriptionStatus: "INACTIVE" },
        });
      }
    }

    if (type === "invoice.payment_succeeded" || type === "invoice.payment_failed") {
      const inv = data || {};
      const stripeCustomerId = inv.customer || null;
      let companyId: string | null = inv.metadata?.companyId || null;
      if (!companyId && stripeCustomerId) {
        const comp = await prisma.company.findFirst({ where: { stripeCustomerId }, select: { id: true } });
        companyId = comp?.id || null;
      }
      try {
        const discountOnInvoice = Number(inv?.total_discount_amounts?.[0]?.amount || inv?.discount_amounts?.[0]?.amount || 0);
        if (type === "invoice.payment_succeeded" && companyId && discountOnInvoice > 0) {
          const existingClaim = await prisma.activityLog.findFirst({
            where: { companyId, action: "BILLING_OFFER_CLAIM" },
            select: { id: true },
          });
          if (!existingClaim) {
            await prisma.activityLog.create({
              data: {
                companyId,
                userId: null,
                action: "BILLING_OFFER_CLAIM",
                details: JSON.stringify({
                  source: "invoice.payment_succeeded",
                  stripeInvoiceId: inv.id || null,
                  stripeCustomerId,
                  amountDiscount: discountOnInvoice,
                  currency: String(inv.currency || "usd").toUpperCase(),
                  claimedAt: new Date().toISOString(),
                }),
              },
            });
          }
        }

        // Store in PaymentEvent if model exists (post-migration)
        try {
          const pe = (prisma as any).paymentEvent;
          if (pe && pe.create) {
            await pe.create({
              data: {
                companyId: companyId || undefined,
                status: type === "invoice.payment_succeeded" ? "succeeded" : "failed",
                amount: Number(inv.amount_paid || inv.amount_due || 0),
                currency: String(inv.currency || "usd").toUpperCase(),
                occurredAt: new Date(),
                raw: JSON.stringify(inv),
              },
            });
          }
        } catch {}
        if (companyId) {
          await prisma.activityLog.create({
            data: {
              companyId,
              userId: null,
              action: "PAYMENT_EVENT",
              details: JSON.stringify({
                status: type === "invoice.payment_succeeded" ? "succeeded" : "failed",
                amount_paid: inv.amount_paid || inv.amount_due || 0,
                currency: (inv.currency || "usd").toUpperCase(),
                invoice_id: inv.id || null,
                subscription: inv.subscription || null,
                customer: stripeCustomerId,
                paid_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000) : new Date(),
              }),
            },
          });
        }
      } catch {}
    }

    if (type === "checkout.session.completed") {
      const session = data || {};
      const companyId = session.metadata?.companyId || null;
      const amountDiscount = Number(session?.total_details?.amount_discount || 0);
      const usedIntroOffer = amountDiscount > 0;

      if (companyId && usedIntroOffer) {
        const alreadyClaimed = await prisma.activityLog.findFirst({
          where: { companyId, action: "BILLING_OFFER_CLAIM" },
          select: { id: true },
        });

        if (!alreadyClaimed) {
          await prisma.activityLog.create({
            data: {
              companyId,
              userId: null,
              action: "BILLING_OFFER_CLAIM",
              details: JSON.stringify({
                stripeCheckoutSessionId: session.id || null,
                stripeCustomerId: session.customer || null,
                amountDiscount,
                currency: String(session.currency || "usd").toUpperCase(),
                claimedAt: new Date().toISOString(),
              }),
            },
          });
        }
      }
    }

    return apiOk({ received: true });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
