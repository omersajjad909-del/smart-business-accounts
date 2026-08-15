import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

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
    const admin = requireAdmin(req);
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
export async function PATCH(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
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
