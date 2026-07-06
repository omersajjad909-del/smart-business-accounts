import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildFinancialContext, FINOVA_SYSTEM_PROMPT, openAITextResponse } from "@/lib/finovaAI";
import {
  calculateIncomeTax,
  calculateGSTMonth,
  getFilingDeadlineForMonth,
  FILING_DEADLINES,
  WHT_RATES,
} from "@/lib/pakistanTaxRules";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [ctx, salesInvoices, purchaseInvoices, taxConfigs, companyMeta] = await Promise.all([
      buildFinancialContext(companyId),
      prisma.salesInvoice.findMany({
        where: {
          companyId,
          deletedAt: null,
          taxConfigId: { not: null },
          date: { gte: monthStart, lte: monthEnd },
        },
        include: { taxConfig: true },
      }),
      prisma.purchaseInvoice.findMany({
        where: {
          companyId,
          deletedAt: null,
          taxConfigId: { not: null },
          date: { gte: monthStart, lte: monthEnd },
        },
        include: { taxConfig: true },
      }),
      prisma.taxConfiguration.findMany({
        where: { companyId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { country: true },
      }),
    ]);

    const calcTaxPortion = (grossTotal: number, ratePct: number) => {
      const rate = Number(ratePct || 0) / 100;
      if (!rate) return 0;
      const subtotal = Number(grossTotal || 0) / (1 + rate);
      return Number(grossTotal || 0) - subtotal;
    };

    const outputTax = salesInvoices.reduce((sum, invoice) => {
      return sum + calcTaxPortion(Number(invoice.total || 0), Number(invoice.taxConfig?.taxRate || 0));
    }, 0);

    const inputTax = purchaseInvoices.reduce((sum, invoice) => {
      return sum + calcTaxPortion(Number(invoice.total || 0), Number(invoice.taxConfig?.taxRate || 0));
    }, 0);

    const netTaxPayable = outputTax - inputTax;
    const taxCoverage = taxConfigs.map((tax) => ({
      taxType: tax.taxType,
      taxCode: tax.taxCode,
      taxRate: tax.taxRate,
    }));

    const currency = ctx.company.currency || "PKR";
    const country = companyMeta?.country || "";
    const isPakistan = country.toLowerCase() === "pakistan" || currency === "PKR";

    const baseSummary = [
      `Estimated output tax this month is ${currency} ${Math.round(outputTax).toLocaleString()}.`,
      `Estimated input tax this month is ${currency} ${Math.round(inputTax).toLocaleString()}.`,
      netTaxPayable >= 0
        ? `Estimated net tax payable is ${currency} ${Math.round(netTaxPayable).toLocaleString()}.`
        : `Estimated recoverable tax position is ${currency} ${Math.round(Math.abs(netTaxPayable)).toLocaleString()}.`,
    ];

    const prompt = `You are preparing a short AI tax estimate summary.

Company: ${ctx.company.name}
Business Type: ${ctx.company.businessType}
Currency: ${currency}
Month: ${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}

Numbers:
- Output tax: ${outputTax}
- Input tax: ${inputTax}
- Net tax payable: ${netTaxPayable}
- Revenue this month: ${ctx.revenue.thisMonth}
- Expenses this month: ${ctx.expenses.thisMonth}

Available tax setups:
${taxCoverage.map((tax) => `- ${tax.taxType} (${tax.taxCode}) at ${tax.taxRate}%`).join("\n") || "- none"}

Write a practical 3-bullet tax estimate note for a business owner. Mention compliance caution that this is an estimate, not a filed return.`;

    const aiSummary = await openAITextResponse(
      FINOVA_SYSTEM_PROMPT,
      [{ role: "user", content: prompt }],
      350,
    );

    const baseResponse = {
      month: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      summary: aiSummary || baseSummary.join("\n"),
      metrics: {
        outputTax,
        inputTax,
        netTaxPayable,
        taxConfigsCount: taxConfigs.length,
        taxedSalesInvoices: salesInvoices.length,
        taxedPurchaseInvoices: purchaseInvoices.length,
      },
      taxCoverage,
      isPakistan,
    };

    if (!isPakistan) {
      return NextResponse.json(baseResponse);
    }

    // Pakistan FBR full report
    const annualRevenue = ctx.revenue.thisYear;
    const annualExpenses = ctx.expenses.thisMonth * 12; // fallback annualization
    const annualNetProfitEstimate = Math.max(0, annualRevenue - annualExpenses);

    const incomeTaxCalc = calculateIncomeTax(annualNetProfitEstimate);
    const gstCalc = calculateGSTMonth(outputTax, inputTax, now.getMonth(), now.getFullYear());
    const filingDeadline = getFilingDeadlineForMonth(now.getMonth(), now.getFullYear());

    const totalPurchases = purchaseInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const whtOnPurchases = {
      registered: Math.round(totalPurchases * WHT_RATES.supplier_registered),
      unregistered: Math.round(totalPurchases * WHT_RATES.supplier_unregistered),
      estimatedOnPurchases: Math.round(totalPurchases * WHT_RATES.supplier_registered),
    };

    return NextResponse.json({
      ...baseResponse,
      annualRevenue,
      annualExpenses,
      gst: {
        outputTax: Math.round(outputTax),
        inputTax: Math.round(inputTax),
        netPayable: gstCalc.netPayable,
        isRefundable: gstCalc.isRefundable,
        filingDeadline,
        month: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      },
      incomeTax: {
        annualNetProfitEstimate: Math.round(annualNetProfitEstimate),
        estimatedTax: incomeTaxCalc.tax,
        effectiveRate: incomeTaxCalc.effectiveRate,
        slabBreakdown: incomeTaxCalc.slabBreakdown,
        filingDeadline: FILING_DEADLINES.incomeTaxAnnual,
      },
      wht: whtOnPurchases,
    });
  } catch (err) {
    console.error("AI tax estimate error:", err);
    return NextResponse.json({ error: "Failed to generate tax estimate" }, { status: 500 });
  }
}
