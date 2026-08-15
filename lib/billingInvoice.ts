import { signJwt, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLAN_PRICES: Record<string, number> = {
  STARTER: 49,
  PROFESSIONAL: 99,
  PRO: 99,
  ENTERPRISE: 249,
  CUSTOM: 0,
};

/**
 * Lemon Squeezy fires BOTH `order_created` and `subscription_payment_success`
 * for a single card charge, and the two events carry different ids (the order
 * id vs the subscription-invoice id) — so they cannot be deduped on id alone.
 * Two events for the same amount + currency, from *different* event names,
 * inside this window are one charge. Two events with the SAME name are a
 * genuine double charge and must both stay visible.
 */
export const PAYMENT_EVENT_DEDUPE_WINDOW_MS = 60 * 60 * 1000;

export type BillingInvoice = {
  id: string;
  number: string;
  /** Display date, "Aug 15, 2026". */
  date: string;
  issuedAt: Date;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  plan: string;
  billingCycle: string;
  /** True for a row derived from the plan's list price, not a recorded charge. */
  derived: boolean;
};

export function parsePaymentEventDetails(details: string | null | undefined): any {
  try {
    return details ? JSON.parse(details) : null;
  } catch {
    return null;
  }
}

/**
 * True when `candidate` is the second webhook for a charge already recorded by
 * `existing` — same money, different event name, close together in time.
 */
export function isSameCardCharge(
  existing: { eventName?: string | null; amount: number; currency: string; at: Date },
  candidate: { eventName?: string | null; amount: number; currency: string; at: Date },
) {
  if (existing.amount !== candidate.amount) return false;
  if (existing.currency !== candidate.currency) return false;
  const existingEvent = String(existing.eventName || "");
  const candidateEvent = String(candidate.eventName || "");
  if (!existingEvent || !candidateEvent || existingEvent === candidateEvent) return false;
  return Math.abs(existing.at.getTime() - candidate.at.getTime()) <= PAYMENT_EVENT_DEDUPE_WINDOW_MS;
}

function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function formatInvoiceDate(value: Date) {
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildInvoiceStatus(status?: string | null): BillingInvoice["status"] {
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

export function getHostedBillingInvoiceId(companyId: string) {
  return `sub_${companyId}`;
}

export function createBillingInvoiceAccessToken(companyId: string, invoiceId = getHostedBillingInvoiceId(companyId)) {
  return signJwt({
    type: "billing_invoice_access",
    companyId,
    invoiceId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
}

export function verifyBillingInvoiceAccessToken(token: string) {
  const payload = verifyJwt(token);
  if (!payload) return null;
  if (payload.type !== "billing_invoice_access") return null;
  if (typeof payload.companyId !== "string" || typeof payload.invoiceId !== "string") return null;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return {
    companyId: payload.companyId,
    invoiceId: payload.invoiceId,
  };
}

type BillingContext = {
  company: { name: string; plan: string | null; subscriptionStatus: string | null; currentPeriodEnd: Date | null; createdAt: Date };
  effectivePlan: string;
  billingCycle: string;
  currency: string;
  status: string;
  invoices: BillingInvoice[];
};

/**
 * The company's billing history, built once and shared by the invoice list API
 * and the PDF route so an invoice number, amount and id always mean the same
 * thing in both places.
 */
export async function getCompanyBillingContext(companyId: string): Promise<BillingContext | null> {
  const [company, subscription] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        createdAt: true,
      },
    }),
    prisma.subscription.findUnique({
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
    }),
  ]);

  if (!company) return null;

  const effectivePlan = (subscription?.plan || company.plan || "STARTER").toUpperCase();
  const effectiveStatus = subscription?.status || company.subscriptionStatus || "ACTIVE";
  const cycle = (subscription?.billingCycle || "MONTHLY").toUpperCase();
  // `pricePerMonth` is stored in whatever currency the provider actually
  // settles in — Safepay always settles in PKR, but LemonSqueezy (and Stripe)
  // always settle in USD regardless of what was *displayed* during checkout.
  // Using company.baseCurrency here paired the real USD amount with a "PKR"
  // label for every Pakistani company.
  const currency = subscription?.provider === "SAFEPAY" ? "PKR" : "USD";

  const base: Omit<BillingContext, "invoices"> = {
    company,
    effectivePlan,
    billingCycle: cycle,
    currency,
    status: effectiveStatus,
  };

  if (!effectiveStatus || effectiveStatus.toUpperCase() === "INACTIVE") {
    return { ...base, invoices: [] };
  }

  // Real charges, when we have them. Deriving the amount from the plan's list
  // price alone showed a $49.00 paid invoice to a customer whose card was
  // actually charged $7.14 — a receipt that disagrees with their statement.
  const paymentLogs = await prisma.activityLog.findMany({
    where: { companyId, action: "PAYMENT_EVENT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, details: true },
    take: 50,
  }).catch(() => []);

  const charges: { id: string; at: Date; amount: number; currency: string; eventName: string }[] = [];
  for (const log of paymentLogs) {
    const det = parsePaymentEventDetails(log.details);
    const minorUnits = Number(det?.amount ?? det?.amount_paid ?? 0);
    if (!Number.isFinite(minorUnits) || minorUnits <= 0) continue;

    const candidate = {
      id: log.id,
      at: log.createdAt,
      amount: minorUnits,
      currency: String(det?.currency || currency).toUpperCase(),
      eventName: String(det?.eventName || ""),
    };

    // Guards against rows written before the webhook learned to collapse the
    // order_created / subscription_payment_success pair itself.
    if (charges.some((kept) => isSameCardCharge(kept, candidate))) continue;
    charges.push(candidate);
  }

  const invoices: BillingInvoice[] = charges.map((charge, i) => ({
    id: `pay_${charge.id}`,
    number: `INV-${charge.at.getFullYear()}-${String(charges.length - i).padStart(3, "0")}`,
    date: formatInvoiceDate(charge.at),
    issuedAt: charge.at,
    amount: charge.amount / 100,
    currency: charge.currency,
    status: "paid",
    plan: effectivePlan,
    billingCycle: cycle,
    derived: false,
  }));

  if (invoices.length > 0) return { ...base, invoices };

  // Fallback: an active subscription with no payment logged yet.
  const baseAmount = subscription?.pricePerMonth || PLAN_PRICES[effectivePlan] || 0;
  const amount = cycle === "YEARLY" ? Math.round(baseAmount * 12) : baseAmount;
  const periodEnd = subscription?.currentPeriodEnd || company.currentPeriodEnd || company.createdAt;
  const periodStart = subscription?.currentPeriodStart || subscription?.createdAt || company.createdAt;

  return {
    ...base,
    invoices: [
      {
        id: getHostedBillingInvoiceId(companyId),
        number: `INV-${new Date(periodStart).getFullYear()}-001`,
        date: formatInvoiceDate(new Date(periodEnd)),
        issuedAt: new Date(periodEnd),
        amount,
        currency,
        status: buildInvoiceStatus(effectiveStatus),
        plan: effectivePlan,
        billingCycle: cycle,
        derived: true,
      },
    ],
  };
}

/**
 * PDF payload for one invoice id. Returns null when the id does not belong to
 * this company, so the caller can 404 without leaking another tenant's billing.
 */
export async function buildBillingInvoicePdfData(companyId: string, invoiceId: string) {
  const ctx = await getCompanyBillingContext(companyId);
  if (!ctx) return null;

  const invoice =
    ctx.invoices.find((inv) => inv.id === invoiceId) ??
    // A receipt emailed before the payment webhook landed links to the derived
    // id; once the real charge is recorded that id disappears from the list.
    // Fall back to the newest invoice rather than 404-ing a valid receipt link.
    (invoiceId === getHostedBillingInvoiceId(companyId) ? ctx.invoices[0] : undefined);

  if (!invoice) return null;

  const standardBase = PLAN_PRICES[invoice.plan] || 0;
  const standardAmount = invoice.billingCycle === "YEARLY" ? Math.round(standardBase * 12) : standardBase;
  // Only a derived invoice can claim a discount: for a recorded charge the
  // amount taken IS the line total. Comparing a PKR-region charge against the
  // USD list price otherwise invented a "50% off" line that was never applied.
  const discount = invoice.derived ? Math.max(0, standardAmount - invoice.amount) : 0;
  const subtotal = invoice.derived ? standardAmount : invoice.amount;

  return {
    invoiceNumber: invoice.number,
    pdfData: {
      invoiceNumber: invoice.number,
      invoiceDate: fmtDate(invoice.issuedAt),
      dueDate: "",
      companyName: "Finova Forge",
      companyAddress: "FinovaOS, Business Suite",
      companyPhone: process.env.SUPPORT_PHONE || "",
      companyEmail: process.env.SUPPORT_EMAIL || "support@finovaforge.com",
      customerName: ctx.company.name,
      customerAddress: "",
      customerPhone: "",
      items: [
        {
          name: `${invoice.plan} subscription (${invoice.billingCycle.toLowerCase()})`,
          qty: 1,
          rate: subtotal,
          amount: subtotal,
        },
      ],
      subtotal,
      tax: 0,
      discount,
      total: invoice.amount,
      currency: invoice.currency,
      notes: discount > 0
        ? "Subscription invoice for FinovaOS hosted billing. Launch offer applied: 50% off for first 3 months."
        : "Subscription invoice for FinovaOS hosted billing.",
      status: invoice.status === "paid" ? "PAID" : "OPEN",
    },
  };
}
