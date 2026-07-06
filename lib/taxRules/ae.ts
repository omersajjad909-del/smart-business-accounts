import type { TaxCountryEngine, TaxEngineInput, TaxReport } from "./types";

function filingDeadline(month: number, year: number): string {
  const m = month === 11 ? 0 : month + 1;
  const y = month === 11 ? year + 1 : year;
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `28 ${names[m]} ${y}`;
}

export const UAETaxEngine: TaxCountryEngine = {
  countryCode: "AE",
  countryName: "United Arab Emirates",
  flagEmoji: "🇦🇪",
  currencies: ["AED"],

  buildReport(input: TaxEngineInput): TaxReport {
    const { outputTax, inputTax, annualRevenue, annualExpenses, month, year } = input;
    const netPayable = outputTax - inputTax;
    const annualProfit = Math.max(0, annualRevenue - annualExpenses);

    // UAE Corporate Tax: 9% on profit above AED 375,000 (from June 2023)
    const UAE_CT_THRESHOLD = 375_000;
    const taxableProfit = Math.max(0, annualProfit - UAE_CT_THRESHOLD);
    const corporateTax = Math.round(taxableProfit * 0.09);
    const effectiveRate = annualProfit > 0 ? parseFloat(((corporateTax / annualProfit) * 100).toFixed(2)) : 0;

    return {
      country: "United Arab Emirates",
      countryCode: "AE",
      flagEmoji: "🇦🇪",
      reportTitle: "FTA Tax Report",
      lawReference: "UAE Federal Tax Authority 2024",
      currency: "AED",
      salesTax: {
        outputTax: Math.round(outputTax),
        inputTax: Math.round(inputTax),
        netPayable: Math.round(Math.abs(netPayable)),
        isRefundable: netPayable < 0,
        filingDeadline: filingDeadline(month, year),
        taxName: "VAT",
        standardRate: 0.05,
      },
      incomeTax: {
        annualNetProfitEstimate: Math.round(annualProfit),
        estimatedTax: corporateTax,
        effectiveRate,
        slabBreakdown: annualProfit > UAE_CT_THRESHOLD ? [{
          slab: `Above AED ${UAE_CT_THRESHOLD.toLocaleString()}`,
          taxableAmount: Math.round(taxableProfit),
          tax: corporateTax,
        }] : [],
        filingDeadline: "9 months after financial year end",
        taxName: "Corporate Tax (9%)",
      },
      wht: { estimatedOnPurchases: 0, registered: 0, unregistered: 0, applicable: false },
      notes: [
        "VAT 5% — quarterly return due 28th of month following quarter",
        "Corporate Tax 9% on profit above AED 375,000 (effective June 2023)",
        "No personal income tax in UAE",
        "Free zone businesses may qualify for 0% CT under qualifying conditions",
      ],
    };
  },
};
