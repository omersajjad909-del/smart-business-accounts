import type { TaxCountryEngine, TaxEngineInput, TaxReport, SlabBreakdown } from "./types";

// India Income Tax Slabs FY 2024-25 (New Regime — default)
const INDIA_IT_SLABS = [
  { min: 0,          max: 300_000,    rate: 0 },
  { min: 300_001,    max: 600_000,    rate: 0.05 },
  { min: 600_001,    max: 900_000,    rate: 0.10 },
  { min: 900_001,    max: 1_200_000,  rate: 0.15 },
  { min: 1_200_001,  max: 1_500_000,  rate: 0.20 },
  { min: 1_500_001,  max: Infinity,   rate: 0.30 },
];

function calcIncomeTax(annualProfit: number): { tax: number; effectiveRate: number; slabBreakdown: SlabBreakdown[] } {
  if (annualProfit <= 0) return { tax: 0, effectiveRate: 0, slabBreakdown: [] };

  let tax = 0;
  const slabBreakdown: SlabBreakdown[] = [];

  for (const s of INDIA_IT_SLABS) {
    if (annualProfit <= s.min) break;
    const taxable = Math.min(annualProfit, s.max === Infinity ? annualProfit : s.max) - s.min;
    const slabTax = taxable * s.rate;
    if (s.rate > 0) {
      slabBreakdown.push({
        slab: s.max === Infinity ? `Above ₹${s.min.toLocaleString("en-IN")}` : `₹${(s.min+1).toLocaleString("en-IN")} – ₹${s.max.toLocaleString("en-IN")}`,
        taxableAmount: Math.round(taxable),
        tax: Math.round(slabTax),
      });
    }
    tax += slabTax;
  }

  // 4% health & education cess
  tax = tax * 1.04;
  const effectiveRate = parseFloat(((tax / annualProfit) * 100).toFixed(2));
  return { tax: Math.round(tax), effectiveRate, slabBreakdown };
}

function filingDeadline(month: number, year: number): string {
  const m = month === 11 ? 0 : month + 1;
  const y = month === 11 ? year + 1 : year;
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `20 ${names[m]} ${y}`;
}

export const IndiaTaxEngine: TaxCountryEngine = {
  countryCode: "IN",
  countryName: "India",
  flagEmoji: "🇮🇳",
  currencies: ["INR"],

  buildReport(input: TaxEngineInput): TaxReport {
    const { outputTax, inputTax, annualRevenue, annualExpenses, totalPurchases, month, year } = input;
    const netPayable = outputTax - inputTax;
    const annualProfit = Math.max(0, annualRevenue - annualExpenses);
    const itCalc = calcIncomeTax(annualProfit);

    return {
      country: "India",
      countryCode: "IN",
      flagEmoji: "🇮🇳",
      reportTitle: "GST & Income Tax Report",
      lawReference: "Indian Income Tax Act + GST Act 2024-25",
      currency: "INR",
      salesTax: {
        outputTax: Math.round(outputTax),
        inputTax: Math.round(inputTax),
        netPayable: Math.round(Math.abs(netPayable)),
        isRefundable: netPayable < 0,
        filingDeadline: filingDeadline(month, year),
        taxName: "GST",
        standardRate: 0.18,
      },
      incomeTax: {
        annualNetProfitEstimate: Math.round(annualProfit),
        estimatedTax: itCalc.tax,
        effectiveRate: itCalc.effectiveRate,
        slabBreakdown: itCalc.slabBreakdown,
        filingDeadline: "31 July " + year,
        taxName: "Income Tax + 4% Cess",
      },
      wht: {
        estimatedOnPurchases: Math.round(totalPurchases * 0.01),
        registered: Math.round(totalPurchases * 0.01),
        unregistered: Math.round(totalPurchases * 0.02),
        applicable: true,
      },
      notes: [
        "GST rates: 5% / 12% / 18% / 28% depending on product/service",
        "GSTR-1 due 11th, GSTR-3B due 20th of following month",
        "Income tax return due July 31 (non-audit cases)",
        "TDS: 1% on purchases from registered, 2% from unregistered",
        "4% Health & Education Cess added to income tax",
      ],
    };
  },
};
