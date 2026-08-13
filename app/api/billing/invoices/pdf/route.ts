import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { buildHostedBillingInvoice, verifyBillingInvoiceAccessToken } from "@/lib/billingInvoice";

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

function fmtDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function parsePaymentDetails(details: string | null) {
  try {
    return details ? JSON.parse(details) : null;
  } catch {
    return null;
  }
}

async function buildPaymentLogInvoice(companyId: string, invoiceId: string) {
  if (!invoiceId.startsWith("pay_")) return null;

  const [company, subscription, logs] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, plan: true },
    }),
    prisma.subscription.findUnique({
      where: { companyId },
      select: { plan: true, billingCycle: true },
    }),
    prisma.activityLog.findMany({
      where: { companyId, action: "PAYMENT_EVENT" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, details: true },
      take: 50,
    }).catch(() => []),
  ]);

  if (!company) return null;

  const invoiceSources: Array<{
    log: (typeof logs)[number];
    details: any;
    key: string;
  }> = [];
  const seen = new Set<string>();

  for (const log of logs) {
    const details = parsePaymentDetails(log.details);
    const minorUnits = Number(details?.amount ?? details?.amount_paid ?? 0);
    if (!Number.isFinite(minorUnits) || minorUnits <= 0) continue;

    const key =
      String(details?.orderId || details?.order_id || details?.subscriptionId || log.id).trim() || log.id;
    if (seen.has(key)) continue;
    seen.add(key);
    invoiceSources.push({ log, details, key });
  }

  const match = invoiceSources.find(({ log, key }) => invoiceId === `pay_${log.id}` || invoiceId === `pay_${key}`);
  if (!match) return null;

  const index = invoiceSources.findIndex(({ log }) => log.id === match.log.id);
  const effectivePlan = (subscription?.plan || company.plan || "STARTER").toUpperCase();
  const cycle = (subscription?.billingCycle || "MONTHLY").toUpperCase();
  const minorUnits = Number(match.details?.amount ?? match.details?.amount_paid ?? 0);
  const total = minorUnits / 100;
  const currency = String(match.details?.currency || "USD").toUpperCase();
  const standardBaseAmount = PLAN_PRICES[effectivePlan] || total;
  const standardAmount = cycle === "YEARLY" ? Math.round(standardBaseAmount * 12) : standardBaseAmount;
  const discount = Math.max(0, standardAmount - total);
  const invoiceNumber = `INV-${match.log.createdAt.getFullYear()}-${String(invoiceSources.length - index).padStart(3, "0")}`;

  return {
    invoiceNumber,
    pdfData: {
      invoiceNumber,
      invoiceDate: fmtDate(match.log.createdAt),
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
          name: `${effectivePlan} subscription (${cycle.toLowerCase()})`,
          qty: 1,
          rate: discount > 0 ? standardAmount : total,
          amount: discount > 0 ? standardAmount : total,
        },
      ],
      subtotal: discount > 0 ? standardAmount : total,
      tax: 0,
      discount,
      total,
      currency,
      notes: discount > 0
        ? "Subscription invoice for FinovaOS hosted billing. Launch offer applied."
        : "Subscription invoice for FinovaOS hosted billing.",
      status: "PAID",
    },
  };
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoiceId");
    const token = url.searchParams.get("token");
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    const tokenPayload = token ? verifyBillingInvoiceAccessToken(token) : null;
    const companyId = tokenPayload?.companyId || (await resolveCompanyId(req));
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    if (token && (!tokenPayload || tokenPayload.invoiceId !== invoiceId)) {
      return NextResponse.json({ error: "Invalid or expired invoice link" }, { status: 401 });
    }

    const paymentLogInvoice = await buildPaymentLogInvoice(companyId, invoiceId);
    const hostedInvoice = paymentLogInvoice ? null : await buildHostedBillingInvoice(companyId);
    const invoice =
      paymentLogInvoice ||
      (hostedInvoice && invoiceId === hostedInvoice.invoiceId ? hostedInvoice : null);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const pdfBuffer = await generateInvoicePdf(invoice.pdfData);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[GET /api/billing/invoices/pdf]", err);
    return NextResponse.json({ error: "Failed to generate invoice PDF" }, { status: 500 });
  }
}
