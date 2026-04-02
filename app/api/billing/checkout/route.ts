import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiError, apiOk } from "@/lib/apiError";
import { getRuntimeAppUrl } from "@/lib/domains";

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return apiError("Company required", 400);

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (userRole?.toUpperCase() !== "ADMIN") {
      return apiError("Forbidden", 403);
    }

    const body = await req.json();
    const planCode   = String(body?.planCode || "STARTER").toUpperCase();
    const successUrl = String(body?.successUrl || "");
    const couponCode = body?.couponCode ? String(body.couponCode).toUpperCase().trim() : null;
    const displayCurrency = body?.displayCurrency ? String(body.displayCurrency).toUpperCase() : null;
    const displayCountry = body?.displayCountry ? String(body.displayCountry).toUpperCase() : null;

    // ── Activate plan directly (no Stripe) ──────────────────────────────
    await prisma.company.update({
      where: { id: companyId },
      data: {
        plan: planCode,
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ...(displayCurrency ? { baseCurrency: displayCurrency } : {}),
        ...(displayCountry ? { country: displayCountry } : {}),
      },
    });

    await prisma.activityLog.create({
      data: {
        companyId,
        userId: userId || null,
        action: "PLAN_ACTIVATED",
        details: JSON.stringify({
          planCode,
          activatedAt: new Date().toISOString(),
          displayCurrency,
          displayCountry,
        }),
      },
    }).catch(() => {});

    // Record coupon redemption and increment usedCount
    if (couponCode) {
      try {
        const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
        if (coupon && coupon.active) {
          await prisma.$transaction([
            prisma.couponRedemption.create({
              data: { couponId: coupon.id, userId: userId || null, companyId },
            }),
            prisma.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            }),
          ]);
        }
      } catch { /* non-critical */ }
    }

    // Mark referred user as converted
    if (userId) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (user) {
          await prisma.referral.updateMany({
            where: { refereeEmail: user.email, status: "signed_up" },
            data: { status: "converted", convertedAt: new Date(), reward: 20 }, // $20 default reward
          });
        }
      } catch { /* non-critical */ }
    }

    const base = getRuntimeAppUrl(req.nextUrl.origin);
    const redirectUrl = successUrl || `${base}/dashboard/billing?upgrade=success`;
    return apiOk({ url: redirectUrl, sessionId: "direct" });

  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
