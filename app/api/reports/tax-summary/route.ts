import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveCompanyId, resolveBranchId } from "@/lib/tenant";
import { getBaseAmounts, resolveAmount } from "@/lib/currencyHelper";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const branchId = await resolveBranchId(req, companyId);

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.VIEW_REPORTS,
      companyId
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const fromDate = from ? new Date(from + "T00:00:00") : undefined;
    const toDate = to ? new Date(to + "T23:59:59.999") : undefined;

    // Output tax (charged on sales) and input tax (paid on purchases) are
    // separate lines: what is owed to the tax authority is output − input.
    // This report used to add the two together under one "GST" row, which
    // overstated the liability by the whole input credit.
    const dateFilter = fromDate && toDate ? { date: { gte: fromDate, lte: toDate } } : {};
    const scope = { companyId, deletedAt: null, ...dateFilter, ...(branchId ? { branchId } : {}) };
    const invoiceSelect = {
      id: true, total: true, discount: true, discountType: true, freight: true,
      taxConfig: { select: { taxType: true, taxCode: true, taxRate: true } },
      items: { select: { qty: true, rate: true, taxPercent: true } },
    } as const;

    const [salesInvoices, purchaseInvoices] = await Promise.all([
      prisma.salesInvoice.findMany({ where: scope, select: invoiceSelect }),
      prisma.purchaseInvoice.findMany({ where: scope, select: invoiceSelect }),
    ]);
    const baseAmounts = await getBaseAmounts([...salesInvoices, ...purchaseInvoices].map((i) => i.id));

    type Row = {
      direction: "OUTPUT" | "INPUT";
      taxType: string; taxCode: string; taxRate: number;
      invoiceCount: number; totalSubtotal: number; totalTaxAmount: number; totalAmount: number;
    };
    const summary = new Map<string, Row>();

    const add = (direction: Row["direction"], inv: (typeof salesInvoices)[number]) => {
      // Tax is not stored on the invoice; it is what the total carries beyond
      // the taxable value and freight — exact for item-level and invoice-level
      // tax alike (see the total formula in the invoice routes).
      const gross = inv.items.reduce((s, i) => s + Number(i.qty) * Number(i.rate), 0);
      const discount = inv.discountType === "percent" ? gross * Number(inv.discount || 0) / 100 : Number(inv.discount || 0);
      const taxable = gross - discount;
      const tax = Number(inv.total) - taxable - Number(inv.freight || 0);
      if (tax <= 0.005) return;

      // Report in base currency, scaling by the invoice's own conversion.
      const fx = Number(inv.total) ? resolveAmount(inv.id, Number(inv.total), baseAmounts) / Number(inv.total) : 1;
      const rate = inv.taxConfig?.taxRate ?? Math.round((tax / taxable) * 10000) / 100;
      const taxType = inv.taxConfig?.taxType || "Sales Tax";
      const key = `${direction}|${taxType}|${rate}`;
      const row = summary.get(key) ?? {
        direction, taxType, taxCode: inv.taxConfig?.taxCode || "", taxRate: rate,
        invoiceCount: 0, totalSubtotal: 0, totalTaxAmount: 0, totalAmount: 0,
      };
      row.invoiceCount += 1;
      row.totalSubtotal += taxable * fx;
      row.totalTaxAmount += tax * fx;
      row.totalAmount += (taxable + tax) * fx;
      summary.set(key, row);
    };
    salesInvoices.forEach((inv) => add("OUTPUT", inv));
    purchaseInvoices.forEach((inv) => add("INPUT", inv));

    // Legacy InvoiceTax rows from the old tax system, for invoices not already
    // counted above.
    const counted = new Set([...salesInvoices, ...purchaseInvoices].map((i) => i.id));
    const legacyTaxes = await prisma.invoiceTax.findMany({
      where: {
        taxConfiguration: { companyId },
        ...(fromDate && toDate ? { createdAt: { gte: fromDate, lte: toDate } } : {}),
      },
      include: { taxConfiguration: true },
    });
    for (const it of legacyTaxes) {
      if (counted.has(it.invoiceId)) continue;
      const direction = it.invoiceType === "PURCHASE" ? "INPUT" : "OUTPUT";
      const key = `${direction}|${it.taxConfiguration.taxType}|${it.taxConfiguration.taxRate}`;
      const row = summary.get(key) ?? {
        direction, taxType: it.taxConfiguration.taxType, taxCode: it.taxConfiguration.taxCode,
        taxRate: it.taxConfiguration.taxRate, invoiceCount: 0, totalSubtotal: 0, totalTaxAmount: 0, totalAmount: 0,
      };
      row.invoiceCount += 1;
      row.totalSubtotal += it.subtotal;
      row.totalTaxAmount += it.taxAmount;
      row.totalAmount += it.totalAmount;
      summary.set(key, row);
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const result = [...summary.values()]
      .sort((a, b) => (a.direction === b.direction ? b.totalTaxAmount - a.totalTaxAmount : a.direction === "OUTPUT" ? -1 : 1))
      .map((r) => ({
        ...r,
        totalSubtotal: round2(r.totalSubtotal),
        totalTaxAmount: round2(r.totalTaxAmount),
        totalAmount: round2(r.totalAmount),
        averageTaxRate: r.totalSubtotal > 0 ? round2((r.totalTaxAmount / r.totalSubtotal) * 100) : 0,
      }));

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Tax Summary Report Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
