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

function parsePaymentDetails(details: string | null) {
  try {
    return details ? JSON.parse(details) : null;
  } catch {
    return null;
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
        provider: true,
      },
    });

    const effectivePlan = (subscription?.plan || company.plan || "STARTER").toUpperCase();
    const effectiveStatus = subscription?.status || company.subscriptionStatus || "ACTIVE";
    const cycle = (subscription?.billingCycle || "MONTHLY").toUpperCase();
    // `pricePerMonth` is stored in whatever currency the provider actually
    // settles in — Safepay always settles in PKR, but LemonSqueezy (and
    // Stripe) always settle in USD regardless of what was *displayed* during
    // checkout. Using company.baseCurrency here paired the real USD amount
    // with a "PKR" label for every Pakistani company, showing e.g. "PKR 249"
    // for what was actually a $249 charge.
    const currency = subscription?.provider === "SAFEPAY" ? "PKR" : "USD";
    const baseAmount = subscription?.pricePerMonth || PLAN_PRICES[effectivePlan] || 0;
    const amount = cycle === "YEARLY" ? Math.round(baseAmount * 12) : baseAmount;
    const periodEnd =
      subscription?.currentPeriodEnd || company.currentPeriodEnd || company.createdAt;
    const periodStart = subscription?.currentPeriodStart || subscription?.createdAt || company.createdAt;

    if (!effectiveStatus || effectiveStatus.toUpperCase() === "INACTIVE") {
      return apiOk({ invoices: [] });
    }

    // Real charges, when we have them.
    //
    // Everything above only *derives* an amount from the plan's list price, so a
    // customer who paid $24.50 with the launch discount was shown a $49.00 paid
    // invoice — a receipt that disagrees with their card statement. The webhook
    // already records what Lemon Squeezy actually took, so prefer that and keep
    // the derived row only as a fallback for a subscription with no payment
    // logged yet.
    const paymentLogs = await prisma.activityLog.findMany({
      where: { companyId, action: "PAYMENT_EVENT" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, details: true },
      take: 50,
    }).catch(() => []);

    const invoiceSourceLogs = new Map<string, { log: (typeof paymentLogs)[number]; details: any }>();
    for (const log of paymentLogs) {
      const det = parsePaymentDetails(log.details);
      const minorUnits = Number(det?.amount ?? det?.amount_paid ?? 0);
      if (!Number.isFinite(minorUnits) || minorUnits <= 0) continue;

      // Lemon Squeezy can send both order_created and subscription_payment_success
      // for one card charge. The order id is the shared receipt key.
      const dedupeKey =
        String(det?.orderId || det?.order_id || det?.subscriptionId || log.id).trim() || log.id;
      if (!invoiceSourceLogs.has(dedupeKey)) {
        invoiceSourceLogs.set(dedupeKey, { log, details: det });
      }
    }

    const realInvoices = Array.from(invoiceSourceLogs.values()).map(({ log, details: det }, i) => {
      const minorUnits = Number(det?.amount ?? det?.amount_paid ?? 0);
      return {
        id: `pay_${log.id}`,
        paymentKey: String(det?.orderId || det?.order_id || det?.subscriptionId || log.id),
        number: `INV-${log.createdAt.getFullYear()}-${String(invoiceSourceLogs.size - i).padStart(3, "0")}`,
        date: formatInvoiceDate(log.createdAt),
        amount: minorUnits / 100,
        currency: String(det?.currency || currency).toUpperCase(),
        status: "paid" as const,
        plan: effectivePlan,
        billingCycle: cycle,
      };
    });

    if (realInvoices.length > 0) {
      return apiOk({ invoices: realInvoices });
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
