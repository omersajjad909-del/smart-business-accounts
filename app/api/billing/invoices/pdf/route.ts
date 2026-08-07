import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/invoicePdf";

export const runtime = "nodejs";

const PLAN_PRICES: Record<string, number> = {
  STARTER: 49,
  PROFESSIONAL: 99,
  PRO: 99,
  ENTERPRISE: 249,
  CUSTOM: 0,
};

async function resolveCompanyId(req: NextRequest): Promise<string | null> {
  const companyId = req.headers.get("x-company-id");
  if (companyId) return companyId;

  const userId = req.headers.get("x-user-id");
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultCompanyId: true },
  });
  return user?.defaultCompanyId || null;
}

function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoiceId");
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    if (invoiceId !== `sub_${companyId}`) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const [company, subscription] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          // Company has no address/phone/email/billingCycle fields — selecting
          // them threw a PrismaClientValidationError on every request, which
          // this route's catch block silently turned into the generic
          // "Failed to generate invoice PDF" error. billingCycle lives on
          // Subscription (already queried below and used as the source).
          name: true,
          baseCurrency: true,
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

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const effectivePlan = (subscription?.plan || company.plan || "STARTER").toUpperCase();
    const effectiveBillingCycle = (subscription?.billingCycle || "MONTHLY").toUpperCase();
    const baseAmount = subscription?.pricePerMonth || PLAN_PRICES[effectivePlan] || 0;
    const amount = effectiveBillingCycle === "YEARLY" ? Math.round(baseAmount * 12) : baseAmount;
    const periodEnd = subscription?.currentPeriodEnd || company.currentPeriodEnd || company.createdAt;
    const invoiceNumber = `INV-${new Date(periodEnd).getFullYear()}-001`;

    const pdfData = {
      invoiceNumber,
      invoiceDate: fmtDate(periodEnd),
      dueDate: "",
      companyName: "FinovaOS",
      companyAddress: "FinovaOS, Business Suite",
      companyPhone: process.env.SUPPORT_PHONE || "",
      companyEmail: process.env.SUPPORT_EMAIL || "support@finovaos.app",
      customerName: company.name,
      customerAddress: "",
      customerPhone: "",
      items: [
        {
          name: `${effectivePlan} subscription (${effectiveBillingCycle.toLowerCase()})`,
          qty: 1,
          rate: amount,
          amount,
        },
      ],
      subtotal: amount,
      tax: 0,
      discount: 0,
      total: amount,
      // pricePerMonth is stored in the currency the provider settles in —
      // Safepay in PKR, LemonSqueezy/Stripe always in USD. Labelling it with
      // company.baseCurrency showed "PKR 249" for what was really a $249 charge.
      currency: subscription?.provider === "SAFEPAY" ? "PKR" : "USD",
      notes: "Subscription invoice for FinovaOS hosted billing.",
      status: company.subscriptionStatus?.toUpperCase() === "ACTIVE" ? "PAID" : "OPEN",
    };

    const pdfBuffer = await generateInvoicePdf(pdfData);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceNumber}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[GET /api/billing/invoices/pdf]", err);
    return NextResponse.json({ error: "Failed to generate invoice PDF" }, { status: 500 });
  }
}
