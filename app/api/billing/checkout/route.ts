import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { apiError, apiOk } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return apiError("Company required", 400);
    }

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    const allowed = await apiHasPermission(userId, userRole, PERMISSIONS.VIEW_SETTINGS, companyId);
    if (!allowed) {
      return apiError("Forbidden", 403);
    }

    const { planCode, priceId, successUrl, cancelUrl } = await req.json();
    if (!planCode || !priceId || !successUrl || !cancelUrl) {
      return apiError("planCode, priceId, successUrl, cancelUrl required", 400);
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return apiError("Stripe not configured", 500);
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { stripeCustomerId: true, name: true },
    });

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    if (company?.stripeCustomerId) {
      params.append("customer", company.stripeCustomerId);
    }
    params.append("metadata[companyId]", companyId);
    params.append("metadata[planCode]", planCode);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      return apiError("Stripe error", 500, text);
    }

    const session = await res.json();
    return apiOk({ url: session.url, sessionId: session.id });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
