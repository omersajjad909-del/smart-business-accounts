import type { TaxCountryEngine, TaxEngineInput, TaxReport, SlabBreakdown } from "./types";

const INCOME_TAX_SLABS = [
  { min: 0,         max: 600_000,    rate: 0,    fixedTax: 0 },
  { min: 600_001,   max: 1_200_000,  rate: 0.05, fixedTax: 0 },
  { min: 1_200_001, max: 2_200_000,  rate: 0.15, fixedTax: 30_000 },
  { min: 2_200_001, max: 3_200_000,  rate: 0.25, fixedTax: 180_000 },
  { min: 3_200_001, max: 4_100_000,  rate: 0.30, fixedTax: 430_000 },
  { min: 4_100_001, max: Infinity,   rate: 0.35, fixedTax: 700_000 },
];

function calcIncomeTax(annualProfit: number): { tax: number; effectiveRate: number; slabBreakdown: SlabBreakdown[] } {
  if (annualProfit <= 0) return { tax: 0, effectiveRate: 0, slabBreakdown: [] };

  const slab = [...INCOME_TAX_SLABS].reverse().find(s => annualProfit > s.min) ?? INCOME_TAX_SLABS[0];
  const tax = Math.round(slab.fixedTax + (annualProfit - slab.min) * slab.rate);
  const effectiveRate = parseFloat(((tax / annualProfit) * 100).toFixed(2));

  const slabBreakdown: SlabBreakdown[] = INCOME_TAX_SLABS
    .filter(s => annualProfit > s.min && s.rate > 0)
    .map(s => {
      const taxable = Math.min(annualProfit, s.max === Infinity ? annualProfit : s.max) - s.min;
      return {
        slab: s.max === Infinity ? `Above PKR ${s.min.toLocaleString()}` : `PKR ${(s.min + 1).toLocaleString()} – ${s.max.toLocaleString()}`,
        taxableAmount: Math.round(taxable),
        tax: Math.round(taxable * s.rate),
      };
    });

  return { tax, effectiveRate, slabBreakdown };
}

function filingDeadline(month: number, year: number): string {
  const m = month === 11 ? 0 : month + 1;
  const y = month === 11 ? year + 1 : year;
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `15 ${names[m]} ${y}`;
}

export const PakistanTaxEngine: TaxCountryEngine = {
  countryCode: "PK",
  countryName: "Pakistan",
  flagEmoji: "🇵🇰",
  currencies: ["PKR"],

  buildReport(input: TaxEngineInput): TaxReport {
    const { outputTax, inputTax, annualRevenue, annualExpenses, totalPurchases, month, year } = input;
    const netPayable = outputTax - inputTax;
    const annualProfit = Math.max(0, annualRevenue - annualExpenses);
    const itCalc = calcIncomeTax(annualProfit);

    return {
      country: "Pakistan",
      countryCode: "PK",
      flagEmoji: "🇵🇰",
      reportTitle: "FBR Tax Report",
      lawReference: "FBR Finance Act 2024-25",
      currency: "PKR",
      salesTax: {
        outputTax: Math.round(outputTax),
        inputTax: Math.round(inputTax),
        netPayable: Math.round(Math.abs(netPayable)),
        isRefundable: netPayable < 0,
        filingDeadline: filingDeadline(month, year),
        taxName: "GST",
        standardRate: 0.17,
      },
      incomeTax: {
        annualNetProfitEstimate: Math.round(annualProfit),
        estimatedTax: itCalc.tax,
        effectiveRate: itCalc.effectiveRate,
        slabBreakdown: itCalc.slabBreakdown,
        filingDeadline: "30 September " + year,
        taxName: "Income Tax",
      },
      wht: {
        estimatedOnPurchases: Math.round(totalPurchases * 0.04),
        registered: Math.round(totalPurchases * 0.04),
        unregistered: Math.round(totalPurchases * 0.08),
        applicable: true,
      },
      notes: [
        "Monthly GST return due by 15th of following month via IRIS portal",
        "Annual income tax return due September 30 (individuals/AOP)",
        "Advance tax payable quarterly: Sep 15, Dec 15, Mar 15, Jun 15",
        "WHT: 4% on registered suppliers, 8% on unregistered",
      ],
    };
  },
};
