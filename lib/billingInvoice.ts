import { signJwt, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLAN_PRICES: Record<string, number> = {
  STARTER: 49,
  PROFESSIONAL: 99,
  PRO: 99,
  ENTERPRISE: 249,
  CUSTOM: 0,
};

function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
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

export async function buildHostedBillingInvoice(companyId: string) {
  const [company, subscription] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        plan: true,
        currentPeriodEnd: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    }),
    prisma.subscription.findUnique({
      where: { companyId },
      select: {
        plan: true,
        billingCycle: true,
        pricePerMonth: true,
        currentPeriodEnd: true,
        provider: true,
      },
    }),
  ]);

  if (!company) return null;

  const effectivePlan = (subscription?.plan || company.plan || "STARTER").toUpperCase();
  const effectiveBillingCycle = (subscription?.billingCycle || "MONTHLY").toUpperCase();
  const paidAmount = subscription?.pricePerMonth || PLAN_PRICES[effectivePlan] || 0;
  const amount = effectiveBillingCycle === "YEARLY" ? Math.round(paidAmount * 12) : paidAmount;
  const standardBaseAmount = PLAN_PRICES[effectivePlan] || 0;
  const standardAmount = effectiveBillingCycle === "YEARLY" ? Math.round(standardBaseAmount * 12) : standardBaseAmount;
  const discount = Math.max(0, standardAmount - amount);
  const periodEnd = subscription?.currentPeriodEnd || company.currentPeriodEnd || company.createdAt;
  const invoiceNumber = `INV-${new Date(periodEnd).getFullYear()}-001`;

  return {
    invoiceId: getHostedBillingInvoiceId(companyId),
    invoiceNumber,
    pdfData: {
      invoiceNumber,
      invoiceDate: fmtDate(periodEnd),
      dueDate: "",
      companyName: "Finova Forge",
      companyAddress: "FinovaOS, Business Suite",
      companyPhone: process.env.SUPPORT_PHONE || "",
      companyEmail: process.env.SUPPORT_EMAIL || "support@finovaforge.com",
      customerName: company.name,
      customerAddress: "",
      customerPhone: "",
      items: [
        {
          name: `${effectivePlan} subscription (${effectiveBillingCycle.toLowerCase()})`,
          qty: 1,
          rate: effectiveBillingCycle === "YEARLY" ? standardAmount : standardBaseAmount,
          amount: standardAmount,
        },
      ],
      subtotal: standardAmount,
      tax: 0,
      discount,
      total: amount,
      currency: subscription?.provider === "SAFEPAY" ? "PKR" : "USD",
      notes: discount > 0
        ? "Subscription invoice for FinovaOS hosted billing. Launch offer applied: 50% off for first 3 months."
        : "Subscription invoice for FinovaOS hosted billing.",
      status: company.subscriptionStatus?.toUpperCase() === "ACTIVE" ? "PAID" : "OPEN",
    },
  };
}
