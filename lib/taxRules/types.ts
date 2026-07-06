export interface SlabBreakdown {
  slab: string;
  taxableAmount: number;
  tax: number;
}

export interface SalesTaxResult {
  outputTax: number;
  inputTax: number;
  netPayable: number;
  isRefundable: boolean;
  filingDeadline: string;
  taxName: string;       // "GST", "VAT", "Sales Tax"
  standardRate: number;  // e.g. 0.17
}

export interface IncomeTaxResult {
  annualNetProfitEstimate: number;
  estimatedTax: number;
  effectiveRate: number;
  slabBreakdown: SlabBreakdown[];
  filingDeadline: string;
  taxName: string;       // "Income Tax", "Corporate Tax", "Zakat"
}

export interface WhtResult {
  estimatedOnPurchases: number;
  registered: number;
  unregistered: number;
  applicable: boolean;
}

export interface TaxReport {
  country: string;
  countryCode: string;
  flagEmoji: string;
  reportTitle: string;
  lawReference: string;     // e.g. "FBR Finance Act 2024-25"
  currency: string;
  salesTax: SalesTaxResult;
  incomeTax: IncomeTaxResult;
  wht: WhtResult;
  notes: string[];          // country-specific notes / deadlines
}

export interface TaxEngineInput {
  outputTax: number;
  inputTax: number;
  annualRevenue: number;
  annualExpenses: number;
  totalPurchases: number;
  month: number;            // 0-indexed
  year: number;
  currency: string;
}

export interface TaxCountryEngine {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  currencies: string[];     // accepted currencies for this country
  buildReport(input: TaxEngineInput): TaxReport;
}
