import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk } from "@/lib/apiError";
import { createHmac, timingSafeEqual } from "crypto";

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
        await prisma.company.update({
          where: { id: companyId },
          data: {
            stripeCustomerId: stripeCustomerId || undefined,
            stripeSubscriptionId: stripeSubscriptionId || undefined,
            subscriptionStatus: status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
            plan: planCode || undefined,
            currentPeriodEnd: currentPeriodEnd || undefined,
          },
        });
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

    return apiOk({ received: true });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
