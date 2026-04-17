import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";
import { apiError, apiOk } from "@/lib/apiError";
import { getRuntimeAppUrl } from "@/lib/domains";
import { createLemonCheckout, hasLemonSqueezyConfig } from "@/lib/lemonsqueezy";
import { getCompanyExtraSeats } from "@/lib/companySeatLimit";

const DEFAULT_SEAT_PRICING = { monthly: 7, yearly: 6 };

async function getSeatPricing(): Promise<{ monthly: number; yearly: number }> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG" },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    if (log?.details) {
      const cfg = JSON.parse(log.details);
      if (cfg?.seatPricing) return { monthly: Number(cfg.seatPricing.monthly ?? 7), yearly: Number(cfg.seatPricing.yearly ?? 6) };
    }
  } catch {}
  return DEFAULT_SEAT_PRICING;
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return apiError("Company required", 400);

    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (userRole?.toUpperCase() !== "ADMIN") return apiError("Forbidden", 403);

    const body = await req.json();
    const addSeats = Math.max(1, Math.floor(Number(body?.addSeats || 1)));
    const billingCycle = String(body?.billingCycle || "MONTHLY").toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, plan: true, subscriptionStatus: true },
    });
    if (!company) return apiError("Company not found", 404);

    const seatPricing = await getSeatPricing();
    const pricePerSeatPerMonth = billingCycle === "YEARLY" ? seatPricing.yearly : seatPricing.monthly;
    const cycleAmount = billingCycle === "YEARLY" ? pricePerSeatPerMonth * addSeats * 12 : pricePerSeatPerMonth * addSeats;

    const currentExtraSeats = await getCompanyExtraSeats(companyId);
    const newTotalExtraSeats = currentExtraSeats + addSeats;

    if (hasLemonSqueezyConfig()) {
      const base = getRuntimeAppUrl(req.nextUrl.origin);
      const user = userId
        ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
        : null;

      const checkout = await createLemonCheckout({
        planCode: "SEAT_ADDON",
        billingCycle,
        successUrl: `${base}/dashboard/billing?seats=added&qty=${addSeats}`,
        cancelUrl: `${base}/dashboard/billing`,
        companyId,
        userId,
        email: user?.email || null,
        name: user?.name || company.name,
        couponCode: null,
        displayCurrency: null,
        displayCountry: null,
        customPriceUsd: cycleAmount,
      });

      await prisma.activityLog.create({
        data: {
          companyId, userId: userId || null,
          action: "SEAT_CHECKOUT_CREATED",
          details: JSON.stringify({ addSeats, billingCycle, cycleAmount, pricePerSeatPerMonth, checkoutId: checkout.checkoutId }),
        },
      }).catch(() => {});

      return apiOk({ url: checkout.url, provider: "lemonsqueezy", checkoutId: checkout.checkoutId });
    }

    // Direct fallback — activate immediately
    await prisma.activityLog.create({
      data: {
        companyId, userId: userId || null,
        action: "ADMIN_SEAT_OVERRIDE",
        details: JSON.stringify({ extraSeats: newTotalExtraSeats, addedSeats: addSeats, billingCycle, pricePerSeatPerMonth, cycleAmount, activatedAt: new Date().toISOString() }),
      },
    });

    await prisma.activityLog.create({
      data: {
        companyId, userId: userId || null,
        action: "SEAT_PURCHASE",
        details: JSON.stringify({ addSeats, newTotalExtraSeats, billingCycle, cycleAmount, provider: "DIRECT_FALLBACK" }),
      },
    }).catch(() => {});

    const base = getRuntimeAppUrl(req.nextUrl.origin);
    return apiOk({
      url: `${base}/dashboard/billing?seats=added&qty=${addSeats}`,
      activated: true,
      newTotalExtraSeats,
    });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return apiError("Company required", 400);

    const extraSeats = await getCompanyExtraSeats(companyId);
    const seatPricing = await getSeatPricing();
    return apiOk({ extraSeats, seatPricing });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
