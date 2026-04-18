/**
 * Master list of all 61 supported business types.
 * phase: which release phase this business type is planned for
 * liveByDefault: true = live at launch without admin override needed
 * Admin can override the live status of any business type via the admin panel.
 */

export interface BusinessType {
  id: string;
  label: string;
  icon: string;
  phase: 1 | 2 | 3 | 4;
  liveByDefault: boolean;
  description: string;
  category: string;
}

export const ALL_BUSINESS_TYPES: BusinessType[] = [
  // ── PHASE 1 — Live at launch ──────────────────────────────────
  { id: "trading",              label: "Trading",                  icon: "🔄", phase: 1, liveByDefault: true,  category: "Commerce",      description: "Buy-sell operations, purchase orders, and trade finance" },
  { id: "distribution",         label: "Distribution",             icon: "🚛", phase: 1, liveByDefault: true,  category: "Commerce",      description: "Multi-route delivery, van sales, and branch settlement" },
  { id: "wholesale",            label: "Wholesale",                icon: "📦", phase: 1, liveByDefault: true,  category: "Commerce",      description: "Bulk pricing, party ledgers, and dealer management" },
  { id: "import_company",       label: "Import Company",           icon: "🚢", phase: 1, liveByDefault: true,  category: "Commerce",      description: "Shipment tracking, LC management, and customs duty" },
  { id: "export_company",       label: "Export Company",           icon: "📤", phase: 1, liveByDefault: true,  category: "Commerce",      description: "Export invoices, packing lists, and shipment tracking" },
  { id: "clearing_forwarding",  label: "Clearing & Forwarding",    icon: "🛃", phase: 1, liveByDefault: true,  category: "Commerce",      description: "Customs clearance, freight forwarding, documentation" },
  { id: "services",         label: "Services",                 icon: "🛠️", phase: 1, liveByDefault: true,  category: "Services",      description: "Project billing, retainers, and expense tracking" },
  { id: "enterprise",       label: "Enterprise / Holding",     icon: "🏢", phase: 1, liveByDefault: true,  category: "Corporate",     description: "Multi-company group with consolidated reporting" },
  { id: "general",          label: "General Business",         icon: "💼", phase: 1, liveByDefault: true,  category: "General",       description: "All-purpose accounting for any small or medium business" },

  // ── PHASE 2 ───────────────────────────────────────────────────
  { id: "manufacturing",    label: "Manufacturing",            icon: "🏭", phase: 2, liveByDefault: false, category: "Production",    description: "BOM, production orders, work orders, and finished goods" },
  { id: "retail",           label: "Retail / Shop",            icon: "🏪", phase: 2, liveByDefault: false, category: "Commerce",      description: "POS billing, stock control, and multi-store management" },
  { id: "restaurant",       label: "Restaurant / Food",        icon: "🍽️", phase: 2, liveByDefault: false, category: "Hospitality",   description: "Table billing, kitchen orders, and food cost control" },
  { id: "construction",     label: "Construction",             icon: "🏗️", phase: 2, liveByDefault: false, category: "Project",       description: "Project costing, subcontractor bills, and site tracking" },
  { id: "ecommerce",        label: "E-Commerce",               icon: "🛒", phase: 2, liveByDefault: false, category: "Commerce",      description: "Multi-platform orders, returns, and seller reporting" },
  { id: "garments",         label: "Garments / Textile",       icon: "👕", phase: 2, liveByDefault: false, category: "Production",    description: "Lot-based production, fabric stock, and export invoices" },
  { id: "food_processing",  label: "Food Processing",          icon: "🥫", phase: 2, liveByDefault: false, category: "Production",    description: "Recipe costing, batch production, and expiry tracking" },
  { id: "printing",         label: "Printing / Publishing",    icon: "🖨️", phase: 2, liveByDefault: false, category: "Production",    description: "Job cards, paper stock, and client artwork billing" },
  { id: "pharmacy",         label: "Pharmacy",                 icon: "💊", phase: 2, liveByDefault: false, category: "Healthcare",    description: "Drug inventory, expiry alerts, and prescription billing" },
  { id: "supermarket",      label: "Supermarket / Grocery",    icon: "🛍️", phase: 2, liveByDefault: false, category: "Commerce",      description: "High-volume POS, barcode scanning, and shelf management" },

  // ── PHASE 3 ───────────────────────────────────────────────────
  { id: "hotel",            label: "Hotel / Guesthouse",       icon: "🏨", phase: 3, liveByDefault: false, category: "Hospitality",   description: "Room booking, housekeeping, and F&B integration" },
  { id: "agriculture",      label: "Agriculture / Farm",       icon: "🌾", phase: 3, liveByDefault: false, category: "Agriculture",   description: "Crop cycles, livestock, harvest costing, and land records" },
  { id: "transport",        label: "Transport / Logistics",    icon: "🚌", phase: 3, liveByDefault: false, category: "Logistics",     description: "Fleet management, trip sheets, and fuel tracking" },
  { id: "salon",            label: "Salon / Beauty",           icon: "💇", phase: 3, liveByDefault: false, category: "Services",      description: "Appointment booking, service billing, and staff payroll" },
  { id: "real_estate",      label: "Real Estate",              icon: "🏘️", phase: 3, liveByDefault: false, category: "Property",      description: "Property management, rent collection, and lease tracking" },
  { id: "automotive",       label: "Automotive / Garage",      icon: "🚗", phase: 3, liveByDefault: false, category: "Services",      description: "Job cards, spare parts stock, and service billing" },
  { id: "advertising",      label: "Advertising / Agency",     icon: "📢", phase: 3, liveByDefault: false, category: "Services",      description: "Campaign billing, client retainers, and media buying" },
  { id: "saas",             label: "SaaS / Tech Company",      icon: "💻", phase: 3, liveByDefault: false, category: "Technology",    description: "Subscription billing, MRR tracking, and churn reports" },
  { id: "solar",            label: "Solar / Renewable Energy", icon: "☀️", phase: 3, liveByDefault: false, category: "Energy",        description: "Project costing, panel inventory, and maintenance billing" },
  { id: "events",           label: "Events / Catering",        icon: "🎪", phase: 3, liveByDefault: false, category: "Services",      description: "Event budgeting, vendor bills, and client invoicing" },
  { id: "repair",           label: "Repair Shop",              icon: "🔧", phase: 3, liveByDefault: false, category: "Services",      description: "Job cards, parts consumption, and warranty tracking" },
  { id: "law_firm",         label: "Law Firm",                 icon: "⚖️", phase: 3, liveByDefault: false, category: "Professional",  description: "Client retainers, billable hours, and case expenses" },
  { id: "accounting_firm",  label: "Accounting / CA Firm",     icon: "📊", phase: 3, liveByDefault: false, category: "Professional",  description: "Client billing, tax filings, and audit management" },
  { id: "gym",              label: "Gym / Fitness Center",     icon: "🏋️", phase: 3, liveByDefault: false, category: "Services",      description: "Membership billing, trainer payroll, and equipment stock" },
  { id: "bakery",           label: "Bakery / Confectionery",   icon: "🥐", phase: 3, liveByDefault: false, category: "Food",          description: "Daily production, ingredient stock, and outlet billing" },
  { id: "hardware",         label: "Hardware / Building Materials", icon: "🔩", phase: 3, liveByDefault: false, category: "Commerce", description: "SKU management, credit sales, and site delivery tracking" },
  { id: "courier",          label: "Courier / Delivery",       icon: "📮", phase: 3, liveByDefault: false, category: "Logistics",     description: "Shipment tracking, COD reconciliation, and route costing" },
  { id: "travel",           label: "Travel Agency",            icon: "✈️", phase: 3, liveByDefault: false, category: "Services",      description: "Tour packages, ticket billing, and visa cost tracking" },
  { id: "security",         label: "Security Services",        icon: "🔐", phase: 3, liveByDefault: false, category: "Services",      description: "Guard deployment, site billing, and uniform inventory" },

  // ── PHASE 4 ───────────────────────────────────────────────────
  { id: "hospital",         label: "Hospital / Clinic",        icon: "🏥", phase: 4, liveByDefault: false, category: "Healthcare",    description: "Patient billing, pharmacy stock, and doctor scheduling" },
  { id: "school",           label: "School / Institute",       icon: "🏫", phase: 4, liveByDefault: false, category: "Education",     description: "Fee collection, payroll, and student ledger management" },
  { id: "ngo",              label: "NGO / Non-Profit",         icon: "🤝", phase: 4, liveByDefault: false, category: "Social",        description: "Donor tracking, grant management, and fund accounting" },
  { id: "franchise",        label: "Franchise",                icon: "🏬", phase: 4, liveByDefault: false, category: "Corporate",     description: "Royalty billing, outlet performance, and brand compliance" },
  { id: "university",       label: "University / College",     icon: "🎓", phase: 4, liveByDefault: false, category: "Education",     description: "Department budgets, fee management, and research grants" },
  { id: "insurance",        label: "Insurance Agency",         icon: "🛡️", phase: 4, liveByDefault: false, category: "Finance",       description: "Policy billing, commission tracking, and claim records" },
  { id: "microfinance",     label: "Microfinance / NBFC",      icon: "💰", phase: 4, liveByDefault: false, category: "Finance",       description: "Loan management, installment tracking, and portfolio reports" },
  { id: "media",            label: "Media / Entertainment",    icon: "🎬", phase: 4, liveByDefault: false, category: "Creative",      description: "Production budgets, royalties, and distribution billing" },
  { id: "mining",           label: "Mining / Quarrying",       icon: "⛏️", phase: 4, liveByDefault: false, category: "Industrial",    description: "Site costs, machinery maintenance, and tonnage billing" },
  { id: "oil_gas",          label: "Oil & Gas",                icon: "⛽", phase: 4, liveByDefault: false, category: "Industrial",    description: "Well costs, refinery accounting, and fuel distribution" },
  { id: "telecom",          label: "Telecom / ISP",            icon: "📡", phase: 4, liveByDefault: false, category: "Technology",    description: "Subscription billing, tower maintenance, and SLA tracking" },
  { id: "hospital_chain",   label: "Hospital Chain",           icon: "🏨", phase: 4, liveByDefault: false, category: "Healthcare",    description: "Multi-branch patient records, centralized pharmacy, and group billing" },
  { id: "textile_mill",     label: "Textile Mill",             icon: "🧵", phase: 4, liveByDefault: false, category: "Industrial",    description: "Yarn to fabric production, loom tracking, and export compliance" },
  { id: "cold_storage",     label: "Cold Storage",             icon: "❄️", phase: 4, liveByDefault: false, category: "Logistics",     description: "Chamber billing, temperature logs, and client stock management" },
  { id: "water_plant",      label: "Water Plant / Beverage",   icon: "💧", phase: 4, liveByDefault: false, category: "Production",    description: "Batch production, bottle stock, and distribution billing" },
  { id: "power_plant",      label: "Power / Utilities",        icon: "⚡", phase: 4, liveByDefault: false, category: "Industrial",    description: "Unit billing, grid management, and maintenance scheduling" },
  { id: "steel_mill",       label: "Steel / Metal Works",      icon: "🔩", phase: 4, liveByDefault: false, category: "Industrial",    description: "Melt shop costing, scrap management, and rolling mill tracking" },
  { id: "shipping",         label: "Shipping / Freight",       icon: "🚢", phase: 4, liveByDefault: false, category: "Logistics",     description: "Vessel costing, freight billing, and port charges" },
  { id: "chemical",         label: "Chemical / Pharma Mfg",    icon: "🧪", phase: 4, liveByDefault: false, category: "Industrial",    description: "Batch costing, compliance records, and raw material tracking" },
  { id: "aviation",         label: "Aviation / Airport",       icon: "✈️", phase: 4, liveByDefault: false, category: "Industrial",    description: "Fleet maintenance, handling charges, and cargo billing" },
];

export const PHASE_LABELS: Record<number, string> = {
  1: "Phase 1 — Live Now",
  2: "Phase 2 — Coming Soon",
  3: "Phase 3 — Planned",
  4: "Phase 4 — Enterprise Roadmap",
};

export const PHASE_COLORS: Record<number, string> = {
  1: "#34d399",
  2: "#818cf8",
  3: "#fbbf24",
  4: "#f87171",
};

export function getBusinessTypeById(id: string): BusinessType | undefined {
  return ALL_BUSINESS_TYPES.find(b => b.id === id);
}

export function getLiveBusinessTypes(liveIds: string[]): BusinessType[] {
  return ALL_BUSINESS_TYPES.filter(b => liveIds.includes(b.id) || b.liveByDefault);
}
