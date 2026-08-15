import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { buildBillingInvoicePdfData } from "@/lib/billingInvoice";

export const runtime = "nodejs";

/**
 * The customer's own invoice PDF, fetched by an admin.
 *
 * Deliberately renders through the same builder as /api/billing/invoices/pdf
 * rather than re-formatting the row here — support must be looking at the exact
 * document the customer downloaded, not an admin-flavoured copy of it.
 */
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const invoice = await (prisma as any).platformInvoice.findUnique({
      where: { id },
      select: { id: true, companyId: true },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const built = await buildBillingInvoicePdfData(invoice.companyId, `inv_${invoice.id}`);
    if (!built) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

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
    console.error("[admin/invoices/pdf]", err);
    return NextResponse.json({ error: "Failed to generate invoice PDF" }, { status: 500 });
  }
}
