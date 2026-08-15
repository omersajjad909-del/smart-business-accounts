import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { buildBillingInvoicePdfData, verifyBillingInvoiceAccessToken } from "@/lib/billingInvoice";

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

    // Receipt emails link here with a signed token instead of a session — the
    // route used to ignore `token` entirely, so every emailed PDF link failed.
    const token = url.searchParams.get("token");
    const tokenGrant = token ? verifyBillingInvoiceAccessToken(token) : null;

    const companyId = tokenGrant?.companyId || (await resolveCompanyId(req));
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    // A token authorises exactly the invoice it was minted for.
    if (tokenGrant && tokenGrant.invoiceId !== invoiceId) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Resolves both `pay_<paymentLogId>` (a recorded charge) and
    // `sub_<companyId>` (the derived row / older emailed links). Previously
    // only the derived id was accepted, so the PDF button on every real
    // invoice row returned "Invoice not found".
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
