import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminAuth";
import { createManualPlatformInvoice } from "@/lib/platformInvoice";

export const runtime = "nodejs";

/**
 * The platform's sales ledger for the admin console.
 *
 * Reads PlatformInvoice directly rather than deriving anything: the numbers,
 * amounts and tax lines here are the same rows the customer's PDF is rendered
 * from, so the two can never disagree.
 *
 * Totals are grouped by currency and never summed across them — Lemon Squeezy
 * settles in USD and Safepay in PKR, and adding those together would produce a
 * figure that means nothing on a tax return.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId") || undefined;
    const provider = searchParams.get("provider") || undefined;
    const status = searchParams.get("status") || undefined;
    const plan = searchParams.get("plan") || undefined;
    const currency = searchParams.get("currency") || undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (provider) where.provider = provider.toUpperCase();
    if (status) where.status = status.toUpperCase();
    if (plan) where.plan = plan.toUpperCase();
    if (currency) where.currency = currency.toUpperCase();

    if (from || to) {
      where.issuedAt = {};
      if (from) where.issuedAt.gte = new Date(from);
      // `to` is a calendar day, so include everything up to its final moment —
      // an exclusive bound would silently drop the last day of every range.
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.issuedAt.lte = end;
      }
    }

    if (q) {
      where.OR = [
        { number: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { providerOrderId: { contains: q, mode: "insensitive" } },
      ];
    }

    let invoices: any[] = [];
    try {
      invoices = await (prisma as any).platformInvoice.findMany({
        where,
        orderBy: { issuedAt: "desc" },
        take: limit,
      });
    } catch (e: any) {
      // The ledger table ships as a manual migration — say so plainly instead
      // of rendering an empty page that looks like "no sales yet".
      const message = String(e?.message || "");
      if (message.includes("does not exist") || e?.code === "P2021") {
        return NextResponse.json({
          invoices: [],
          totals: [],
          summary: { count: 0, companies: 0 },
          migrationRequired: true,
          error: "PlatformInvoice table not found — run prisma/migrations/manual_platform_invoices.sql",
        });
      }
      throw e;
    }

    // The row stores the company name as it was at the time of sale, which is
    // the correct thing for a tax record but useless for finding a company that
    // has since been renamed. Attach the live name and the short `companyNo` so
    // the UI can show both — and so it never has to fall back to printing a raw
    // 36-character UUID at the admin.
    const companies = await prisma.company.findMany({
      where: { id: { in: Array.from(new Set(invoices.map((i) => i.companyId))) } },
      select: { id: true, name: true, companyNo: true },
    });
    const companyById = new Map(companies.map((c) => [c.id, c]));

    const rows = invoices.map((inv) => {
      const live = companyById.get(inv.companyId);
      return {
        ...inv,
        companyNo: live?.companyNo ?? null,
        currentCompanyName: live?.name ?? null,
        /** True when the company has been renamed since this invoice was issued. */
        companyRenamed: Boolean(live?.name && inv.companyName && live.name !== inv.companyName),
      };
    });

    // Per-currency rollups, computed over the filtered set so the header always
    // describes exactly what is on screen.
    const byCurrency = new Map<string, { currency: string; gross: number; refunded: number; net: number; tax: number; count: number }>();
    for (const inv of invoices) {
      const key = String(inv.currency || "USD").toUpperCase();
      const row = byCurrency.get(key) || { currency: key, gross: 0, refunded: 0, net: 0, tax: 0, count: 0 };
      row.gross += Number(inv.total) || 0;
      row.refunded += Number(inv.refundedAmount) || 0;
      row.tax += Number(inv.taxAmount) || 0;
      row.count += 1;
      row.net = row.gross - row.refunded;
      byCurrency.set(key, row);
    }

    return NextResponse.json({
      invoices: rows,
      totals: Array.from(byCurrency.values()).sort((a, b) => b.gross - a.gross),
      summary: {
        count: invoices.length,
        companies: new Set(invoices.map((i) => i.companyId)).size,
        // Signals a truncated view so the UI can tell the admin to narrow the
        // filters rather than quietly showing partial totals as if complete.
        truncated: invoices.length >= limit,
      },
    });
  } catch (e: any) {
    console.error("[admin/invoices] GET error:", e);
    return NextResponse.json({ error: e?.message || "Failed to load invoices" }, { status: 500 });
  }
}

/**
 * Admin-editable fields only. The number, amounts and provider references are
 * immutable — an invoice a customer has already downloaded cannot be rewritten.
 */
/** "2026-08-30" → a Date, or null. Anything else is rejected upstream. */
function parseDay(value: unknown, endOfDay = false): Date | null | "invalid" {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "invalid";
  const date = new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

/**
 * POST — write one invoice by hand.
 *
 * The ledger is otherwise only ever written by the payment webhook, which means
 * a deal settled offline (a multi-year licence paid by bank transfer) leaves no
 * invoice at all — and the customer's billing page then shows a row derived
 * from the plan's USD list price instead of what they actually paid. This is
 * the way that money gets a real number, and the same row is what the customer
 * downloads as a PDF.
 *
 * Idempotent on `reference`: the same reference twice returns the first
 * invoice rather than minting a second number for one payment.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "A JSON body is required" }, { status: 400 });
    }

    const companyId = String(body.companyId || "").trim();
    if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, country: true, plan: true },
    });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const periodStart = parseDay(body.periodStart);
    const periodEnd = parseDay(body.periodEnd, true);
    const issuedAt = parseDay(body.issuedAt);
    for (const [label, parsed] of [["periodStart", periodStart], ["periodEnd", periodEnd], ["issuedAt", issuedAt]] as const) {
      if (parsed === "invalid") {
        return NextResponse.json({ error: `${label} must be a date in YYYY-MM-DD form` }, { status: 400 });
      }
    }

    // Best effort only — the invoice is addressed to the company, and the email
    // is there so the admin ledger stays searchable by the person who paid.
    const billingUser = body.customerEmail
      ? null
      : await prisma.user
          .findFirst({
            where: { companies: { some: { companyId } }, active: true },
            orderBy: { createdAt: "asc" },
            select: { email: true, name: true },
          })
          .catch(() => null);

    const result = await createManualPlatformInvoice({
      companyId,
      // Snapshot, deliberately: a renamed company must not rewrite the name on
      // an invoice already issued.
      companyName: company.name,
      plan: String(body.plan || company.plan || "STARTER"),
      billingCycle: body.billingCycle,
      currency: body.currency,
      amount: Number(body.amount),
      discount: body.discount,
      taxRate: body.taxRate,
      taxName: body.taxName,
      customerName: body.customerName || billingUser?.name || company.name,
      customerEmail: body.customerEmail || billingUser?.email || null,
      customerCountry: body.customerCountry || company.country || null,
      customerTaxId: body.customerTaxId,
      status: body.status,
      periodStart: periodStart as Date | null,
      periodEnd: periodEnd as Date | null,
      issuedAt: (issuedAt as Date | null) || undefined,
      reference: body.reference,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, migrationRequired: result.migrationRequired || false },
        { status: result.migrationRequired ? 503 : 400 },
      );
    }

    if (!result.duplicate) {
      await logAdminAction({
        adminId: admin.id,
        adminEmail: admin.email,
        action: "CREATE_MANUAL_INVOICE",
        targetType: "PlatformInvoice",
        targetId: result.invoice.id,
        targetLabel: result.invoice.number,
        companyId,
        details: {
          number: result.invoice.number,
          currency: result.invoice.currency,
          total: result.invoice.total,
          plan: result.invoice.plan,
          note: typeof body.note === "string" ? body.note : null,
        },
      });
    }

    return NextResponse.json({ invoice: result.invoice, duplicate: result.duplicate });
  } catch (e: any) {
    console.error("[admin/invoices] POST error:", e);
    return NextResponse.json({ error: e?.message || "Failed to create invoice" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const body = await req.json();
    const { id, customerTaxId, customerName, customerCountry } = body as Record<string, string>;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const data: any = {};
    if (typeof customerTaxId === "string") data.customerTaxId = customerTaxId.trim() || null;
    if (typeof customerName === "string") data.customerName = customerName.trim() || null;
    if (typeof customerCountry === "string") data.customerCountry = customerCountry.trim() || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const invoice = await (prisma as any).platformInvoice.update({ where: { id }, data });
    return NextResponse.json({ invoice });
  } catch (e: any) {
    console.error("[admin/invoices] PATCH error:", e);
    return NextResponse.json({ error: e?.message || "Failed to update invoice" }, { status: 500 });
  }
}
