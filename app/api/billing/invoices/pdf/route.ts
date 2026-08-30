import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { buildBillingInvoicePdfData } from "@/lib/billingInvoice";

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

/**
 * The customer's invoice PDF.
 *
 * Renders through `buildBillingInvoicePdfData`, the same builder the invoice
 * list and the admin's copy of the document use, so all three agree on what an
 * invoice number means.
 *
 * This route used to rebuild the document from the plan's list price and accept
 * only the derived `sub_<companyId>` id. Both were wrong once the PlatformInvoice
 * ledger existed: every real invoice is listed as `inv_<row id>`, so the id test
 * 404'd every download the billing page offered, and the figures it printed came
 * from the price list rather than from the charge. A manual invoice for an
 * offline deal — a multi-year licence paid by bank transfer in rupees — hit both
 * problems at once.
 *
 * The builder resolves ids only within the company that asked, so an id
 * belonging to another tenant simply does not resolve.
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const invoiceId = new URL(req.url).searchParams.get("invoiceId");
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

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
