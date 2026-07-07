export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf, InvoicePdfData } from "@/lib/invoicePdf";
import { Resend } from "resend";

// ── Types ─────────────────────────────────────────────────────────────────────

type InvoiceType = "sales" | "purchase";

interface RawInvoiceRow {
  id: string;
  invoiceNo: string;
  invoiceDate: Date;
  dueDate: Date | null;
  customerName: string | null;
  supplierName: string | null;
  customerAddress: string | null;
  supplierAddress: string | null;
  customerPhone: string | null;
  supplierPhone: string | null;
  total: number;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  status: string | null;
  currency: string | null;
  notes: string | null;
  items_json: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Resolve companyId from request headers, falling back to user lookup. */
async function resolveCompanyId(req: NextRequest): Promise<string | null> {
  const companyId = req.headers.get("x-company-id");
  if (companyId) return companyId;

  const userId = req.headers.get("x-user-id");
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultCompanyId: true },
  });
  return user?.defaultCompanyId ?? null;
}

/** Fetch a sales or purchase invoice with party name/address from the DB. */
async function fetchInvoiceRow(
  invoiceId: string,
  type: InvoiceType,
  companyId: string,
): Promise<RawInvoiceRow | null> {
  if (type === "sales") {
    const rows = await prisma.$queryRaw<RawInvoiceRow[]>`
      SELECT
        si.id,
        si."invoiceNo",
        si.date        AS "invoiceDate",
        si."dueDate",
        a.name         AS "customerName",
        NULL           AS "supplierName",
        a.address      AS "customerAddress",
        NULL           AS "supplierAddress",
        a.phone        AS "customerPhone",
        NULL           AS "supplierPhone",
        si.total,
        (SELECT COALESCE(SUM(item.amount), 0)
           FROM "SalesInvoiceItem" item WHERE item."invoiceId" = si.id) AS subtotal,
        0              AS tax,
        si.discount,
        si."approvalStatus" AS status,
        c."baseCurrency"    AS currency,
        si.notes,
        NULL           AS items_json
      FROM "SalesInvoice" si
      JOIN "Account"  a ON a.id = si."customerId"
      JOIN "Company"  c ON c.id = si."companyId"
      WHERE si.id = ${invoiceId}
        AND si."companyId" = ${companyId}
        AND si."deletedAt" IS NULL
      LIMIT 1
    `.catch(() => []);
    return rows[0] ?? null;
  }

  // purchase
  const rows = await prisma.$queryRaw<RawInvoiceRow[]>`
    SELECT
      pi.id,
      pi."invoiceNo",
      pi.date        AS "invoiceDate",
      pi."dueDate",
      NULL           AS "customerName",
      a.name         AS "supplierName",
      NULL           AS "customerAddress",
      a.address      AS "supplierAddress",
      NULL           AS "customerPhone",
      a.phone        AS "supplierPhone",
      pi.total,
      (SELECT COALESCE(SUM(item.amount), 0)
         FROM "PurchaseInvoiceItem" item WHERE item."invoiceId" = pi.id) AS subtotal,
      0              AS tax,
      pi.discount,
      pi."approvalStatus" AS status,
      c."baseCurrency"    AS currency,
      pi.notes,
      NULL           AS items_json
    FROM "PurchaseInvoice" pi
    JOIN "Account"  a ON a.id = pi."supplierId"
    JOIN "Company"  c ON c.id = pi."companyId"
    WHERE pi.id = ${invoiceId}
      AND pi."companyId" = ${companyId}
      AND pi."deletedAt" IS NULL
    LIMIT 1
  `.catch(() => []);
  return rows[0] ?? null;
}

/** Fetch line items for a sales or purchase invoice. */
async function fetchItems(
  invoiceId: string,
  type: InvoiceType,
): Promise<Array<{ name: string; qty: number; rate: number; amount: number; unit?: string }>> {
  if (type === "sales") {
    const rows = await prisma.$queryRaw<
      Array<{ name: string; qty: number; rate: number; amount: number }>
    >`
      SELECT n.name, sii.qty, sii.rate, sii.amount
      FROM "SalesInvoiceItem" sii
      JOIN "ItemNew" n ON n.id = sii."itemId"
      WHERE sii."invoiceId" = ${invoiceId}
    `.catch(() => []);
    return rows;
  }

  const rows = await prisma.$queryRaw<
    Array<{ name: string; qty: number; rate: number; amount: number }>
  >`
    SELECT n.name, pii.qty, pii.rate, pii.amount
    FROM "PurchaseInvoiceItem" pii
    JOIN "ItemNew" n ON n.id = pii."itemId"
    WHERE pii."invoiceId" = ${invoiceId}
  `.catch(() => []);
  return rows;
}

/** Fetch the party (customer or supplier) email for an invoice. */
async function fetchPartyEmail(
  invoiceId: string,
  type: InvoiceType,
): Promise<string | null> {
  const rows = type === "sales"
    ? await prisma.$queryRaw<Array<{ email: string | null }>>`
        SELECT a.email
        FROM "SalesInvoice" si
        JOIN "Account" a ON a.id = si."customerId"
        WHERE si.id = ${invoiceId}
        LIMIT 1
      `.catch(() => [])
    : await prisma.$queryRaw<Array<{ email: string | null }>>`
        SELECT a.email
        FROM "PurchaseInvoice" pi
        JOIN "Account" a ON a.id = pi."supplierId"
        WHERE pi.id = ${invoiceId}
        LIMIT 1
      `.catch(() => []);
  return rows[0]?.email ?? null;
}

/** Fetch company name from the Company table. */
async function fetchCompanyInfo(
  companyId: string,
): Promise<{ name: string; address?: string; phone?: string; email?: string }> {
  const co = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  }).catch(() => null);
  return { name: co?.name ?? "Company" };
}

/** Build InvoicePdfData from raw DB rows. */
function buildPdfData(
  inv: RawInvoiceRow,
  items: Array<{ name: string; qty: number; rate: number; amount: number; unit?: string }>,
  company: { name: string; address?: string; phone?: string; email?: string },
  type: InvoiceType,
): InvoicePdfData {
  const subtotal =
    typeof inv.subtotal === "number" ? inv.subtotal : items.reduce((s, i) => s + i.amount, 0);
  const partyName = type === "sales" ? (inv.customerName ?? "") : (inv.supplierName ?? "");
  const partyAddress = type === "sales" ? inv.customerAddress ?? undefined : inv.supplierAddress ?? undefined;
  const partyPhone = type === "sales" ? inv.customerPhone ?? undefined : inv.supplierPhone ?? undefined;

  return {
    invoiceNumber: inv.invoiceNo,
    invoiceDate: fmtDate(inv.invoiceDate),
    dueDate: inv.dueDate ? fmtDate(inv.dueDate) : undefined,
    companyName: company.name,
    companyAddress: company.address,
    companyPhone: company.phone,
    companyEmail: company.email,
    customerName: partyName,
    customerAddress: partyAddress,
    customerPhone: partyPhone,
    items,
    subtotal,
    tax: typeof inv.tax === "number" ? inv.tax : undefined,
    discount: typeof inv.discount === "number" && inv.discount > 0 ? inv.discount : undefined,
    total: inv.total,
    currency: inv.currency ?? "USD",
    notes: inv.notes ?? undefined,
    status: inv.status ?? undefined,
  };
}

/** Send an email with a PDF attachment via Resend. */
async function emailPdf(opts: {
  to: string;
  subject: string;
  invoiceNo: string;
  pdfBuffer: Buffer;
  companyName: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY not configured." };
  }
  const fromDomain = process.env.RESEND_FROM_DOMAIN ?? "finovaos.app";
  const { error } = await resend.emails.send({
    from: `${opts.companyName} <noreply@${fromDomain}>`,
    to: [opts.to],
    subject: opts.subject,
    html: `<p>Please find your invoice <strong>${opts.invoiceNo}</strong> attached.</p><p>Thank you for your business.</p><p style="color:#94a3b8;font-size:12px;">Sent via FinovaOS</p>`,
    attachments: [
      {
        filename: `invoice-${opts.invoiceNo}.pdf`,
        content: opts.pdfBuffer,
      },
    ],
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── GET /api/invoicing/pdf?invoiceId=&type=sales|purchase ─────────────────────
// Returns a PDF file for download.
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId");
    const type = (searchParams.get("type") ?? "sales") as InvoiceType;

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }
    if (type !== "sales" && type !== "purchase") {
      return NextResponse.json({ error: 'type must be "sales" or "purchase"' }, { status: 400 });
    }

    const inv = await fetchInvoiceRow(invoiceId, type, companyId);
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const [items, company] = await Promise.all([
      fetchItems(invoiceId, type),
      fetchCompanyInfo(companyId),
    ]);

    const pdfData = buildPdfData(inv, items, company, type);
    const pdfBuffer = await generateInvoicePdf(pdfData);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${inv.invoiceNo}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/invoicing/pdf]", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

// ── POST /api/invoicing/pdf ────────────────────────────────────────────────────
// Single invoice email OR bulk email (action=bulk).
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── Bulk: POST /api/invoicing/pdf?action=bulk ────────────────────────────
    if (action === "bulk") {
      const body = await req.json().catch(() => ({}));
      const { invoiceIds, type = "sales" } = body as {
        invoiceIds?: string[];
        type?: InvoiceType;
      };

      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return NextResponse.json({ error: "invoiceIds array required" }, { status: 400 });
      }
      if (type !== "sales" && type !== "purchase") {
        return NextResponse.json({ error: 'type must be "sales" or "purchase"' }, { status: 400 });
      }

      const company = await fetchCompanyInfo(companyId);
      const results: Array<{ invoiceId: string; invoiceNo?: string; success: boolean; error?: string }> = [];

      for (const invoiceId of invoiceIds) {
        try {
          const inv = await fetchInvoiceRow(invoiceId, type, companyId);
          if (!inv) {
            results.push({ invoiceId, success: false, error: "Not found" });
            continue;
          }

          // Determine recipient email from party account
          const recipientEmail = await fetchPartyEmail(invoiceId, type);
          if (!recipientEmail) {
            results.push({ invoiceId, invoiceNo: inv.invoiceNo, success: false, error: "No email on record" });
            continue;
          }

          const items = await fetchItems(invoiceId, type);
          const pdfData = buildPdfData(inv, items, company, type);
          const pdfBuffer = await generateInvoicePdf(pdfData);

          const send = await emailPdf({
            to: recipientEmail,
            subject: `Invoice ${inv.invoiceNo} from ${company.name}`,
            invoiceNo: inv.invoiceNo,
            pdfBuffer,
            companyName: company.name,
          });
          results.push({ invoiceId, invoiceNo: inv.invoiceNo, ...send });
        } catch (e: any) {
          results.push({ invoiceId, success: false, error: e?.message ?? "Unknown error" });
        }
      }

      const sent = results.filter((r) => r.success).length;
      return NextResponse.json({ sent, total: invoiceIds.length, results });
    }

    // ── Single invoice email: POST /api/invoicing/pdf ────────────────────────
    const body = await req.json().catch(() => ({}));
    const {
      invoiceId,
      type = "sales",
      email,
      subject,
    } = body as {
      invoiceId?: string;
      type?: InvoiceType;
      email?: string;
      subject?: string;
    };

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }
    if (type !== "sales" && type !== "purchase") {
      return NextResponse.json({ error: 'type must be "sales" or "purchase"' }, { status: 400 });
    }

    const inv = await fetchInvoiceRow(invoiceId, type, companyId);
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const [items, company] = await Promise.all([
      fetchItems(invoiceId, type),
      fetchCompanyInfo(companyId),
    ]);

    const pdfData = buildPdfData(inv, items, company, type);
    const pdfBuffer = await generateInvoicePdf(pdfData);

    // Resolve recipient email — body email > party account email
    let recipientEmail = email;
    if (!recipientEmail) {
      const emailRows = type === "sales"
        ? await prisma.$queryRaw<Array<{ email: string | null }>>`
            SELECT a.email FROM "SalesInvoice" si
            JOIN "Account" a ON a.id = si."customerId"
            WHERE si.id = ${invoiceId} LIMIT 1
          `.catch(() => [])
        : await prisma.$queryRaw<Array<{ email: string | null }>>`
            SELECT a.email FROM "PurchaseInvoice" pi
            JOIN "Account" a ON a.id = pi."supplierId"
            WHERE pi.id = ${invoiceId} LIMIT 1
          `.catch(() => []);
      recipientEmail = (emailRows[0]?.email) ?? undefined;
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No recipient email provided and none found on the party account." },
        { status: 422 },
      );
    }

    const send = await emailPdf({
      to: recipientEmail,
      subject: subject ?? `Invoice ${inv.invoiceNo} from ${company.name}`,
      invoiceNo: inv.invoiceNo,
      pdfBuffer,
      companyName: company.name,
    });

    if (!send.success) {
      return NextResponse.json({ error: send.error ?? "Email failed" }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      invoiceNo: inv.invoiceNo,
      sentTo: recipientEmail,
    });
  } catch (err) {
    console.error("[POST /api/invoicing/pdf]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
