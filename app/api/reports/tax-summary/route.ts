import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { apiHasPermission } from "@/lib/apiPermission";
import { PERMISSIONS } from "@/lib/permissions";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    const allowed = await apiHasPermission(
      userId,
      userRole,
      PERMISSIONS.VIEW_REPORTS
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const taxType = searchParams.get("taxType");

    const fromDate = from ? new Date(from + "T00:00:00") : undefined;
    const toDate = to ? new Date(to + "T23:59:59.999") : undefined;

    const where: any = {};
    if (fromDate && toDate) {
      where.date = { gte: fromDate, lte: toDate };
    }

    // 1. Sales Invoices with Tax
    const salesInvoicesWithTax = await prisma.salesInvoice.findMany({
      where: {
        ...where,
        taxConfigId: { not: null },
      },
      include: {
        taxConfig: true,
      },
    });

    // 2. Purchase Invoices with Tax
    const purchaseInvoicesWithTax = await prisma.purchaseInvoice.findMany({
      where: {
        ...where,
        taxConfigId: { not: null },
      },
      include: {
        taxConfig: true,
      },
    });

    // 3. Legacy InvoiceTax entries (پرانی system سے)
    const legacyTaxes = await prisma.invoiceTax.findMany({
      where: {
        createdAt: where.createdAt,
      },
      include: {
        taxConfiguration: true,
      },
    });

    // Group by tax type
    const summary: Record<string, any> = {};

    // Process Sales Invoices
    salesInvoicesWithTax.forEach((inv: any) => {
      if (!inv.taxConfig) return;
      const key = inv.taxConfig.taxType;
      
      if (!summary[key]) {
        summary[key] = {
          taxType: key,
          taxCode: inv.taxConfig.taxCode,
          taxRate: inv.taxConfig.taxRate,
          invoiceCount: 0,
          totalSubtotal: 0,
          totalTaxAmount: 0,
          totalAmount: 0,
        };
      }

      // ✅ صحیح calculation: Total میں سے subtotal نکالیں
      const taxRate = inv.taxConfig.taxRate / 100;
      const subtotal = inv.total / (1 + taxRate);
      const taxAmount = inv.total - subtotal;

      summary[key].invoiceCount += 1;
      summary[key].totalSubtotal += subtotal;
      summary[key].totalTaxAmount += taxAmount;
      summary[key].totalAmount += inv.total;
    });

    // Process Purchase Invoices
    purchaseInvoicesWithTax.forEach((inv: any) => {
      if (!inv.taxConfig) return;
      const key = inv.taxConfig.taxType;
      
      if (!summary[key]) {
        summary[key] = {
          taxType: key,
          taxCode: inv.taxConfig.taxCode,
          taxRate: inv.taxConfig.taxRate,
          invoiceCount: 0,
          totalSubtotal: 0,
          totalTaxAmount: 0,
          totalAmount: 0,
        };
      }

      // ✅ صحیح calculation: Total میں سے subtotal نکالیں
      const taxRate = inv.taxConfig.taxRate / 100;
      const subtotal = inv.total / (1 + taxRate);
      const taxAmount = inv.total - subtotal;

      summary[key].invoiceCount += 1;
      summary[key].totalSubtotal += subtotal;
      summary[key].totalTaxAmount += taxAmount;
      summary[key].totalAmount += inv.total;
    });

    // Process Legacy InvoiceTax entries
    legacyTaxes.forEach((it: any) => {
      const key = it.taxConfiguration.taxType;
      if (!summary[key]) {
        summary[key] = {
          taxType: key,
          taxCode: it.taxConfiguration.taxCode,
          taxRate: it.taxConfiguration.taxRate,
          invoiceCount: 0,
          totalSubtotal: 0,
          totalTaxAmount: 0,
          totalAmount: 0,
        };
      }

      summary[key].invoiceCount += 1;
      summary[key].totalSubtotal += it.subtotal;
      summary[key].totalTaxAmount += it.taxAmount;
      summary[key].totalAmount += it.totalAmount;
    });

    const result = Object.values(summary).map((s: any) => ({
      ...s,
      averageTaxRate: s.totalSubtotal > 0 ? (s.totalTaxAmount / s.totalSubtotal) * 100 : 0,
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Tax Summary Report Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
