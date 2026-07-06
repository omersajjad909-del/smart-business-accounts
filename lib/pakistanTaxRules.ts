export const INCOME_TAX_SLABS_INDIVIDUAL = [
  { min: 0,         max: 600_000,    rate: 0,    fixedTax: 0 },
  { min: 600_001,   max: 1_200_000,  rate: 0.05, fixedTax: 0 },
  { min: 1_200_001, max: 2_200_000,  rate: 0.15, fixedTax: 30_000 },
  { min: 2_200_001, max: 3_200_000,  rate: 0.25, fixedTax: 180_000 },
  { min: 3_200_001, max: 4_100_000,  rate: 0.30, fixedTax: 430_000 },
  { min: 4_100_001, max: Infinity,   rate: 0.35, fixedTax: 700_000 },
];

export const COMPANY_TAX_RATE = 0.29;

export const GST_STANDARD_RATE = 0.17;
export const GST_REDUCED_RATE = 0.10;
export const GST_ZERO_RATED = 0.0;

export const GST_ZERO_RATED_CATEGORIES = ["export", "wheat", "rice", "sugar"];
export const GST_EXEMPT_CATEGORIES = ["healthcare", "education", "agriculture"];

export const FILING_DEADLINES = {
  gstMonthly: "15th of following month",
  incomeTaxAnnual: "September 30",
  incomeTaxCompany: "December 31",
  advanceTaxQ1: "September 15",
  advanceTaxQ2: "December 15",
  advanceTaxQ3: "March 15",
  advanceTaxQ4: "June 15",
};

export const WHT_RATES = {
  supplier_registered: 0.04,
  supplier_unregistered: 0.08,
  salary_above_threshold: 0,
  rent: 0.15,
  services_contract: 0.08,
};

export interface SlabBreakdown {
  slab: string;
  taxableAmount: number;
  tax: number;
}

export function calculateIncomeTax(annualProfit: number): {
  tax: number;
  effectiveRate: number;
  slabBreakdown: SlabBreakdown[];
} {
  if (annualProfit <= 0) return { tax: 0, effectiveRate: 0, slabBreakdown: [] };

  // FBR method: find the applicable slab, apply fixedTax + rate on excess
  const applicableSlab = [...INCOME_TAX_SLABS_INDIVIDUAL].reverse().find(s => annualProfit > s.min)
    ?? INCOME_TAX_SLABS_INDIVIDUAL[0];

  const excessOver = annualProfit - applicableSlab.min;
  const tax = Math.round(applicableSlab.fixedTax + excessOver * applicableSlab.rate);
  const effectiveRate = parseFloat(((tax / annualProfit) * 100).toFixed(2));

  // Build breakdown: show each slab that contributes tax
  const slabBreakdown: SlabBreakdown[] = INCOME_TAX_SLABS_INDIVIDUAL
    .filter(s => annualProfit > s.min && s.rate > 0)
    .map(s => {
      const taxableInSlab = Math.min(annualProfit, s.max === Infinity ? annualProfit : s.max) - s.min;
      return {
        slab: s.max === Infinity
          ? `Above PKR ${s.min.toLocaleString()}`
          : `PKR ${(s.min + 1).toLocaleString()} – ${s.max.toLocaleString()}`,
        taxableAmount: Math.round(taxableInSlab),
        tax: Math.round(taxableInSlab * s.rate),
      };
    });

  return { tax, effectiveRate, slabBreakdown };
}

export function calculateGSTMonth(
  outputTax: number,
  inputTax: number,
  month: number,
  year: number,
): {
  netPayable: number;
  isRefundable: boolean;
  filingDeadline: string;
} {
  const netPayable = outputTax - inputTax;
  const isRefundable = netPayable < 0;
  return {
    netPayable: Math.round(Math.abs(netPayable)),
    isRefundable,
    filingDeadline: getFilingDeadlineForMonth(month, year),
  };
}

export function getFilingDeadlineForMonth(month: number, year: number): string {
  const followingMonth = month === 11 ? 0 : month + 1;
  const followingYear = month === 11 ? year + 1 : year;
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `15 ${monthNames[followingMonth]} ${followingYear}`;
}
