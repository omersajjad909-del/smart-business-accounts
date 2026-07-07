/**
 * FinovaOS — FBR (Federal Board of Revenue) Tax Report Generator
 * Generates Pakistan-compliant quarterly/annual tax reports with
 * Sales Tax (GST 17%), Income Tax, and WHT calculations.
 */

import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import {
  calculateIncomeTax,
  GST_STANDARD_RATE,
  COMPANY_TAX_RATE,
} from "@/lib/pakistanTaxRules";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FbrReportPeriod {
  year: number;
  quarter?: 1 | 2 | 3 | 4;
  month?: number;
}

export interface FbrTaxReport {
  period: string; // "Q1 2025", "Annual 2024-25", etc.
  companyId: string;
  generatedAt: string;

  // Sales Tax (GST 17%)
  salesTax: {
    totalSales: number;
    taxableSales: number;
    exemptSales: number;
    outputTax: number; // 17% of taxable sales
    inputTax: number; // GST paid on purchases
    netTax: number; // output - input
  };

  // Income Tax
  incomeTax: {
    grossRevenue: number;
    totalExpenses: number;
    netIncome: number;
    taxableIncome: number;
    estimatedTax: number; // from tax slabs
    advanceTaxPaid: number;
    balanceTax: number;
  };

  // WHT (Withholding Tax)
  withholdingTax: {
    collected: number; // from customers
    deducted: number; // from suppliers
    net: number;
  };

  // Summary
  summary: {
    totalTaxLiability: number;
    dueDate: string; // FBR filing deadline
    penaltyIfLate: number; // 5% of tax per month
    recommendations: string[];
  };

  // Raw data for audit
  rawData: {
    topCustomers: Array<{ name: string; revenue: number; tax: number }>;
    topExpenses: Array<{ category: string; amount: number; taxDeductible: boolean }>;
  };
}

// ─── Period helpers ───────────────────────────────────────────────────────────

/**
 * Get the fiscal year start/end for Pakistan (Jul–Jun).
 * Q1 = Jul–Sep, Q2 = Oct–Dec, Q3 = Jan–Mar, Q4 = Apr–Jun
 */
function getPeriodDateRange(period: FbrReportPeriod): { start: Date; end: Date } {
  const { year, quarter, month } = period;

  if (month !== undefined) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (quarter) {
    // Pakistan fiscal year: Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
    const quarterMonths: Record<number, { startMonth: number; endMonth: number; calYear: number }> = {
      1: { startMonth: 6, endMonth: 8, calYear: year - 1 }, // Jul-Sep of fiscal year N uses calendar year N-1
      2: { startMonth: 9, endMonth: 11, calYear: year - 1 }, // Oct-Dec
      3: { startMonth: 0, endMonth: 2, calYear: year }, // Jan-Mar
      4: { startMonth: 3, endMonth: 5, calYear: year }, // Apr-Jun
    };
    const q = quarterMonths[quarter];
    const start = new Date(q.calYear, q.startMonth, 1);
    const end = new Date(q.calYear, q.endMonth + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // Annual: Jul 1 of (year-1) to Jun 30 of year (Pakistan fiscal year)
  const start = new Date(year - 1, 6, 1); // Jul 1 of previous calendar year
  const end = new Date(year, 5, 30, 23, 59, 59, 999); // Jun 30
  return { start, end };
}

function getPeriodLabel(period: FbrReportPeriod): string {
  const { year, quarter, month } = period;
  if (month !== undefined) {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${monthNames[month - 1]} ${year}`;
  }
  if (quarter) return `Q${quarter} FY${year}`;
  return `Annual FY${(year - 1)}-${String(year).slice(-2)}`;
}

// ─── FBR Deadline Calculator ──────────────────────────────────────────────────

export function getFbrDeadline(period: FbrReportPeriod): Date {
  const { year, quarter } = period;

  if (!quarter) {
    // Annual return: September 30 of the year following fiscal year end
    return new Date(year, 8, 30); // Sep 30
  }

  // Quarterly advance tax deadlines (Pakistan):
  // Q1 (Jul-Sep): due Oct 25 | Q2 (Oct-Dec): due Jan 25
  // Q3 (Jan-Mar): due Apr 25 | Q4 (Apr-Jun): due Jul 25
  const deadlines: Record<number, { month: number; day: number; calYear: number }> = {
    1: { month: 9, day: 25, calYear: year - 1 }, // Oct 25
    2: { month: 0, day: 25, calYear: year },     // Jan 25
    3: { month: 3, day: 25, calYear: year },     // Apr 25
    4: { month: 6, day: 25, calYear: year },     // Jul 25
  };

  const d = deadlines[quarter];
  return new Date(d.calYear, d.month, d.day);
}

// ─── Upcoming Deadline Checker ────────────────────────────────────────────────

export async function checkUpcomingDeadlines(
  companyId: string,
): Promise<Array<{ type: string; deadline: string; daysLeft: number; urgent: boolean }>> {
  const today = new Date();
  const ninetyDaysOut = new Date(today.getTime() + 90 * 86400000);
  const results: Array<{ type: string; deadline: string; daysLeft: number; urgent: boolean }> = [];

  // Check the next 2 fiscal years worth of quarters
  const currentYear = today.getFullYear();
  const fiscalYears = [currentYear, currentYear + 1];

  for (const fy of fiscalYears) {
    for (const q of [1, 2, 3, 4] as const) {
      const deadline = getFbrDeadline({ year: fy, quarter: q });
      if (deadline >= today && deadline <= ninetyDaysOut) {
        const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
        results.push({
          type: `Quarterly Advance Tax Q${q} FY${fy}`,
          deadline: deadline.toISOString().split("T")[0],
          daysLeft,
          urgent: daysLeft <= 14,
        });
      }
    }

    // Annual return
    const annualDeadline = getFbrDeadline({ year: fy });
    if (annualDeadline >= today && annualDeadline <= ninetyDaysOut) {
      const daysLeft = Math.ceil((annualDeadline.getTime() - today.getTime()) / 86400000);
      results.push({
        type: `Annual Income Tax Return FY${fy - 1}-${String(fy).slice(-2)}`,
        deadline: annualDeadline.toISOString().split("T")[0],
        daysLeft,
        urgent: daysLeft <= 14,
      });
    }
  }

  // Monthly GST deadline (15th of next month)
  const gstDeadline = new Date(today.getFullYear(), today.getMonth() + 1, 15);
  if (gstDeadline >= today && gstDeadline <= ninetyDaysOut) {
    const daysLeft = Math.ceil((gstDeadline.getTime() - today.getTime()) / 86400000);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    results.push({
      type: `Monthly GST Return (${monthNames[today.getMonth()]} ${today.getFullYear()})`,
      deadline: gstDeadline.toISOString().split("T")[0],
      daysLeft,
      urgent: daysLeft <= 7,
    });
  }

  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ─── Main Report Generator ────────────────────────────────────────────────────

export async function generateFbrReport(
  companyId: string,
  period: FbrReportPeriod,
): Promise<FbrTaxReport> {
  const { start, end } = getPeriodDateRange(period);
  const periodLabel = getPeriodLabel(period);

  // ── 1. Fetch Sales Invoices ──────────────────────────────────────────────────
  const salesInvoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      deletedAt: null,
      date: { gte: start, lte: end },
    },
    include: {
      customer: { select: { name: true } },
      taxConfig: { select: { taxRate: true, taxType: true } },
      items: { select: { amount: true, taxPercent: true } },
    },
  });

  // ── 2. Fetch Purchase Invoices ───────────────────────────────────────────────
  const purchaseInvoices = await prisma.purchaseInvoice.findMany({
    where: {
      companyId,
      deletedAt: null,
      date: { gte: start, lte: end },
    },
    include: {
      supplier: { select: { name: true } },
      taxConfig: { select: { taxRate: true, taxType: true } },
      items: { select: { amount: true, taxPercent: true } },
    },
  });

  // ── 3. Fetch Expense Vouchers ────────────────────────────────────────────────
  const expenseVouchers = await prisma.expenseVoucher.findMany({
    where: {
      companyId,
      deletedAt: null,
      date: { gte: start, lte: end },
    },
    include: {
      items: { select: { description: true, amount: true, category: true } },
    },
  });

  // ── 4. Calculate Sales Tax (GST) ─────────────────────────────────────────────
  let totalSales = 0;
  let taxableSales = 0;
  let outputTax = 0;

  for (const inv of salesInvoices) {
    const invTotal = Number(inv.total || 0);
    totalSales += invTotal;

    const gstRate = inv.taxConfig?.taxType === "GST"
      ? Number(inv.taxConfig.taxRate || 0) / 100
      : GST_STANDARD_RATE;

    // Calculate tax from items if available, else estimate from invoice total
    if (inv.items.length > 0) {
      for (const item of inv.items) {
        const itemTax = Number(item.amount || 0) * (Number(item.taxPercent || 0) / 100);
        outputTax += itemTax;
        if (item.taxPercent && Number(item.taxPercent) > 0) {
          taxableSales += Number(item.amount || 0);
        }
      }
    } else {
      // Use tax config rate against invoice total
      const estimatedTaxBase = invTotal / (1 + gstRate);
      const estimatedTax = invTotal - estimatedTaxBase;
      if (inv.taxConfig) {
        taxableSales += estimatedTaxBase;
        outputTax += estimatedTax;
      }
    }
  }

  const exemptSales = totalSales - taxableSales;

  // ── 5. Calculate Input Tax (from purchases) ──────────────────────────────────
  let totalPurchases = 0;
  let inputTax = 0;

  for (const inv of purchaseInvoices) {
    const invTotal = Number(inv.total || 0);
    totalPurchases += invTotal;

    if (inv.items.length > 0) {
      for (const item of inv.items) {
        const itemTax = Number(item.amount || 0) * (Number(item.taxPercent || 0) / 100);
        inputTax += itemTax;
      }
    } else if (inv.taxConfig?.taxType === "GST") {
      const gstRate = Number(inv.taxConfig.taxRate || 17) / 100;
      const base = invTotal / (1 + gstRate);
      inputTax += invTotal - base;
    }
  }

  const netSalesTax = Math.max(0, outputTax - inputTax);

  // ── 6. Calculate Income Tax ──────────────────────────────────────────────────
  const grossRevenue = totalSales;
  const totalExpenses =
    totalPurchases +
    expenseVouchers.reduce((sum, ev) => sum + Number(ev.totalAmount || 0), 0);
  const netIncome = grossRevenue - totalExpenses;

  // Pakistan company tax rate is 29%; use slab for individual/AOP
  const isAnnual = !period.quarter && !period.month;
  let estimatedTax = 0;
  let taxableIncome = Math.max(0, netIncome);

  if (isAnnual) {
    estimatedTax = netIncome > 0
      ? Math.round(taxableIncome * COMPANY_TAX_RATE)
      : 0;
  } else {
    // Annualize for quarterly estimation
    const monthsInPeriod = period.month ? 1 : 3;
    const annualizedIncome = Math.max(0, netIncome) * (12 / monthsInPeriod);
    const annualTax = annualizedIncome > 0
      ? calculateIncomeTax(annualizedIncome).tax
      : 0;
    estimatedTax = Math.round(annualTax * (monthsInPeriod / 12));
  }

  // Advance tax already paid (query bank statements / vouchers for FBR payments)
  let advanceTaxPaid = 0;
  try {
    const taxPayments = await prisma.expenseVoucher.findMany({
      where: {
        companyId,
        deletedAt: null,
        date: { gte: start, lte: end },
        OR: [
          { description: { contains: "FBR", mode: "insensitive" } },
          { description: { contains: "income tax", mode: "insensitive" } },
          { description: { contains: "advance tax", mode: "insensitive" } },
          { description: { contains: "tax payment", mode: "insensitive" } },
        ],
      },
      select: { totalAmount: true },
    });
    advanceTaxPaid = taxPayments.reduce((sum, v) => sum + Number(v.totalAmount || 0), 0);
  } catch (error) {
    console.error("FBR: Failed to load advance tax payments:", error);
  }

  const balanceTax = Math.max(0, estimatedTax - advanceTaxPaid);

  // ── 7. WHT (Withholding Tax) ──────────────────────────────────────────────────
  // 4% on registered suppliers, 8% on unregistered (simplified estimate)
  const whtDeducted = Math.round(totalPurchases * 0.04);
  const whtCollected = Math.round(totalSales * 0.01); // ~1% from customers
  const whtNet = whtDeducted - whtCollected;

  // ── 8. Total Liability & Deadline ────────────────────────────────────────────
  const totalTaxLiability = Math.round(netSalesTax + balanceTax + Math.max(0, whtNet));
  const deadline = getFbrDeadline(period);
  const penaltyIfLate = Math.round(totalTaxLiability * 0.05); // 5% per month

  // ── 9. Top Customers ──────────────────────────────────────────────────────────
  const customerMap: Record<string, { revenue: number; tax: number }> = {};
  for (const inv of salesInvoices) {
    const name = inv.customer?.name || "Unknown";
    if (!customerMap[name]) customerMap[name] = { revenue: 0, tax: 0 };
    customerMap[name].revenue += Number(inv.total || 0);
    customerMap[name].tax += Number(inv.total || 0) * GST_STANDARD_RATE;
  }
  const topCustomers = Object.entries(customerMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((c) => ({ name: c.name, revenue: Math.round(c.revenue), tax: Math.round(c.tax) }));

  // ── 10. Top Expense Categories ────────────────────────────────────────────────
  const expenseCategoryMap: Record<string, number> = {};
  for (const ev of expenseVouchers) {
    for (const item of ev.items) {
      const cat = item.category || "Other";
      expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + Number(item.amount || 0);
    }
  }
  // Non-deductible categories under FBR rules
  const NON_DEDUCTIBLE = new Set(["ENTERTAINMENT", "PERSONAL", "DONATION"]);
  const topExpenses = Object.entries(expenseCategoryMap)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount),
      taxDeductible: !NON_DEDUCTIBLE.has(category.toUpperCase()),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // ── 11. Recommendations ───────────────────────────────────────────────────────
  const recommendations: string[] = [];

  if (netSalesTax > 0) {
    recommendations.push(
      `File monthly GST return by the 15th to avoid penalties. Net GST payable: PKR ${Math.round(netSalesTax).toLocaleString()}.`,
    );
  }
  if (inputTax > outputTax) {
    recommendations.push(
      `You have an input tax excess of PKR ${Math.round(inputTax - outputTax).toLocaleString()}. File for GST refund.`,
    );
  }
  if (balanceTax > 0) {
    recommendations.push(
      `Income tax balance of PKR ${Math.round(balanceTax).toLocaleString()} is due. Pay advance tax by ${deadline.toDateString()} to avoid surcharge.`,
    );
  }
  if (advanceTaxPaid === 0 && estimatedTax > 0) {
    recommendations.push(
      "No advance tax payments detected. Consider paying quarterly advance tax to avoid year-end interest charges.",
    );
  }
  if (totalTaxLiability > 0) {
    recommendations.push(
      `Total tax liability this period: PKR ${totalTaxLiability.toLocaleString()}. Late filing penalty is 5% per month — file on time.`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push("Tax position looks clean. Ensure all invoices are filed and your FBR portal is up to date.");
  }

  return {
    period: periodLabel,
    companyId,
    generatedAt: new Date().toISOString(),

    salesTax: {
      totalSales: Math.round(totalSales),
      taxableSales: Math.round(taxableSales),
      exemptSales: Math.round(exemptSales),
      outputTax: Math.round(outputTax),
      inputTax: Math.round(inputTax),
      netTax: Math.round(netSalesTax),
    },

    incomeTax: {
      grossRevenue: Math.round(grossRevenue),
      totalExpenses: Math.round(totalExpenses),
      netIncome: Math.round(netIncome),
      taxableIncome: Math.round(taxableIncome),
      estimatedTax,
      advanceTaxPaid: Math.round(advanceTaxPaid),
      balanceTax: Math.round(balanceTax),
    },

    withholdingTax: {
      collected: Math.round(whtCollected),
      deducted: Math.round(whtDeducted),
      net: Math.round(whtNet),
    },

    summary: {
      totalTaxLiability,
      dueDate: deadline.toISOString().split("T")[0],
      penaltyIfLate,
      recommendations,
    },

    rawData: {
      topCustomers,
      topExpenses,
    },
  };
}

// ─── AI Plain-English Summary ─────────────────────────────────────────────────

export async function generateFbrSummaryText(report: FbrTaxReport): Promise<string> {
  const fallback = buildFbrSummaryFallback(report);

  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Generate a clear, professional plain-English FBR tax summary for a Pakistani business.

REPORT PERIOD: ${report.period}
GENERATED: ${new Date(report.generatedAt).toDateString()}

SALES TAX (GST):
- Total Sales: PKR ${report.salesTax.totalSales.toLocaleString()}
- Taxable Sales: PKR ${report.salesTax.taxableSales.toLocaleString()}
- Output Tax (17% GST collected): PKR ${report.salesTax.outputTax.toLocaleString()}
- Input Tax (GST paid on purchases): PKR ${report.salesTax.inputTax.toLocaleString()}
- Net GST Payable: PKR ${report.salesTax.netTax.toLocaleString()}

INCOME TAX:
- Gross Revenue: PKR ${report.incomeTax.grossRevenue.toLocaleString()}
- Total Expenses: PKR ${report.incomeTax.totalExpenses.toLocaleString()}
- Net Income: PKR ${report.incomeTax.netIncome.toLocaleString()}
- Estimated Tax: PKR ${report.incomeTax.estimatedTax.toLocaleString()}
- Advance Tax Paid: PKR ${report.incomeTax.advanceTaxPaid.toLocaleString()}
- Balance Tax Due: PKR ${report.incomeTax.balanceTax.toLocaleString()}

WITHHOLDING TAX:
- WHT Collected from Customers: PKR ${report.withholdingTax.collected.toLocaleString()}
- WHT Deducted from Suppliers: PKR ${report.withholdingTax.deducted.toLocaleString()}

TOTAL TAX LIABILITY: PKR ${report.summary.totalTaxLiability.toLocaleString()}
FILING DUE DATE: ${report.summary.dueDate}

Write a 3-4 paragraph plain English summary covering:
1. Overall tax position and key numbers
2. GST situation and whether a refund or payment is due
3. Income tax position and any balance due
4. Key action items for the business owner

Use simple language. Be direct and practical. Include specific PKR amounts.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a Pakistani tax advisor helping SME owners understand their FBR tax obligations. Write in clear, jargon-free English.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() || fallback;
  } catch (error) {
    console.error("generateFbrSummaryText AI error:", error);
    return fallback;
  }
}

function buildFbrSummaryFallback(report: FbrTaxReport): string {
  const fmt = (n: number) => `PKR ${n.toLocaleString()}`;
  const lines: string[] = [
    `FBR Tax Summary — ${report.period}`,
    ``,
    `Sales Tax (GST): Total sales of ${fmt(report.salesTax.totalSales)}, with ${fmt(report.salesTax.taxableSales)} taxable. Output GST collected: ${fmt(report.salesTax.outputTax)}. Input GST on purchases: ${fmt(report.salesTax.inputTax)}. Net GST ${report.salesTax.netTax >= 0 ? "payable" : "refundable"}: ${fmt(Math.abs(report.salesTax.netTax))}.`,
    ``,
    `Income Tax: Net income of ${fmt(report.incomeTax.netIncome)}. Estimated tax: ${fmt(report.incomeTax.estimatedTax)}. Advance tax paid: ${fmt(report.incomeTax.advanceTaxPaid)}. Balance due: ${fmt(report.incomeTax.balanceTax)}.`,
    ``,
    `Total Tax Liability: ${fmt(report.summary.totalTaxLiability)}. Filing due: ${report.summary.dueDate}. Late penalty: ${fmt(report.summary.penaltyIfLate)} per month.`,
    ``,
    `Recommendations:`,
    ...report.summary.recommendations.map((r) => `• ${r}`),
  ];
  return lines.join("\n");
}
