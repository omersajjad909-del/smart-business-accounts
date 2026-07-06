import type { TaxCountryEngine, TaxEngineInput, TaxReport, SlabBreakdown } from "./types";

// US Federal Income Tax Brackets 2024 (Single filer)
const US_IT_BRACKETS = [
  { min: 0,          max: 11_600,   rate: 0.10 },
  { min: 11_601,     max: 47_150,   rate: 0.12 },
  { min: 47_151,     max: 100_525,  rate: 0.22 },
  { min: 100_526,    max: 191_950,  rate: 0.24 },
  { min: 191_951,    max: 243_725,  rate: 0.32 },
  { min: 243_726,    max: 609_350,  rate: 0.35 },
  { min: 609_351,    max: Infinity, rate: 0.37 },
];

// Standard deduction 2024
const STANDARD_DEDUCTION = 14_600;

function calcFederalTax(annualProfit: number): { tax: number; effectiveRate: number; slabBreakdown: SlabBreakdown[] } {
  if (annualProfit <= 0) return { tax: 0, effectiveRate: 0, slabBreakdown: [] };

  const taxableIncome = Math.max(0, annualProfit - STANDARD_DEDUCTION);
  let tax = 0;
  const slabBreakdown: SlabBreakdown[] = [];

  for (const b of US_IT_BRACKETS) {
    if (taxableIncome <= b.min) break;
    const taxable = Math.min(taxableIncome, b.max === Infinity ? taxableIncome : b.max) - b.min;
    const bracketTax = taxable * b.rate;
    slabBreakdown.push({
      slab: b.max === Infinity
        ? `Above $${b.min.toLocaleString()} (${(b.rate * 100).toFixed(0)}%)`
        : `$${(b.min + 1).toLocaleString()} – $${b.max.toLocaleString()} (${(b.rate * 100).toFixed(0)}%)`,
      taxableAmount: Math.round(taxable),
      tax: Math.round(bracketTax),
    });
    tax += bracketTax;
  }

  // Self-employment tax: 15.3% on net earnings (up to $168,600 for SS portion)
  const ssTax = Math.min(annualProfit, 168_600) * 0.124;
  const medicareTax = annualProfit * 0.029;
  const seTax = Math.round(ssTax + medicareTax);

  const totalTax = Math.round(tax) + seTax;
  const effectiveRate = parseFloat(((totalTax / annualProfit) * 100).toFixed(2));
  return { tax: totalTax, effectiveRate, slabBreakdown };
}

function filingDeadline(month: number, year: number): string {
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const m = month === 11 ? 0 : month + 1;
  const y = month === 11 ? year + 1 : year;
  return `15 ${names[m]} ${y}`;
}

export const USTaxEngine: TaxCountryEngine = {
  countryCode: "US",
  countryName: "United States",
  flagEmoji: "🇺🇸",
  currencies: ["USD"],

  buildReport(input: TaxEngineInput): TaxReport {
    const { outputTax, inputTax, annualRevenue, annualExpenses, totalPurchases, month, year } = input;
    const netPayable = outputTax - inputTax;
    const annualProfit = Math.max(0, annualRevenue - annualExpenses);
    const itCalc = calcFederalTax(annualProfit);

    return {
      country: "United States",
      countryCode: "US",
      flagEmoji: "🇺🇸",
      reportTitle: "IRS Federal Tax Report",
      lawReference: "IRS Tax Code 2024",
      currency: "USD",
      salesTax: {
        outputTax: Math.round(outputTax),
        inputTax: Math.round(inputTax),
        netPayable: Math.round(Math.abs(netPayable)),
        isRefundable: netPayable < 0,
        filingDeadline: filingDeadline(month, year),
        taxName: "Sales Tax",
        standardRate: 0.07,
      },
      incomeTax: {
        annualNetProfitEstimate: Math.round(annualProfit),
        estimatedTax: itCalc.tax,
        effectiveRate: itCalc.effectiveRate,
        slabBreakdown: itCalc.slabBreakdown,
        filingDeadline: "15 April " + (year + 1),
        taxName: "Federal Income Tax + SE Tax",
      },
      wht: {
        estimatedOnPurchases: Math.round(totalPurchases * 0.24),
        registered: Math.round(totalPurchases * 0.24),
        unregistered: Math.round(totalPurchases * 0.28),
        applicable: true,
      },
      notes: [
        "No federal VAT — sales tax is state-level (varies 0–10%, avg ~7%)",
        "Federal income tax return due April 15 (Form 1040 / 1120)",
        "Self-employment tax: 15.3% (SS 12.4% + Medicare 2.9%) on net earnings",
        "Standard deduction $14,600 (single filer, 2024)",
        "Quarterly estimated tax payments: Apr 15, Jun 17, Sep 16, Jan 15",
        "Backup withholding 24% for payments without valid TIN",
      ],
    };
  },
};
