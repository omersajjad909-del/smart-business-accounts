import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { buildHostedBillingInvoice, verifyBillingInvoiceAccessToken } from "@/lib/billingInvoice";

export const runtime = "nodejs";

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

    const invoice = await buildHostedBillingInvoice(companyId);
    if (!invoice || invoiceId !== invoice.invoiceId) {
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
