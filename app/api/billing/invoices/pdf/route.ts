import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildBillingInvoicePdfData,
  verifyBillingInvoiceAccessToken,
} from "@/lib/billingInvoice";
import { generateInvoicePdf } from "@/lib/invoicePdf";

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
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    // Browser downloads resolve the company through authenticated headers.
    // Payment-confirmation receipts use a short-lived, invoice-scoped token.
    const access = verifyBillingInvoiceAccessToken(url.searchParams.get("token") || "");
    const requestCompanyId = await resolveCompanyId(req);
    if (access && access.invoiceId !== invoiceId) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (requestCompanyId && access && requestCompanyId !== access.companyId) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const companyId = requestCompanyId || access?.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    // Shared with the invoice-list route. It supports permanent ledger ids
    // (`inv_…`) as well as legacy derived ids (`sub_…`).
    const built = await buildBillingInvoicePdfData(companyId, invoiceId);
    if (!built) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const pdfBuffer = await generateInvoicePdf(built.pdfData);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${built.invoiceNumber}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[GET /api/billing/invoices/pdf]", err);
    return NextResponse.json({ error: "Failed to generate invoice PDF" }, { status: 500 });
  }
}
