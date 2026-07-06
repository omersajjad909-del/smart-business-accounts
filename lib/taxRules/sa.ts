import type { TaxCountryEngine, TaxEngineInput, TaxReport } from "./types";

export const SaudiTaxEngine: TaxCountryEngine = {
  countryCode: "SA",
  countryName: "Saudi Arabia",
  flagEmoji: "🇸🇦",
  currencies: ["SAR"],

  buildReport(input: TaxEngineInput): TaxReport {
    const { outputTax, inputTax, annualRevenue, annualExpenses, month, year } = input;
    const netPayable = outputTax - inputTax;
    const annualProfit = Math.max(0, annualRevenue - annualExpenses);

    // Zakat: 2.5% on net assets (approximated from profit for non-Saudi entities use CIT 20%)
    const zakat = Math.round(annualProfit * 0.025);

    const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const qEnd = month === 11 ? 0 : month + 1;
    const qYear = month === 11 ? year + 1 : year;

    return {
      country: "Saudi Arabia",
      countryCode: "SA",
      flagEmoji: "🇸🇦",
      reportTitle: "ZATCA Tax Report",
      lawReference: "ZATCA 2024 (VAT 15% + Zakat)",
      currency: "SAR",
      salesTax: {
        outputTax: Math.round(outputTax),
        inputTax: Math.round(inputTax),
        netPayable: Math.round(Math.abs(netPayable)),
        isRefundable: netPayable < 0,
        filingDeadline: `Last day of ${names[qEnd]} ${qYear}`,
        taxName: "VAT",
        standardRate: 0.15,
      },
      incomeTax: {
        annualNetProfitEstimate: Math.round(annualProfit),
        estimatedTax: zakat,
        effectiveRate: annualProfit > 0 ? 2.5 : 0,
        slabBreakdown: annualProfit > 0 ? [{
          slab: "Annual Net Assets (estimated)",
          taxableAmount: Math.round(annualProfit),
          tax: zakat,
        }] : [],
        filingDeadline: "Within 120 days of fiscal year end",
        taxName: "Zakat (2.5%)",
      },
      wht: { estimatedOnPurchases: 0, registered: 0, unregistered: 0, applicable: false },
      notes: [
        "VAT 15% — monthly/quarterly return via ZATCA Fatoorah portal",
        "Zakat 2.5% on net assets for Saudi nationals/GCC entities",
        "Foreign companies pay CIT 20% on Saudi-source income",
        "E-invoicing (Fatoorah) mandatory for all VAT-registered businesses",
      ],
    };
  },
};
