import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Canonical prices — monthly and yearly (annual plan total, with 20% discount baked in)
// yearly = per-month-yearly-price × 12
// e.g. Starter: $39/mo × 12 = $468/yr (vs $588 if paying monthly)
const DEFAULT_PRICING = {
  starter:    { monthly: 49, yearly: 468  },   // $39/mo × 12
  pro:        { monthly: 99, yearly: 948  },   // $79/mo × 12
  enterprise: { monthly: 249, yearly: 2388 },  // $199/mo × 12
};

const DEFAULT_PLAN_LIMITS = {
  starter: 3,
  pro: 10,
  enterprise: 25,
};
const DEFAULT_SEAT_PRICING = {
  monthly: 7,
  yearly: 72, // yearly annual total (6/mo equivalent)
};

export async function GET() {
  try {
    const latest = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG" },
      orderBy: { createdAt: "desc" },
    });

    if (!latest?.details) {
      return NextResponse.json({
        pricing: DEFAULT_PRICING,
        planLimits: DEFAULT_PLAN_LIMITS,
        seatPricing: DEFAULT_SEAT_PRICING,
        features: null,
        featureMatrix: null,
        updatedAt: null,
      });
    }

    const payload = JSON.parse(latest.details);
    const adminPricing = payload?.pricing;

    if (adminPricing) {
      // Admin stores per-month yearly price → convert to annual total for public API
      const pricing = {
        starter:    { monthly: adminPricing.starter?.monthly    ?? 49,  yearly: (adminPricing.starter?.yearly    ?? 39)  * 12 },
        pro:        { monthly: adminPricing.pro?.monthly        ?? 99,  yearly: (adminPricing.pro?.yearly        ?? 79)  * 12 },
        enterprise: { monthly: adminPricing.enterprise?.monthly ?? 249, yearly: (adminPricing.enterprise?.yearly ?? 199) * 12 },
      };
      return NextResponse.json({
        pricing,
        planLimits: payload?.planLimits ?? DEFAULT_PLAN_LIMITS,
        seatPricing: payload?.seatPricing
          ? {
              monthly: Number(payload.seatPricing?.monthly ?? DEFAULT_SEAT_PRICING.monthly),
              yearly: Number(payload.seatPricing?.yearly ?? 6) * 12,
            }
          : DEFAULT_SEAT_PRICING,
        features: payload?.features ?? null,
        featureMatrix: payload?.featureMatrix ?? null,
        updatedAt: latest.createdAt,
      });
    }

    return NextResponse.json({
      pricing: DEFAULT_PRICING,
      planLimits: DEFAULT_PLAN_LIMITS,
      seatPricing: DEFAULT_SEAT_PRICING,
      features: null,
      featureMatrix: null,
      updatedAt: latest.createdAt,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { pricing: DEFAULT_PRICING, planLimits: DEFAULT_PLAN_LIMITS, seatPricing: DEFAULT_SEAT_PRICING, error: e instanceof Error ? e.message : "unknown" },
      { status: 200 },
    );
  }
}
