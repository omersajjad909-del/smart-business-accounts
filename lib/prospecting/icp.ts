/**
 * Who FinovaOS is actually for, encoded so the scorer and the drafter agree.
 *
 * Kept as plain data rather than a prompt string because the deterministic
 * half of the score has to be reproducible: the same company scored twice on
 * the same facts must land on the same number, or the review queue stops
 * meaning anything.
 */

export const FINOVA_PITCH = `FinovaOS is a business accounting and operations platform: invoicing, inventory across multiple warehouses, purchase and sales orders, expenses, payroll, multi-currency, financial reports, WhatsApp notifications, and 60+ industry-specific modules. It replaces the Excel-plus-paper stack most small and mid-size businesses in South Asia and the Gulf still run on. Pricing starts at $49/month. It is a paid product — there is no free trial; the offer is a walkthrough or a demo call.`;

/** Business-type ids (lib/businessTypes.ts) ranked by how well we serve them. */
export const ICP_TIERS: Record<string, number> = {
  // Core — inventory + multi-location + party ledgers, exactly our shape.
  trading: 20, distribution: 20, wholesale: 20, import_company: 20,
  export_company: 20, manufacturing: 20, cold_storage: 20, hardware: 20,
  garments: 19, food_processing: 19, clearing_forwarding: 19, textile_mill: 19,
  supermarket: 18, pharmacy: 18, retail: 18, ecommerce: 18, steel_mill: 18,
  automotive: 17, chemical: 17, shipping: 17, transport: 17, courier: 17,
  // Strong — we cover them well, less inventory pull.
  construction: 15, printing: 15, solar: 15, bakery: 15, agriculture: 15,
  restaurant: 14, hotel: 14, franchise: 14, events: 14, repair: 14,
  water_plant: 14, mining: 13, oil_gas: 13, real_estate: 13,
  // Serviceable — vertical modules exist, but the pain is lighter.
  services: 11, enterprise: 11, general: 10, accounting_firm: 10,
  advertising: 10, law_firm: 9, travel: 9, security: 9, gym: 9,
  salon: 9, school: 9, hospital: 9, media: 9, insurance: 9,
  microfinance: 9, telecom: 9, university: 8, hospital_chain: 8,
  ngo: 7, aviation: 7, power_plant: 7,
  // Poor fit — they build their own or need something else entirely.
  saas: 3,
};

/** The specific ache we lead with, per industry. Feeds the drafting prompt. */
export const INDUSTRY_PAIN: Record<string, string> = {
  trading: "purchases and sales tracked in separate Excel files, no live stock position, customer payments slipping through the cracks, profit-per-item unknown until year end",
  distribution: "route and van-sales reconciliation, salesman-wise recovery, dealer ledgers that never tie out, dispatch planning done on WhatsApp",
  wholesale: "hundreds of SKUs, credit extended to retailers with no limit control, chasing outstanding payments manually, price lists that go stale",
  import_company: "landed cost per consignment, LC and duty tracking, multi-currency supplier payments, matching a shipment to the invoice months later",
  export_company: "export invoicing and packing lists by hand, FX gain/loss untracked, shipment status scattered across emails",
  manufacturing: "raw material consumption vs output, work-in-progress invisible, BOM and production costing done on a calculator",
  cold_storage: "chamber-wise stock, per-party storage billing, in/out gate records on paper",
  supermarket: "daily cash reconciliation, expiry and shrinkage, supplier credit terms, no reliable margin report",
  pharmacy: "batch and expiry tracking, narcotics register, distributor credit, stock spread across counters",
  retail: "closing cash never matching the till, stockouts on fast movers, customer udhaar in a notebook",
  ecommerce: "orders across marketplaces, returns and COD reconciliation, stock oversell",
  construction: "project-wise costing, material issued vs consumed at site, subcontractor running bills",
  garments: "size/colour matrix stock, job work with contractors, fabric wastage",
  transport: "trip-wise profitability, fuel and maintenance per vehicle, driver advances",
  hardware: "thousands of low-value SKUs, counter sales plus credit customers, supplier rate changes",
};

export const DEFAULT_PAIN =
  "financial records spread across Excel, WhatsApp and paper registers — no single place that shows what the business actually made this month";

/** Signals that a company is still on spreadsheets, worth 10 points to us. */
export const SOFTWARE_GAP_SIGNALS = [
  "excel", "spreadsheet", "manual", "register", "tally", "peachtree",
  "quickbooks desktop", "no software", "paper",
];

/** Software that means they already bought — a harder, slower displacement. */
export const ENTRENCHED_SOFTWARE = [
  "sap", "oracle", "netsuite", "dynamics", "odoo", "zoho books", "xero",
];

export function icpFitScore(industry: string | null): number {
  if (!industry) return 6;
  return ICP_TIERS[industry] ?? 8;
}

export function painFor(industry: string | null): string {
  if (!industry) return DEFAULT_PAIN;
  return INDUSTRY_PAIN[industry] ?? DEFAULT_PAIN;
}

/**
 * Countries we can actually bill, support in-timezone, and legally cold-email
 * on a legitimate-interest basis without an opt-in record. EU/UK are absent on
 * purpose — PECR and GDPR make unsolicited B2B email there a real liability,
 * and it is not worth the first campaign.
 */
export const ALLOWED_OUTREACH_COUNTRIES = [
  "PK", "AE", "SA", "QA", "OM", "BH", "KW", "IN", "BD", "LK",
  "US", "CA", "AU", "NZ", "ZA", "NG", "KE", "EG", "MY", "SG",
];

export function isOutreachAllowed(country: string | null): boolean {
  if (!country) return false;
  return ALLOWED_OUTREACH_COUNTRIES.includes(country.toUpperCase());
}
