import type { TaxCountryEngine, TaxEngineInput, TaxReport, SlabBreakdown } from "./types";

// UK Income Tax Slabs 2024-25
const UK_IT_SLABS = [
  { min: 0,         max: 12_570,   rate: 0,    label: "Personal Allowance" },
  { min: 12_571,    max: 50_270,   rate: 0.20, label: "Basic Rate" },
  { min: 50_271,    max: 125_140,  rate: 0.40, label: "Higher Rate" },
  { min: 125_141,   max: Infinity, rate: 0.45, label: "Additional Rate" },
];

function calcIncomeTax(annualProfit: number): { tax: number; effectiveRate: number; slabBreakdown: SlabBreakdown[] } {
  if (annualProfit <= 0) return { tax: 0, effectiveRate: 0, slabBreakdown: [] };

  let tax = 0;
  const slabBreakdown: SlabBreakdown[] = [];

  for (const s of UK_IT_SLABS) {
    if (annualProfit <= s.min) break;
    const taxable = Math.min(annualProfit, s.max === Infinity ? annualProfit : s.max) - s.min;
    const slabTax = taxable * s.rate;
    if (s.rate > 0) {
      slabBreakdown.push({
        slab: `£${(s.min + 1).toLocaleString("en-GB")} – ${s.max === Infinity ? "above" : "£" + s.max.toLocaleString("en-GB")} (${s.label})`,
        taxableAmount: Math.round(taxable),
        tax: Math.round(slabTax),
      });
    }
    tax += slabTax;
  }

  // National Insurance Class 4: 9% on profits £12,570–£50,270, 2% above
  let ni = 0;
  if (annualProfit > 12_570) {
    ni += Math.min(annualProfit, 50_270) - 12_570;
    ni *= 0.09;
  }
  if (annualProfit > 50_270) {
    ni += (annualProfit - 50_270) * 0.02;
  }
  ni = Math.round(ni);

  const effectiveRate = parseFloat((((tax + ni) / annualProfit) * 100).toFixed(2));
  return { tax: Math.round(tax) + ni, effectiveRate, slabBreakdown };
}

function filingDeadline(month: number, year: number): string {
  const m = month === 11 ? 0 : month + 1;
  const y = month === 11 ? year + 1 : year;
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `7 ${names[m]} ${y}`;
}

export const UKTaxEngine: TaxCountryEngine = {
  countryCode: "GB",
  countryName: "United Kingdom",
  flagEmoji: "🇬🇧",
  currencies: ["GBP"],

  buildReport(input: TaxEngineInput): TaxReport {
    const { outputTax, inputTax, annualRevenue, annualExpenses, month, year } = input;
    const netPayable = outputTax - inputTax;
    const annualProfit = Math.max(0, annualRevenue - annualExpenses);
    const itCalc = calcIncomeTax(annualProfit);

    return {
      country: "United Kingdom",
      countryCode: "GB",
      flagEmoji: "🇬🇧",
      reportTitle: "HMRC Tax Report",
      lawReference: "HMRC Finance Act 2024-25",
      currency: "GBP",
      salesTax: {
        outputTax: Math.round(outputTax),
        inputTax: Math.round(inputTax),
        netPayable: Math.round(Math.abs(netPayable)),
        isRefundable: netPayable < 0,
        filingDeadline: filingDeadline(month, year),
        taxName: "VAT",
        standardRate: 0.20,
      },
      incomeTax: {
        annualNetProfitEstimate: Math.round(annualProfit),
        estimatedTax: itCalc.tax,
        effectiveRate: itCalc.effectiveRate,
        slabBreakdown: itCalc.slabBreakdown,
        filingDeadline: "31 January " + (year + 1),
        taxName: "Income Tax + NI Class 4",
      },
      wht: { estimatedOnPurchases: 0, registered: 0, unregistered: 0, applicable: false },
      notes: [
        "VAT 20% standard rate — quarterly return due 7th of month after quarter end",
        "Self-assessment return due 31 January online (prior tax year)",
        "National Insurance Class 4: 9% on profits £12,570–£50,270; 2% above",
        "Personal allowance £12,570 (2024-25)",
        "Making Tax Digital (MTD) required for VAT-registered businesses",
      ],
    };
  },
};
