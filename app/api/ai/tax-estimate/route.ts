import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildFinancialContext, FINOVA_SYSTEM_PROMPT, openAITextResponse } from "@/lib/finovaAI";

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

    const [ctx, salesInvoices, purchaseInvoices, taxConfigs] = await Promise.all([
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

    return NextResponse.json({
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
    });
  } catch (err) {
    console.error("AI tax estimate error:", err);
    return NextResponse.json({ error: "Failed to generate tax estimate" }, { status: 500 });
  }
}
