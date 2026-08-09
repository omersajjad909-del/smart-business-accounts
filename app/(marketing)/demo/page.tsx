"use client";

import { useEffect, useMemo, useState } from "react";
import { setStoredDemoBusinessPreference } from "@/lib/auth";
import BookingModal from "./BookingModal";

const FONT = "'Outfit','Inter',sans-serif";

// Published demo sign-in. Kept in sync with lib/demoSandbox.ts — every visitor
// uses the same pair but lands in their own sandbox.
const DEMO_EMAIL = "demo@finovaos.app";
const DEMO_PASSWORD = "12345678";
const DEMO_MINUTES = 30;

type DemoBusinessId =
  | "trading"
  | "wholesale"
  | "distribution"
  | "retail"
  | "import_company"
  | "clearing_forwarding";

type DemoBusiness = {
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

const BUSINESSES: DemoBusiness[] = [
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
];

const CATEGORY_COLORS: Record<string, string> = {
  Commerce: "#38bdf8",
  Logistics: "#f59e0b",
  "Food & Beverage": "#f97316",
  Production: "#6366f1",
  Healthcare: "#ec4899",
  Education: "#14b8a6",
  Hospitality: "#a78bfa",
  Projects: "#fb923c",
  Property: "#f472b6",
  Trade: "#4ade80",
};

const CATEGORIES = Array.from(new Set(BUSINESSES.map((b) => b.category)));

// "60+ Business Types" was the old catalogue count while this page showed one
// live demo — a number the page itself contradicted.
const TRUST_STATS = [
  { value: "6",            label: "Live Demos",       icon: "🏢" },
  { value: "Early Access", label: "Limited Spots",    icon: "🚀" },
  { value: "No signup",    label: "To Start",         icon: "⚡" },
  { value: "30 min",       label: "Full Access",      icon: "⏱️" },
];

export default function DemoPage() {
  const [selectedBiz, setSelectedBiz] = useState<DemoBusinessId | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "workflow" | "ai">("overview");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Seed from hardcoded values so there's no flash on load
  const [liveStatusMap, setLiveStatusMap] = useState<Record<string, string>>(
    Object.fromEntries(BUSINESSES.map(b => [b.liveBusinessType, b.demoAvailable ? "live" : "coming_soon"]))
  );

  useEffect(() => {
    fetch("/api/public/business-module-status", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d?.statusMap) setLiveStatusMap(d.statusMap); })
      .catch(() => {});
  }, []);

  const isDemoLive = (liveBusinessType: string) => liveStatusMap[liveBusinessType] === "live";

  const filteredBusinesses = useMemo(
    () => (activeCategory ? BUSINESSES.filter((b) => b.category === activeCategory) : BUSINESSES),
    [activeCategory]
  );

  const biz = useMemo(() => BUSINESSES.find((b) => b.id === selectedBiz) || null, [selectedBiz]);

  function handleBook() {
    if (!biz || !isDemoLive(biz.liveBusinessType)) return;
    setStoredDemoBusinessPreference(biz.liveBusinessType);
    setBookingOpen(true);
  }

  /**
   * Starts a demo straight away. The API builds a private sandbox company for
   * this visitor and sets the session cookie, so there is nothing to book and
   * nothing shared with whoever else is in the demo right now.
   */
  async function handleInstantDemo() {
    if (!biz || !isDemoLive(biz.liveBusinessType) || launching) return;
    setLaunchError(null);
    setLaunching(biz.liveBusinessType);
    setStoredDemoBusinessPreference(biz.liveBusinessType);
    try {
      const res = await fetch("/api/demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: biz.liveBusinessType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLaunchError(data?.message || "Could not start the demo. Please try again.");
        setLaunching(null);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setLaunchError("Network error — please check your connection and try again.");
      setLaunching(null);
    }
  }

  function selectBiz(id: DemoBusinessId) {
    setSelectedBiz(id);
    setActiveTab("overview");
    setTimeout(() => {
      document.getElementById("biz-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07091a", color: "#fff", fontFamily: FONT }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.55; } }
        .biz-card { transition: transform .18s, border-color .18s, box-shadow .18s; cursor: pointer; }
        .biz-card:hover { transform: translateY(-4px); }
        .tab-btn { transition: background .15s, color .15s; cursor: pointer; border:none; font-family:inherit; }
        .cat-btn { transition: background .15s, color .15s, border-color .15s; cursor: pointer; border:1px solid transparent; }
        .cat-btn:hover { border-color: rgba(255,255,255,.2); }
        .launch-btn { transition: transform .18s, filter .18s; cursor: pointer; border:none; font-family:inherit; }
        .launch-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.06); }
        .mod-chip { transition: background .14s, border-color .14s; }
        .mod-chip:hover { background: rgba(255,255,255,.07); }
        @media(max-width:980px){
          .demo-detail-header,
          .demo-overview-grid,
          .demo-workflow-grid,
          .demo-ai-bottom{
            grid-template-columns:1fr !important;
          }
          .demo-detail-header{
            flex-direction:column !important;
            align-items:flex-start !important;
          }
          .demo-detail-header .launch-btn{
            width:100%;
          }
          .demo-highlights{
            grid-template-columns:1fr !important;
          }
          .demo-ai-feature-grid{
            grid-template-columns:1fr !important;
          }
        }
        @media(max-width:720px){
          .demo-tabs{
            width:100% !important;
            flex-wrap:wrap !important;
          }
          .demo-tabs .tab-btn{
            flex:1 1 calc(50% - 6px);
            text-align:center;
          }
          .demo-module-grid,
          .demo-ai-metric-grid{
            grid-template-columns:1fr !important;
          }
          .demo-bottom-cta{
            padding:24px 20px !important;
          }
          .demo-bottom-cta .launch-btn{
            width:100%;
          }
        }
      `}</style>

      {/* ─── Hero ─── */}
      <div style={{ textAlign: "center", padding: "80px 24px 48px", maxWidth: 900, margin: "0 auto", animation: "fadeUp .5s ease both" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.3)", marginBottom: 22 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#a5b4fc", letterSpacing: ".08em", textTransform: "uppercase" }}>Live Interactive Demo</span>
        </div>

        <h1 style={{ margin: "0 0 18px", fontSize: "clamp(36px,5.5vw,62px)", fontWeight: 900, letterSpacing: -1.8, lineHeight: 1.04 }}>
          Pick your business type.
          <br />
          <span style={{ background: "linear-gradient(90deg,#a5b4fc,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            See exactly how FinovaOS runs it.
          </span>
        </h1>
        {/* The page now lists only what actually opens. A grid of "coming soon"
            cards next to live ones just made a visitor guess which was which. */}
        <p style={{ fontSize: 17, color: "rgba(255,255,255,.5)", lineHeight: 1.8, maxWidth: 620, margin: "0 auto 32px" }}>
          {BUSINESSES.length} business types, all live right now. Each one opens a private {DEMO_MINUTES}-minute
          workspace configured for your industry — real customers, stock, posted invoices and payroll already
          loaded, so you can test it like it is your own business.
        </p>

        {/* Trust bar */}
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
          {TRUST_STATS.map((t) => (
            <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 999, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{t.value}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 100px" }}>

        {/* ─── Category Filter ─── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 }}>
          <button
            className="cat-btn"
            onClick={() => setActiveCategory(null)}
            style={{ padding: "7px 16px", borderRadius: 999, background: !activeCategory ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.03)", color: !activeCategory ? "#fff" : "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, fontFamily: FONT }}
          >
            All ({BUSINESSES.length})
          </button>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            const c = CATEGORY_COLORS[cat] || "#a5b4fc";
            return (
              <button
                key={cat}
                className="cat-btn"
                onClick={() => setActiveCategory(active ? null : cat)}
                style={{ padding: "7px 16px", borderRadius: 999, background: active ? `${c}18` : "rgba(255,255,255,.03)", color: active ? c : "rgba(255,255,255,.5)", borderColor: active ? `${c}40` : "transparent", fontSize: 12, fontWeight: 700, fontFamily: FONT }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ─── Business Cards Grid ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 48 }}>
          {filteredBusinesses.map((entry, i) => {
            const active = entry.id === selectedBiz;
            return (
              <div
                key={entry.id}
                className="biz-card"
                onClick={() => selectBiz(entry.id)}
                style={{
                  background: active ? `linear-gradient(135deg,${entry.color}18,rgba(255,255,255,.04))` : "rgba(255,255,255,.03)",
                  border: `1.5px solid ${active ? entry.color : "rgba(255,255,255,.07)"}`,
                  borderRadius: 20,
                  padding: "20px 18px",
                  boxShadow: active ? `0 16px 40px ${entry.color}22` : "none",
                  animation: `fadeUp .4s ease ${i * 0.03}s both`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {active && (
                  <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: "50%", background: entry.color, boxShadow: `0 0 10px ${entry.color}` }} />
                )}
                <div style={{ width: 48, height: 48, borderRadius: 14, background: entry.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12, boxShadow: `0 6px 20px ${entry.color}35` }}>
                  {entry.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: CATEGORY_COLORS[entry.category] || "#a5b4fc", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>
                  {entry.category}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: active ? entry.color : "#fff", marginBottom: 4 }}>{entry.label}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", lineHeight: 1.5 }}>{entry.tagline}</div>
                <div style={{ marginTop: 8 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: isDemoLive(entry.liveBusinessType) ? "rgba(16,185,129,.12)" : "rgba(245,158,11,.1)",
                      border: `1px solid ${isDemoLive(entry.liveBusinessType) ? "rgba(16,185,129,.25)" : "rgba(245,158,11,.2)"}`,
                      color: isDemoLive(entry.liveBusinessType) ? "#34d399" : "#fbbf24",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isDemoLive(entry.liveBusinessType) ? "Live Demo" : "Coming Soon"}
                  </span>
                </div>
                {/* The per-business user counts that used to sit here were
                    invented. Pre-launch, the honest signal is the category. */}
                <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.25)", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{entry.category}</div>
              </div>
            );
          })}
        </div>

        {/* ─── No selection placeholder ─── */}
        {!biz && (
          <div style={{ textAlign: "center", padding: "40px 24px", borderRadius: 24, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👆</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Select a business type above</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,.35)" }}>
              We will show you the exact modules, AI features, and workflow for your business — then let you open the live workspace.
            </div>
          </div>
        )}

        {/* ─── Business Detail ─── */}
        {biz && (
          <div id="biz-detail" style={{ animation: "fadeUp .35s ease both" }}>

            {/* Header */}
            <div className="demo-detail-header" style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28, padding: "28px 28px", background: `linear-gradient(135deg,${biz.color}12,rgba(255,255,255,.02))`, border: `1px solid ${biz.color}25`, borderRadius: 24 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: biz.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0, boxShadow: `0 10px 30px ${biz.color}40` }}>
                {biz.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8 }}>{biz.label}</div>
                  <div style={{ padding: "4px 12px", borderRadius: 999, background: `${biz.color}20`, color: biz.color, fontSize: 11, fontWeight: 800 }}>
                    {biz.category}
                  </div>
                  <div style={{ padding: "4px 12px", borderRadius: 999, background: isDemoLive(biz.liveBusinessType) ? "rgba(16,185,129,.14)" : "rgba(245,158,11,.12)", color: isDemoLive(biz.liveBusinessType) ? "#34d399" : "#fbbf24", fontSize: 11, fontWeight: 800 }}>
                    {isDemoLive(biz.liveBusinessType) ? "Live Demo Ready" : "Coming Soon"}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.7, maxWidth: 680 }}>{biz.description}</div>
              </div>
              <div style={{ display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                <button
                  className="launch-btn"
                  onClick={handleInstantDemo}
                  disabled={!isDemoLive(biz.liveBusinessType) || launching !== null}
                  style={{
                    background: isDemoLive(biz.liveBusinessType) ? biz.gradient : "rgba(255,255,255,.08)",
                    color: isDemoLive(biz.liveBusinessType) ? "#fff" : "rgba(255,255,255,.45)",
                    borderRadius: 16,
                    padding: "14px 28px",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: !isDemoLive(biz.liveBusinessType) || launching ? "not-allowed" : "pointer",
                    boxShadow: isDemoLive(biz.liveBusinessType) ? `0 10px 28px ${biz.color}35` : "none",
                    whiteSpace: "nowrap",
                    opacity: launching && launching !== biz.liveBusinessType ? 0.5 : 1,
                  }}
                >
                  {launching === biz.liveBusinessType ? "Preparing your workspace…" : "▶ Start Demo Now"}
                </button>
                <button
                  className="launch-btn"
                  onClick={handleBook}
                  disabled={!isDemoLive(biz.liveBusinessType)}
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.14)",
                    color: "rgba(255,255,255,.72)",
                    borderRadius: 16,
                    padding: "14px 22px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !isDemoLive(biz.liveBusinessType) ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  📅 Book a Slot
                </button>
              </div>
            </div>

            {launchError && (
              <div style={{ marginTop: -8, marginBottom: 20, padding: "14px 18px", borderRadius: 16, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 13, lineHeight: 1.6 }}>
                {launchError}
              </div>
            )}

            {isDemoLive(biz.liveBusinessType) && (
              <div style={{ marginTop: -8, marginBottom: 20, padding: "14px 18px", borderRadius: 16, background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.2)", color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.7 }}>
                Opens a private {DEMO_MINUTES}-minute workspace already loaded with customers, suppliers, stock,
                posted invoices, payroll and live dashboard figures — yours alone, and wiped the moment you leave.
                Sign-in is <strong style={{ color: "#fff" }}>{DEMO_EMAIL}</strong> / <strong style={{ color: "#fff" }}>{DEMO_PASSWORD}</strong> if you would rather log in yourself.
              </div>
            )}

            {!isDemoLive(biz.liveBusinessType) && (
              <div style={{ marginTop: -8, marginBottom: 20, padding: "14px 18px", borderRadius: 16, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.6 }}>
                This business preview is available, but its live demo workspace has not launched yet. Phase 1 live demos are
                Trading, Retail &amp; Multi-Store, Distribution, Import / Export, Clearing &amp; Forwarding, and Wholesale.
              </div>
            )}

            {/* Highlight stats */}
            <div className="demo-highlights" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 22 }}>
              {biz.highlights.map((h) => (
                <div key={h.label} style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${biz.color}18`, borderRadius: 18, padding: "20px 18px" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 }}>{h.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: biz.color, marginBottom: 6 }}>{h.value}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.5 }}>{h.sub}</div>
                </div>
              ))}
            </div>

            {/* Tab switcher */}
              <div className="demo-tabs" style={{ display: "flex", gap: 6, marginBottom: 22, background: "rgba(255,255,255,.03)", padding: 6, borderRadius: 16, border: "1px solid rgba(255,255,255,.06)", width: "fit-content" }}>
              {(["overview", "workflow", "ai"] as const).map((tab) => {
                const labels = { overview: "📦 Modules & Proof", workflow: "⚙️ Workflow Steps", ai: "🤖 AI Features" };
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    className="tab-btn"
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 12,
                      background: active ? biz.gradient : "transparent",
                      color: active ? "#fff" : "rgba(255,255,255,.45)",
                      fontSize: 13,
                      fontWeight: 700,
                      boxShadow: active ? `0 4px 14px ${biz.color}30` : "none",
                    }}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className="demo-overview-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, animation: "fadeUp .3s ease both" }}>
                {/* Modules */}
                <div style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${biz.color}18`, borderRadius: 22, padding: "22px 22px" }}>
                  <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Modules included for {biz.label}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginBottom: 16 }}>These modules are pre-loaded in your live demo workspace.</div>
                  <div className="demo-module-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                    {biz.modules.map((mod) => (
                      <div key={mod} className="mod-chip" style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.82)", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: biz.color, flexShrink: 0 }} />
                        {mod}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Proof + docs */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: 20, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Why this matters</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {biz.proof.map((p) => (
                        <div key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.025)" }}>
                          <div style={{ width: 22, height: 22, borderRadius: 7, background: `${biz.color}20`, color: biz.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>✓</div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.55 }}>{p}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 18, padding: "16px 18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>Sample documents in the demo</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {biz.sampleDocs.map((doc) => (
                        <span key={doc} style={{ padding: "6px 12px", borderRadius: 999, background: `${biz.color}12`, border: `1px solid ${biz.color}25`, color: "rgba(255,255,255,.72)", fontSize: 12, fontWeight: 700 }}>
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Workflow */}
            {activeTab === "workflow" && (
              <div className="demo-workflow-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18, animation: "fadeUp .3s ease both" }}>
                <div style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${biz.color}18`, borderRadius: 22, padding: "24px 24px" }}>
                  <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>How {biz.label} works on FinovaOS</div>
                  <div style={{ display: "grid", gap: 16 }}>
                    {biz.workflow.map((step, i) => (
                      <div key={step.step} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 999, background: i === 0 ? biz.gradient : `${biz.color}20`, color: i === 0 ? "#fff" : biz.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, flexShrink: 0, boxShadow: i === 0 ? `0 4px 14px ${biz.color}35` : "none" }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{step.step}</div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.6 }}>{step.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 22, padding: 22 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>What the owner sees</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {biz.insights.map((ins) => (
                      <div key={ins} style={{ padding: "13px 14px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)", fontSize: 13, color: "rgba(255,255,255,.68)", lineHeight: 1.6 }}>
                        {ins}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 16, background: `${biz.color}10`, border: `1px solid ${biz.color}25` }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: biz.color, marginBottom: 6 }}>🚀 Want to try it yourself?</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>
                      Book a 30-minute live session using the button at the top of this page. You&apos;ll get instant access to a real dashboard pre-configured for {biz.label}.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: AI Features */}
            {activeTab === "ai" && (
              <div style={{ animation: "fadeUp .3s ease both" }}>
                <div className="demo-ai-feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
                  {biz.aiFeatures.map((feat) => (
                    <div key={feat} style={{ padding: "20px 18px", borderRadius: 18, background: "linear-gradient(135deg,rgba(99,102,241,.1),rgba(167,139,250,.06))", border: "1px solid rgba(99,102,241,.2)", fontSize: 14, color: "rgba(255,255,255,.78)", lineHeight: 1.65, fontWeight: 600 }}>
                      {feat}
                    </div>
                  ))}
                </div>
                <div className="demo-ai-bottom" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ padding: "22px 22px", borderRadius: 20, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>AI Chat — Ask anything</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.7, marginBottom: 14 }}>
                      In the live demo, open the AI Assistant and type any question about your data — revenue trends, best customers, cash flow, what to do next. FinovaOS AI answers with real numbers from your demo data.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {["What is my revenue trend this month?", "Which customers owe the most?", "What should I focus on this week?"].map((q) => (
                        <div key={q} style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", fontSize: 12, color: "rgba(255,255,255,.55)", fontStyle: "italic" }}>
                          &ldquo;{q}&rdquo;
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: "22px 22px", borderRadius: 20, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>AI Insights Dashboard</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.7, marginBottom: 14 }}>
                      The AI tab in the dashboard shows automated insights, revenue forecasts for the next 30–90 days, anomaly alerts, and business health score — all generated from your actual transaction data.
                    </div>
                    <div className="demo-ai-metric-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {["Revenue Forecast", "Anomaly Alerts", "Health Score", "Smart Recommendations", "Market Intelligence", "Business Advisor"].map((feat) => (
                        <div key={feat} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.15)", fontSize: 12, fontWeight: 700, color: "#a5b4fc", textAlign: "center" }}>
                          {feat}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom info panel (single-CTA design — booking button is at the top of the section) */}
            <div className="demo-bottom-cta" style={{ marginTop: 28, padding: "28px 32px", borderRadius: 24, background: `linear-gradient(135deg,${biz.color}12,rgba(255,255,255,.03))`, border: `1px solid ${biz.color}25` }}>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, marginBottom: 8 }}>
                How the {biz.label} demo works
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.75, marginBottom: 16 }}>
                Hit <strong style={{ color: biz.color }}>▶ Start Demo Now</strong> and you land in a real dashboard pre-configured for {biz.label} —
                customers, suppliers, stock, posted invoices and a payroll run already in place. Create your own invoices,
                run payroll, check the reports. The workspace is yours alone, and everything you do is wiped when the
                {" "}{DEMO_MINUTES} minutes are up. Prefer a guided walkthrough? Book a slot instead.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { icon: "⚡", text: "No signup, starts instantly" },
                  { icon: "🔒", text: "Private workspace, not shared" },
                  { icon: "🧹", text: "Auto-wiped when it ends" },
                ].map(pt => (
                  <div key={pt.text} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>
                    <span>{pt.icon}</span> {pt.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {biz && (
        <BookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          businessType={biz.liveBusinessType}
          businessLabel={biz.label}
          color={biz.color}
          gradient={biz.gradient}
        />
      )}
    </div>
  );
}
