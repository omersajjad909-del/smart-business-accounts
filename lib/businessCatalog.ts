/**
 * One list of the businesses FinovaOS sells, and the marketing copy each one
 * needs on the public site.
 *
 * Before this, every surface kept its own hardcoded list: the demo page had six
 * businesses, the navbar had six links, /solutions had its own set, and the
 * signup dropdown read the registry. Launching Manufacturing meant remembering
 * all four — and it was missed on two of them, so an admin could switch the
 * module Live and see nothing change on the website.
 *
 * How it fits together now:
 *
 *   lib/businessModules.ts  BUSINESS_PHASE_CONFIG  — every business type that
 *                           exists, with its phase, category and launch status.
 *                           Adding one here puts it in the signup dropdown and
 *                           the admin Modules screen automatically.
 *
 *   this file               DEMO_BUSINESSES        — the public copy for the
 *                           ones we market: tagline, modules, workflow, proof.
 *                           Anything listed here shows on /demo and in the
 *                           navbar Solutions menu the moment its status is Live.
 *
 * Live status comes from /api/public/business-module-status, which is the admin
 * Modules toggle — so launching is a switch, not a deploy.
 *
 * A business with a registry entry but no copy here still works everywhere
 * internal; it just does not appear on the marketing pages. isMarketable()
 * below is how a caller asks.
 */

export type DemoBusinessId =
  | "trading"
  | "wholesale"
  | "distribution"
  | "retail"
  | "import_company"
  | "clearing_forwarding"
  | "manufacturing";

export type DemoBusiness = {
  id: DemoBusinessId;
  liveBusinessType: string;
  demoAvailable: boolean;
  icon: string;
  label: string;
  category: string;
  tagline: string;
  description: string;
  color: string;
  gradient: string;
  modules: string[];
  workflow: { step: string; detail: string }[];
  insights: string[];
  aiFeatures: string[];
  proof: string[];
  highlights: Array<{ label: string; value: string; sub: string }>;
  sampleDocs: string[];
};

export const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    id: "trading",
    liveBusinessType: "trading",
    demoAvailable: true,
    icon: "🛒",
    label: "Trading Business",
    category: "Commerce",
    tagline: "Buy smart, sell faster, track every margin.",
    description:
      "Ideal for hardware merchants, electronics traders, general merchandise, and import-backed trading operations.",
    color: "#38bdf8",
    gradient: "linear-gradient(135deg,#0ea5e9,#38bdf8)",
    modules: ["Sales Invoice", "Purchase Invoice", "Quotation", "Delivery Challan", "Stock Control", "Payment Receipts", "Bank Reconciliation", "Ageing Report"],
    workflow: [
      { step: "Customer inquiry", detail: "Create a quotation in seconds from your product list" },
      { step: "Order confirmed", detail: "Convert quotation to sales invoice with one click" },
      { step: "Procure & dispatch", detail: "Raise purchase order, receive stock, dispatch to customer" },
      { step: "Collect payment", detail: "Post receipt and auto-clear the invoice from outstanding" },
    ],
    insights: ["Best-selling items ranked by margin, not just volume", "Customer-wise outstanding and overdue ageing", "Purchase vs sale comparison to protect margins"],
    aiFeatures: [
      "🤖 AI spots customers most likely to delay payment",
      "📈 Predicts next month revenue based on trend",
      "⚠️ Alerts when margins drop below your threshold",
    ],
    proof: ["Built for trading businesses of all sizes", "Average invoice-to-collection time reduced by 40%", "Multi-currency support for import goods"],
    highlights: [
      { label: "Quotation to Order", value: "1-click", sub: "No re-entry, no duplication" },
      { label: "Receivable Visibility", value: "Real-time", sub: "Outstanding by customer always visible" },
      { label: "Margin Tracking", value: "Per Item", sub: "Know exactly what makes money" },
    ],
    sampleDocs: ["Quotation", "Sales Invoice", "Delivery Challan", "Customer Statement", "Purchase Order"],
  },
  {
    // Wholesale has its own seeded sandbox now (dealer network, bulk cartons),
    // so it no longer piggy-backs on the trading workspace.
    id: "wholesale",
    liveBusinessType: "wholesale",
    demoAvailable: true,
    icon: "🏬",
    label: "Wholesale",
    category: "Commerce",
    tagline: "High-volume billing with dealer control and credit limits.",
    description:
      "Best for wholesale counters, dealer supply businesses, and bulk-sale operations working with repeat buyers.",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
    modules: ["Bulk Invoicing", "Price Lists", "Credit Limits", "Supplier Purchases", "Outstandings", "Stock Summary", "Payment Receipts", "Profit Report"],
    workflow: [
      { step: "Dealer places order", detail: "Check credit limit before confirming the order" },
      { step: "Apply dealer pricing", detail: "Multiple price lists by customer type automatically applied" },
      { step: "Dispatch and invoice", detail: "Generate bulk invoice and dispatch note together" },
      { step: "Track and follow up", detail: "Outstanding report keeps recovery structured every day" },
    ],
    insights: ["Dealer-wise credit exposure and risk level", "Top SKUs by volume and profitability", "Sales vs purchase spread by category"],
    aiFeatures: [
      "🤖 AI flags dealers nearing credit limit breach",
      "📊 Recommends which dealers to offer better terms",
      "🔍 Detects unusual order patterns per dealer",
    ],
    proof: ["Separate retail and wholesale price lists", "Handle large dealer invoice volumes easily", "Credit control reduces bad debt significantly"],
    highlights: [
      { label: "Billing Speed", value: "3x Faster", sub: "Bulk entry built for repeat dealers" },
      { label: "Price Control", value: "Multi-tier", sub: "Different rates for different parties" },
      { label: "Credit Alerts", value: "Automatic", sub: "Stop sales before limit is breached" },
    ],
    sampleDocs: ["Wholesale Invoice", "Price List", "Dealer Statement", "Outstanding Summary", "Credit Note"],
  },
  {
    id: "distribution",
    liveBusinessType: "distribution",
    demoAvailable: true,
    icon: "🚚",
    label: "Distribution",
    category: "Logistics",
    tagline: "Route, van, delivery, and field collections — all in one place.",
    description:
      "Perfect for FMCG, pharma, beverages, and regional distributors with field teams and warehouse coordination.",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg,#d97706,#f59e0b)",
    modules: ["Routes & Planning", "Delivery Tracking", "Van Sales", "Stock on Van", "Collections", "Trip Sheet", "Route Analytics", "Driver Management"],
    workflow: [
      { step: "Load warehouse stock", detail: "Assign inventory to vans against planned route" },
      { step: "Execute route", detail: "Drivers log sales and collections per stop" },
      { step: "End-of-day reconciliation", detail: "Compare loaded vs sold vs returned stock per van" },
      { step: "Post collections", detail: "Payments reconciled and matched to invoices" },
    ],
    insights: ["Route performance vs plan — on time vs delayed", "Van-wise inventory movement and returns", "Field collections vs pending recovery by route"],
    aiFeatures: [
      "🤖 AI predicts which routes will underperform",
      "📍 Suggests route optimization based on delivery history",
      "⚡ Alerts on vans with abnormal stock discrepancies",
    ],
    proof: ["Field teams use trip sheet on mobile for real-time updates", "Dispatch and recovery tracked in one dashboard", "Used by FMCG and beverage distributors across the region"],
    highlights: [
      { label: "Route Execution", value: "Live View", sub: "Plan vs actual always visible" },
      { label: "Van Inventory", value: "Controlled", sub: "Loaded, sold, returned all tracked" },
      { label: "Collections", value: "Reconciled", sub: "Every rupee matched to invoice" },
    ],
    sampleDocs: ["Trip Sheet", "Van Loading Order", "Delivery Note", "Collection Register", "Route Report"],
  },
  {
    id: "retail",
    liveBusinessType: "retail",
    demoAvailable: true,
    icon: "🏪",
    label: "Retail & Multi-Store",
    category: "Commerce",
    tagline: "Scan, sell, sync — fast POS with real-time stock and loyalty.",
    description:
      "Designed for retail stores, supermarkets, fashion outlets, and multi-branch shops needing fast billing and inventory control.",
    color: "#10b981",
    gradient: "linear-gradient(135deg,#059669,#10b981)",
    modules: ["POS Terminal", "Barcode Scanning", "Inventory Management", "Customer Loyalty", "Discount Engine", "Branch Reports", "Stock Transfer", "Returns & Exchanges"],
    workflow: [
      { step: "Customer at counter", detail: "Scan items or search by name — bill in seconds" },
      { step: "Apply loyalty or discount", detail: "System auto-applies eligible offers at checkout" },
      { step: "Accept payment", detail: "Cash, card, or loyalty points — all captured" },
      { step: "Stock auto-updates", detail: "Inventory reduced in real-time across all branches" },
    ],
    insights: ["Top products by revenue and sell-through rate", "Slow movers that are tying up capital", "Customer purchase frequency and loyalty points"],
    aiFeatures: [
      "🤖 AI predicts stock-out before it happens",
      "🛍️ Suggests cross-sell items at checkout",
      "📊 Recommends reorder quantities based on sales velocity",
    ],
    proof: ["Barcode-based POS works with standard scanners", "Multi-branch stock visibility in one dashboard", "Loyalty program drives repeat purchases automatically"],
    highlights: [
      { label: "Billing Speed", value: "< 30 Sec", sub: "Average transaction time at POS" },
      { label: "Stock Accuracy", value: "Real-time", sub: "Across all branches instantly" },
      { label: "Loyalty ROI", value: "Proven", sub: "Repeat customers spend 2.3x more" },
    ],
    sampleDocs: ["POS Receipt", "Stock Report", "Loyalty Statement", "Branch Sales Report", "Purchase Order"],
  },
  {
    id: "import_company",
    liveBusinessType: "import_company",
    demoAvailable: true,
    icon: "🌍",
    label: "Import / Export",
    category: "Trade",
    tagline: "Trade-ready workflows for shipments, docs, and remittances.",
    description:
      "Built for importers, exporters, and global traders handling commercial invoices, packing lists, LC/TT, and landed cost.",
    color: "#4ade80",
    gradient: "linear-gradient(135deg,#16a34a,#4ade80)",
    modules: ["Commercial Invoice", "Packing List", "Shipment Tracking", "LC / TT Management", "Customs Costing", "Landed Cost", "Export Rebate", "Trade Analytics"],
    workflow: [
      { step: "Deal finalized", detail: "Commercial invoice and packing list created immediately" },
      { step: "LC or TT arranged", detail: "Payment terms documented and linked to shipment" },
      { step: "Customs and arrival", detail: "Customs cost posted to shipment for landed cost" },
      { step: "Stock received", detail: "Goods received into inventory at landed cost value" },
    ],
    insights: ["Shipment-wise status — at sea, customs, or warehouse", "Landed cost per unit for accurate selling price", "Export document flow linked from PI to packing list"],
    aiFeatures: [
      "🤖 AI forecasts forex impact on landed cost",
      "📦 Alerts when customs clearance time exceeds average",
      "💱 Suggests optimal hedging for upcoming payment remittances",
    ],
    proof: ["Trade documents all linked — no scattered spreadsheets", "Landed cost visibility enables accurate pricing decisions", "LC and TT tracking reduces payment risk in international trade"],
    highlights: [
      { label: "Document Flow", value: "Linked", sub: "PI → Commercial Invoice → Packing List" },
      { label: "Landed Cost", value: "Accurate", sub: "Customs, freight, duties all included" },
      { label: "Currency Support", value: "Global", sub: "Multi-currency for foreign transactions" },
    ],
    sampleDocs: ["Commercial Invoice", "Packing List", "Shipment Record", "LC Register", "Landed Cost Sheet"],
  },
  {
    id: "clearing_forwarding",
    liveBusinessType: "clearing_forwarding",
    demoAvailable: true,
    icon: "🛃",
    label: "Clearing & Forwarding",
    category: "Trade",
    tagline: "Every container, every GD, every charge — billed and recovered.",
    description:
      "For customs clearing agents and freight forwarders handling GD filing, port charges, container transport, and client recovery.",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg,#d97706,#f59e0b)",
    modules: ["Job File", "GD Filing", "Port & Terminal Charges", "Container Transport", "Client Billing", "Expense Recovery", "Outstandings", "Service Tax"],
    workflow: [
      { step: "Job opened", detail: "Client consignment logged with BL, container, and vessel details" },
      { step: "Costs incurred", detail: "Port charges, terminal handling, and transport posted to the job" },
      { step: "Clearance completed", detail: "GD filed, duty paid, and delivery arranged to client warehouse" },
      { step: "Invoice and recover", detail: "Service fee plus reimbursables billed and tracked till payment" },
    ],
    insights: ["Job-wise profitability — service fee against actual cost", "Reimbursable expenses still pending recovery from clients", "Container turnaround time and detention exposure"],
    aiFeatures: [
      "🤖 AI flags jobs where cost has overtaken the agreed service fee",
      "⏱️ Warns on containers approaching detention charges",
      "📊 Summarizes monthly clearance volume by client",
    ],
    proof: ["Every port and transport charge tied back to a job file", "Reimbursables never lost between clearance and billing", "Service sales tax handled on every invoice"],
    highlights: [
      { label: "Cost Recovery", value: "Job-wise", sub: "No reimbursable slips through" },
      { label: "Job Profit", value: "Per File", sub: "Know which clients are actually worth it" },
      { label: "Documentation", value: "Tracked", sub: "GD, BL, and delivery order in one place" },
    ],
    sampleDocs: ["Job File", "Clearance Invoice", "Port Charges Sheet", "Client Statement", "Delivery Order"],
  },
  {
    id: "manufacturing",
    liveBusinessType: "manufacturing",
    demoAvailable: true,
    icon: "🏭",
    label: "Manufacturing",
    category: "Production",
    tagline: "Know what every unit costs you to make.",
    description:
      "For factories, furniture and steel works, garments units and any workshop that turns raw material into finished goods.",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg,#d97706,#f59e0b)",
    modules: ["Bill of Materials", "Production Orders", "Work Orders", "Raw Material Stock", "Finished Goods", "Quality Checks", "WIP Accounting", "Cost Reports"],
    workflow: [
      { step: "Buy raw material", detail: "Purchase invoice adds it to stock at real cost" },
      { step: "Build the BOM", detail: "Pick the product and exactly what one batch consumes" },
      { step: "Raise a production order", detail: "Quantity, planned date, assigned team" },
      { step: "Record production", detail: "See the costed preview, then confirm — material leaves stock, finished goods arrive" },
      { step: "Sell it", detail: "Finished goods invoice out of the same stock, margin already known" },
    ],
    insights: [
      "Per-unit cost calculated from live material rates, not typed in",
      "Work In Progress and Finished Goods balances move on every run",
      "Shortages caught before the run, with the exact quantity missing",
      "Batch numbers link finished goods back to the order that made them",
    ],
    aiFeatures: [
      "Material shortage warnings before a run is committed",
      "Cost drift alerts when a material's average price moves",
      "Production output and yield summaries",
    ],
    proof: [
      "Material issue and finished goods receipt post to the ledger automatically",
      "Dr Work In Progress → Cr Raw Material Stock, then Dr Finished Goods → Cr WIP",
      "Stock and accounts always agree — one transaction, both sides",
    ],
    highlights: [
      { label: "Per-unit cost", value: "Live", sub: "from real material rates" },
      { label: "WIP posting", value: "Automatic", sub: "on every completed run" },
      { label: "Shortage check", value: "Before commit", sub: "with exact quantities" },
    ],
    sampleDocs: ["Bill of Materials", "Production Order", "Material Issue Note", "Finished Goods Batch", "Production Cost Sheet"],
  },
];

// ── Helpers the public surfaces use ─────────────────────────────────────────

const DEMO_BY_ID = new Map(DEMO_BUSINESSES.map((b) => [b.liveBusinessType, b]));

/** Does this business type have public marketing copy? */
export function isMarketable(businessType: string): boolean {
  return DEMO_BY_ID.has(businessType);
}

export function getDemoBusiness(businessType: string): DemoBusiness | null {
  return DEMO_BY_ID.get(businessType) ?? null;
}

/**
 * The businesses to show publicly, in registry order, each tagged with whether
 * the admin Modules screen currently has it Live.
 *
 * Pass the statusMap from /api/public/business-module-status. With no map yet
 * (first paint) every entry falls back to its own `demoAvailable`, so the page
 * renders something sensible instead of flashing empty.
 */
export function listPublicBusinesses(statusMap?: Record<string, string> | null) {
  return DEMO_BUSINESSES.map((b) => ({
    ...b,
    live: statusMap ? statusMap[b.liveBusinessType] === "live" : b.demoAvailable,
  }));
}

/** Live ones only — what the navbar Solutions menu lists. */
export function listLiveBusinesses(statusMap?: Record<string, string> | null) {
  return listPublicBusinesses(statusMap).filter((b) => b.live);
}