import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk } from "@/lib/apiError";

const PLAN_PRICES: Record<string, number> = {
  STARTER: 49,
  PROFESSIONAL: 99,
  PRO: 99,
  ENTERPRISE: 249,
  CUSTOM: 0,
};

function formatInvoiceDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildInvoiceStatus(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
    case "PAID":
    case "TRIALING":
      return "paid";
    case "PAST_DUE":
    case "UNPAID":
      return "open";
    case "CANCELED":
    case "CANCELLED":
      return "void";
    default:
      return "open";
  }
}

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) return apiError("Company required", 400);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        createdAt: true,
        baseCurrency: true,
      },
    });

    if (!company) return apiError("Company not found", 404);

    const subscription = await prisma.subscription.findUnique({
      where: { companyId },
      select: {
        plan: true,
        status: true,
        billingCycle: true,
        pricePerMonth: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        createdAt: true,
      },
    });

    const effectivePlan = (subscription?.plan || company.plan || "STARTER").toUpperCase();
    const effectiveStatus = subscription?.status || company.subscriptionStatus || "ACTIVE";
    const cycle = (subscription?.billingCycle || "MONTHLY").toUpperCase();
    const currency = company.baseCurrency || "USD";
    const baseAmount = subscription?.pricePerMonth || PLAN_PRICES[effectivePlan] || 0;
    const amount = cycle === "YEARLY" ? Math.round(baseAmount * 12) : baseAmount;
    const periodEnd =
      subscription?.currentPeriodEnd || company.currentPeriodEnd || company.createdAt;
    const periodStart = subscription?.currentPeriodStart || subscription?.createdAt || company.createdAt;

    if (!effectiveStatus || effectiveStatus.toUpperCase() === "INACTIVE") {
      return apiOk({ invoices: [] });
    }

    return apiOk({
      invoices: [
        {
          id: `sub_${companyId}`,
          number: `INV-${new Date(periodStart).getFullYear()}-001`,
          date: formatInvoiceDate(new Date(periodEnd)),
          amount,
          currency,
          status: buildInvoiceStatus(effectiveStatus),
          plan: effectivePlan,
          billingCycle: cycle,
        },
      ],
    });
  } catch (err) {
    console.error("[billing/invoices] Unexpected error:", err);
    return apiError("Failed to fetch invoices", 500);
  }
}
