import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

/* ─────────────────────────────────────────────
   MODULE DATA
───────────────────────────────────────────── */
const MODULES: Record<string, {
  slug: string;
  icon: string;
  color: string;
  glow: string;
  title: string;
  tagline: string;
  description: string;
  capabilities: { icon: string; title: string; desc: string }[];
  whoFor: string[];
  stats: { val: string; label: string }[];
  related: string[];
}> = {
  accounting: {
    slug: "accounting",
    icon: "📊",
    color: "#818cf8",
    glow: "rgba(129,140,248,.15)",
    title: "Accounting & Ledger",
    tagline: "Full double-entry accounting. No shortcuts.",
    description: "FinovaOS's accounting engine is built on true double-entry principles. Every transaction is automatically recorded across the general ledger, giving you accurate P&L, balance sheets, and trial balances at any moment — without waiting for month-end.",
    capabilities: [
      { icon: "📒", title: "General Ledger", desc: "Every debit and credit automatically posted. Full audit trail on every entry." },
      { icon: "📈", title: "Profit & Loss", desc: "Real-time P&L by date range, branch, or company. Export to PDF or Excel." },
      { icon: "⚖️", title: "Balance Sheet", desc: "Assets, liabilities, and equity — always balanced, always current." },
      { icon: "🧮", title: "Trial Balance", desc: "Instant trial balance at any point in time. Spot discrepancies immediately." },
      { icon: "📓", title: "Journal Entries", desc: "Manual JV support with narration, cost centers, and multi-currency." },
      { icon: "🏷️", title: "Chart of Accounts", desc: "Auto-configured chart of accounts by industry. Fully customizable." },
      { icon: "📅", title: "Period Management", desc: "Open and close accounting periods. Lock past entries to prevent tampering." },
      { icon: "🌍", title: "Multi-Currency", desc: "Book transactions in any currency with automatic exchange rate handling." },
    ],
    whoFor: ["Trading businesses", "Distribution companies", "Manufacturing firms", "Service businesses", "NGOs & nonprofits", "Any business that needs accurate books"],
    stats: [{ val: "100%", label: "Double-entry" }, { val: "Real-time", label: "P&L updates" }, { val: "Unlimited", label: "Accounts" }, { val: "40+", label: "Country rules" }],
    related: ["invoicing", "bank-reconciliation", "reports"],
  },

  invoicing: {
    slug: "invoicing",
    icon: "🧾",
    color: "#34d399",
    glow: "rgba(52,211,153,.15)",
    title: "Invoicing",
    tagline: "Get paid faster. Track every rupee owed.",
    description: "Create professional sales and purchase invoices in seconds. FinovaOS handles the full billing cycle — from quotation to payment — with automatic ledger entries, tax calculations, and PDF generation built in.",
    capabilities: [
      { icon: "🧾", title: "Sales Invoices", desc: "Professional invoices with your logo, tax breakdown, and payment terms." },
      { icon: "🛍️", title: "Purchase Invoices", desc: "Record supplier bills, match with POs, and track what you owe." },
      { icon: "📄", title: "Credit & Debit Notes", desc: "Issue returns and adjustments. Automatically reverses the original entry." },
      { icon: "🔁", title: "Recurring Billing", desc: "Set up subscriptions and repeat invoices. Never miss a billing cycle." },
      { icon: "📑", title: "PDF Export", desc: "Download or email invoice PDFs instantly. Custom templates available." },
      { icon: "💳", title: "Payment Tracking", desc: "Record full and partial payments. Automatic ageing of outstanding invoices." },
      { icon: "📦", title: "Inventory Integration", desc: "Invoicing deducts stock automatically. No double entry needed." },
      { icon: "🧾", title: "Tax Handling", desc: "GST, VAT, and sales tax calculated automatically based on your country." },
    ],
    whoFor: ["Retailers", "Wholesalers", "Service providers", "Freelancers & consultants", "Distributors", "Any business that sells anything"],
    stats: [{ val: "< 30s", label: "Invoice creation" }, { val: "Auto", label: "Ledger posting" }, { val: "PDF", label: "Instant export" }, { val: "Multi", label: "Tax support" }],
    related: ["accounting", "inventory", "purchase-grn"],
  },

  inventory: {
    slug: "inventory",
    icon: "📦",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.15)",
    title: "Inventory Management",
    tagline: "Know exactly what you have. Everywhere. Always.",
    description: "Track stock levels, movements, and valuations across all your warehouses in real time. FinovaOS's inventory module syncs with invoicing and purchasing so your books and shelves always match.",
    capabilities: [
      { icon: "📦", title: "Real-Time Stock", desc: "Live stock levels updated on every sale, purchase, and transfer." },
      { icon: "🏭", title: "Multi-Warehouse", desc: "Manage multiple warehouses and locations from one dashboard." },
      { icon: "🔄", title: "Stock Transfers", desc: "Move stock between branches with full transfer documentation." },
      { icon: "📊", title: "FIFO / LIFO / Avg Cost", desc: "Choose your inventory valuation method. Affects COGS automatically." },
      { icon: "🔔", title: "Low Stock Alerts", desc: "Set reorder levels. Get notified before you run out." },
      { icon: "🏷️", title: "Barcode Support", desc: "Scan barcodes for fast item lookup and checkout." },
      { icon: "📋", title: "Stock Adjustments", desc: "Write-offs, damage, and manual adjustments with full audit trail." },
      { icon: "📈", title: "Inventory Reports", desc: "Stock valuation, movement history, slow-moving items — at a glance." },
    ],
    whoFor: ["Traders & wholesalers", "Retailers", "Manufacturers", "Pharmacies", "Restaurants & F&B", "Any product-based business"],
    stats: [{ val: "Real-time", label: "Stock sync" }, { val: "3", label: "Valuation methods" }, { val: "Multi", label: "Warehouse" }, { val: "Auto", label: "COGS calculation" }],
    related: ["invoicing", "purchase-grn", "pos"],
  },

  "bank-reconciliation": {
    slug: "bank-reconciliation",
    icon: "🏦",
    color: "#60a5fa",
    glow: "rgba(96,165,250,.15)",
    title: "Bank Reconciliation",
    tagline: "Close your books in hours, not days.",
    description: "Import your bank statements and let FinovaOS auto-match transactions against your ledger. Spot unmatched items instantly, investigate discrepancies, and mark your books as reconciled — all without a spreadsheet in sight.",
    capabilities: [
      { icon: "📥", title: "Statement Import", desc: "Upload CSV or Excel bank statements. FinovaOS parses them automatically." },
      { icon: "🤝", title: "Auto-Matching", desc: "Transactions matched against ledger entries by amount, date, and reference." },
      { icon: "🔍", title: "Discrepancy View", desc: "Unmatched items highlighted. Investigate and resolve with one click." },
      { icon: "✅", title: "Reconciliation Sign-Off", desc: "Mark periods as reconciled. Lock against further changes." },
      { icon: "🏦", title: "Multi-Bank", desc: "Manage multiple bank accounts and currencies simultaneously." },
      { icon: "📊", title: "Reconciliation Reports", desc: "Full reconciliation summary for auditors and management." },
      { icon: "🔄", title: "Opening Balances", desc: "Import historical balances when migrating from another system." },
      { icon: "📅", title: "Period History", desc: "View past reconciliation periods. Reopen if corrections are needed." },
    ],
    whoFor: ["Accountants", "Finance managers", "Trading companies", "Any business with a bank account"],
    stats: [{ val: "90%", label: "Faster close" }, { val: "Auto", label: "Transaction match" }, { val: "Multi", label: "Bank accounts" }, { val: "0", label: "Spreadsheets needed" }],
    related: ["accounting", "reports", "invoicing"],
  },

  "hr-payroll": {
    slug: "hr-payroll",
    icon: "👥",
    color: "#a78bfa",
    glow: "rgba(167,139,250,.15)",
    title: "HR & Payroll",
    tagline: "Pay your team right. Every time.",
    description: "From onboarding to payslips, FinovaOS's HR module handles your entire workforce. Track attendance, process salaries, manage leaves, and generate payslips — all integrated with your accounts so payroll is always in sync with your books.",
    capabilities: [
      { icon: "👤", title: "Employee Records", desc: "Store employee details, contracts, documents, and employment history." },
      { icon: "⏰", title: "Attendance Tracking", desc: "Mark daily attendance manually or via import. Late and absent tracking." },
      { icon: "💸", title: "Salary Processing", desc: "Run monthly payroll with deductions, bonuses, and tax automatically." },
      { icon: "🌴", title: "Leave Management", desc: "Apply, approve, and track annual, sick, and casual leave balances." },
      { icon: "📄", title: "Payslip Generation", desc: "Generate and email professional payslips to employees instantly." },
      { icon: "🔢", title: "Allowances & Deductions", desc: "Configure custom allowance and deduction heads per employee." },
      { icon: "📊", title: "Payroll Reports", desc: "Payroll summary, salary register, and tax deduction reports." },
      { icon: "📒", title: "Accounting Integration", desc: "Payroll entries automatically post to the ledger. No manual entry." },
    ],
    whoFor: ["SMEs with staff", "Factories & manufacturing", "Schools & institutions", "Retail chains", "Any employer"],
    stats: [{ val: "Auto", label: "Ledger posting" }, { val: "1-click", label: "Payslips" }, { val: "Multi", label: "Allowance types" }, { val: "Full", label: "Leave tracking" }],
    related: ["accounting", "reports", "role-access"],
  },

  crm: {
    slug: "crm",
    icon: "🤝",
    color: "#f97316",
    glow: "rgba(249,115,22,.15)",
    title: "CRM",
    tagline: "Never lose a lead. Never miss a follow-up.",
    description: "FinovaOS's built-in CRM keeps your sales pipeline organized. Manage leads, log interactions, set follow-up reminders, and track opportunities from first contact to closed deal — all linked to your accounts.",
    capabilities: [
      { icon: "🎯", title: "Lead Management", desc: "Capture and qualify leads from any source. Assign to team members." },
      { icon: "📞", title: "Interaction Logs", desc: "Record calls, meetings, emails, and notes against each contact." },
      { icon: "🔔", title: "Follow-Up Reminders", desc: "Set reminders so no lead falls through the cracks." },
      { icon: "📊", title: "Pipeline View", desc: "Visualize your sales pipeline by stage. Drag and drop deals." },
      { icon: "💼", title: "Opportunity Tracking", desc: "Track deal value, close probability, and expected close date." },
      { icon: "👥", title: "Customer History", desc: "See every invoice, payment, and interaction for each customer." },
      { icon: "📈", title: "Sales Reports", desc: "Win/loss analysis, conversion rates, and revenue by salesperson." },
      { icon: "🔗", title: "Account Integration", desc: "Convert an opportunity to an invoice in one click." },
    ],
    whoFor: ["Sales teams", "Service businesses", "Distributors", "B2B companies", "Any business with a sales process"],
    stats: [{ val: "Full", label: "Pipeline view" }, { val: "Auto", label: "Reminders" }, { val: "1-click", label: "Invoice creation" }, { val: "360°", label: "Customer view" }],
    related: ["invoicing", "reports", "multi-branch"],
  },

  "multi-branch": {
    slug: "multi-branch",
    icon: "🏢",
    color: "#06b6d4",
    glow: "rgba(6,182,212,.15)",
    title: "Multi-Branch & Multi-Company",
    tagline: "One login. All your businesses.",
    description: "Run multiple branches or entirely separate companies from a single FinovaOS account. Switch between entities in seconds, consolidate reports across all of them, and keep data perfectly isolated where needed.",
    capabilities: [
      { icon: "🔀", title: "Instant Switching", desc: "Switch between companies or branches in one click. No re-login." },
      { icon: "📊", title: "Consolidated Reports", desc: "Group P&L, balance sheets, and cash flow across all entities." },
      { icon: "🔒", title: "Data Isolation", desc: "Each company's data is fully separate. No accidental cross-posting." },
      { icon: "👥", title: "Shared Users", desc: "One user can work across multiple companies with different roles each." },
      { icon: "🏭", title: "Branch Management", desc: "Add unlimited branches per company. Track performance per branch." },
      { icon: "💱", title: "Inter-Company Transactions", desc: "Record loans, transfers, and transactions between your companies." },
      { icon: "📋", title: "Per-Branch Reporting", desc: "Drill into individual branch P&L and inventory independently." },
      { icon: "⚙️", title: "Centralized Settings", desc: "Manage users, roles, and permissions from one admin panel." },
    ],
    whoFor: ["Business groups", "Franchise owners", "Multi-location retailers", "Holding companies", "Entrepreneurs with multiple businesses"],
    stats: [{ val: "Unlimited", label: "Companies" }, { val: "Unlimited", label: "Branches" }, { val: "1", label: "Login" }, { val: "Consolidated", label: "Reports" }],
    related: ["accounting", "role-access", "reports"],
  },

  "role-access": {
    slug: "role-access",
    icon: "🔐",
    color: "#ec4899",
    glow: "rgba(236,72,153,.15)",
    title: "Role-Based Access Control",
    tagline: "The right access for the right person.",
    description: "Not everyone needs to see everything. FinovaOS's granular permission system lets you define exactly what each team member can view, create, edit, or delete — across every module and every company.",
    capabilities: [
      { icon: "🎭", title: "Custom Roles", desc: "Create roles like Accountant, Manager, Auditor, or Cashier with specific permissions." },
      { icon: "🔒", title: "Module-Level Access", desc: "Grant or restrict access to any module individually per role." },
      { icon: "👁️", title: "View / Edit / Delete", desc: "Fine-grained control: users can view but not edit, or edit but not delete." },
      { icon: "🏢", title: "Per-Company Roles", desc: "A user can be Admin in Company A and read-only in Company B." },
      { icon: "📋", title: "Audit Logs", desc: "Every action logged with user, timestamp, and change details." },
      { icon: "🔑", title: "Admin Panel", desc: "Central panel to manage all users, roles, and permissions." },
      { icon: "📧", title: "User Invitations", desc: "Invite team members by email. They set their own password." },
      { icon: "🚫", title: "IP & Session Control", desc: "Limit access by session. Force re-login after inactivity." },
    ],
    whoFor: ["Businesses with finance teams", "Companies with external accountants", "Multi-branch operations", "Any business with more than one user"],
    stats: [{ val: "Unlimited", label: "Roles" }, { val: "Module", label: "Level control" }, { val: "Full", label: "Audit trail" }, { val: "Per-co.", label: "Role assignment" }],
    related: ["multi-branch", "accounting", "reports"],
  },

  reports: {
    slug: "reports",
    icon: "📈",
    color: "#10b981",
    glow: "rgba(16,185,129,.15)",
    title: "Reports & Analytics",
    tagline: "Every number. One screen. Zero waiting.",
    description: "FinovaOS generates financial and operational reports in real time. From standard accounting reports to custom dashboards — see exactly where your business stands without chasing your accountant.",
    capabilities: [
      { icon: "💰", title: "Cash Flow Statement", desc: "Operating, investing, and financing activities. Daily or monthly view." },
      { icon: "📊", title: "P&L Statement", desc: "Income vs expenses. Filter by date, branch, or cost center." },
      { icon: "⚖️", title: "Balance Sheet", desc: "Snapshot of assets, liabilities, and equity at any date." },
      { icon: "🧮", title: "Trial Balance", desc: "All accounts with debit/credit totals. Spot errors instantly." },
      { icon: "⏳", title: "Ageing Reports", desc: "Receivables and payables by age bucket. Know who owes you." },
      { icon: "🧾", title: "Tax Reports", desc: "GST, VAT, or sales tax summaries ready for filing." },
      { icon: "📦", title: "Inventory Reports", desc: "Stock valuation, movement, and slow-moving item analysis." },
      { icon: "📤", title: "Export Anywhere", desc: "Download any report as PDF or Excel. Share with one click." },
    ],
    whoFor: ["Business owners", "Finance managers", "Accountants", "Auditors", "Anyone making financial decisions"],
    stats: [{ val: "Real-time", label: "All reports" }, { val: "PDF+XLS", label: "Export formats" }, { val: "15+", label: "Report types" }, { val: "Custom", label: "Date ranges" }],
    related: ["accounting", "bank-reconciliation", "multi-branch"],
  },

  pos: {
    slug: "pos",
    icon: "🛒",
    color: "#f59e0b",
    glow: "rgba(245,158,11,.15)",
    title: "Point of Sale (POS)",
    tagline: "Fast checkout. Automatic books.",
    description: "FinovaOS's POS is built for retail, restaurants, and counters. Ring up sales in seconds, accept any payment method, and watch your inventory and ledger update automatically — no end-of-day manual entries.",
    capabilities: [
      { icon: "⚡", title: "Fast Checkout", desc: "Keyboard-driven interface. Search items by name or barcode instantly." },
      { icon: "📷", title: "Barcode Scanning", desc: "Scan barcodes for instant item lookup and quantity entry." },
      { icon: "💳", title: "Split Payments", desc: "Accept cash, card, and bank transfer in any combination per sale." },
      { icon: "🧾", title: "Receipt Printing", desc: "Print or email customer receipts. Customizable receipt template." },
      { icon: "📦", title: "Auto Inventory Deduction", desc: "Every sale deducts stock in real time. No manual stock entry." },
      { icon: "📒", title: "Auto Ledger Entry", desc: "POS sales post automatically to accounts. Zero manual accounting." },
      { icon: "🔄", title: "Returns & Refunds", desc: "Process returns, restock items, and refund customers quickly." },
      { icon: "📊", title: "Shift Reports", desc: "End-of-shift sales summary with payment method breakdown." },
    ],
    whoFor: ["Retail shops", "Pharmacies", "Restaurants & cafes", "Salons & spas", "Grocery stores", "Any walk-in counter"],
    stats: [{ val: "< 5s", label: "Per transaction" }, { val: "Auto", label: "Stock deduction" }, { val: "Split", label: "Payment types" }, { val: "Zero", label: "Manual entries" }],
    related: ["inventory", "invoicing", "reports"],
  },

  "purchase-grn": {
    slug: "purchase-grn",
    icon: "📋",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,.15)",
    title: "Purchase & GRN",
    tagline: "Control your procurement end-to-end.",
    description: "From purchase order to goods received to supplier payment — FinovaOS tracks the full procurement cycle. Match GRNs to POs, verify quantities, and post payables automatically when goods arrive.",
    capabilities: [
      { icon: "📝", title: "Purchase Orders", desc: "Create and send POs to suppliers. Track approval status." },
      { icon: "📦", title: "Goods Received Notes", desc: "Record what actually arrived. Match against the original PO." },
      { icon: "🔍", title: "PO vs GRN Matching", desc: "Spot quantity and price discrepancies before paying." },
      { icon: "🧾", title: "Supplier Invoices", desc: "Create purchase invoices from GRNs with one click." },
      { icon: "💸", title: "Payment Vouchers", desc: "Record supplier payments. Track outstanding payables." },
      { icon: "📊", title: "Supplier Ageing", desc: "See what you owe to each supplier and when it's due." },
      { icon: "📦", title: "Inventory Update", desc: "Stock levels increase automatically on GRN confirmation." },
      { icon: "📒", title: "Ledger Integration", desc: "All procurement entries post to accounts automatically." },
    ],
    whoFor: ["Wholesalers", "Manufacturers", "Retailers", "Importers", "Any business that buys from suppliers"],
    stats: [{ val: "Auto", label: "PO matching" }, { val: "Auto", label: "Stock update" }, { val: "Full", label: "Payables view" }, { val: "Zero", label: "Duplicate entries" }],
    related: ["inventory", "invoicing", "accounting"],
  },

  "multi-currency": {
    slug: "multi-currency",
    icon: "🌍",
    color: "#14b8a6",
    glow: "rgba(20,184,166,.15)",
    title: "Multi-Currency",
    tagline: "Do business in any currency. Anywhere.",
    description: "Transact, invoice, and report in any currency while keeping your books in your base currency. FinovaOS handles exchange rates, gain/loss calculations, and currency conversion automatically.",
    capabilities: [
      { icon: "💱", title: "Any Currency", desc: "Support for 150+ world currencies. Add custom currencies too." },
      { icon: "📡", title: "Live Exchange Rates", desc: "Auto-fetch current exchange rates or set your own manually." },
      { icon: "📈", title: "Gain / Loss Tracking", desc: "Realized and unrealized forex gains and losses calculated automatically." },
      { icon: "🧾", title: "Foreign Currency Invoices", desc: "Invoice customers in their currency. Books stay in your base currency." },
      { icon: "🏦", title: "Foreign Bank Accounts", desc: "Manage bank accounts in any currency with proper revaluation." },
      { icon: "📊", title: "Currency Reports", desc: "See exposure, open positions, and gain/loss by currency." },
      { icon: "🔄", title: "Currency Revaluation", desc: "Revalue foreign balances at period end for accurate reporting." },
      { icon: "🌏", title: "Global Compliance", desc: "Meets accounting standards for multi-currency in 40+ countries." },
    ],
    whoFor: ["Importers & exporters", "International businesses", "Companies with foreign clients", "Any business dealing in multiple currencies"],
    stats: [{ val: "150+", label: "Currencies" }, { val: "Auto", label: "Rate fetching" }, { val: "Real-time", label: "Gain/loss calc" }, { val: "40+", label: "Country compliant" }],
    related: ["accounting", "invoicing", "bank-reconciliation"],
  },
};

const RELATED_LABELS: Record<string, string> = {
  accounting: "Accounting & Ledger",
  invoicing: "Invoicing",
  inventory: "Inventory Management",
  "bank-reconciliation": "Bank Reconciliation",
  "hr-payroll": "HR & Payroll",
  crm: "CRM",
  "multi-branch": "Multi-Branch & Multi-Co.",
  "role-access": "Role-Based Access",
  reports: "Reports & Analytics",
  pos: "Point of Sale",
  "purchase-grn": "Purchase & GRN",
  "multi-currency": "Multi-Currency",
};

/* ─────────────────────────────────────────────
   METADATA
───────────────────────────────────────────── */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = MODULES[slug];
  if (!m) return { title: "Feature Not Found" };
  return {
    title: `${m.title} — FinovaOS`,
    description: m.description,
  };
}

export function generateStaticParams() {
  return Object.keys(MODULES).map((slug) => ({ slug }));
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = MODULES[slug];
  if (!m) notFound();

  return (
    <div style={{
      background: "linear-gradient(160deg,#05071a 0%,#080c22 50%,#070a1e 100%)",
      minHeight: "100vh", fontFamily: "'Outfit', sans-serif", color: "white",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Lora:wght@600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
        .cap-card { transition: all .25s; }
        .cap-card:hover { background: rgba(255,255,255,.07) !important; border-color: ${m.color}50 !important; transform: translateY(-3px); }
        .rel-card { transition: all .2s; }
        .rel-card:hover { background: rgba(255,255,255,.07) !important; border-color: rgba(255,255,255,.2) !important; }
      `}</style>

      {/* ── Hero ── */}
      <section style={{
        padding: "100px 24px 80px",
        position: "relative", overflow: "hidden",
        borderBottom: "1px solid rgba(255,255,255,.06)",
      }}>
        {/* BG glow */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)", backgroundSize:"52px 52px" }} />
          <div style={{ position:"absolute", top:-100, left:"50%", transform:"translateX(-50%)", width:600, height:600, borderRadius:"50%", background:`radial-gradient(circle,${m.glow},transparent 65%)`, pointerEvents:"none" }} />
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative", animation: "fadeUp .6s ease both" }}>
          {/* Breadcrumb */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:28, fontSize:13, color:"rgba(255,255,255,.35)" }}>
            <Link href="/features" style={{ color:"rgba(255,255,255,.35)", textDecoration:"none" }}>Features</Link>
            <span>›</span>
            <span style={{ color:"rgba(255,255,255,.6)" }}>{m.title}</span>
          </div>

          {/* Icon */}
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: "0 auto 24px",
            background: `${m.color}18`, border: `1.5px solid ${m.color}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32,
            boxShadow: `0 8px 32px ${m.glow}`,
          }}>
            {m.icon}
          </div>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 14px", borderRadius: 100, marginBottom: 20,
            background: `${m.color}15`, border: `1.5px solid ${m.color}30`,
          }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:m.color, display:"inline-block", animation:"blink 2s ease infinite" }} />
            <span style={{ fontSize:11, fontWeight:700, color:m.color, letterSpacing:".08em" }}>FINOVA MODULE</span>
          </div>

          <h1 style={{
            fontFamily: "'Lora', serif",
            fontSize: "clamp(36px, 5vw, 58px)",
            fontWeight: 700, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16,
          }}>{m.title}</h1>

          <p style={{
            fontSize: 20, color: m.color, fontWeight: 600, marginBottom: 20, letterSpacing: "-.2px",
          }}>{m.tagline}</p>

          <p style={{ fontSize: 16.5, color: "rgba(255,255,255,.48)", lineHeight: 1.8, marginBottom: 40, maxWidth: 620, margin: "0 auto 40px" }}>
            {m.description}
          </p>

          {/* Stats */}
          <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap", marginBottom: 44 }}>
            {m.stats.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "white", letterSpacing: "-.5px" }}>{s.val}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/pricing" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700,
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "white", textDecoration: "none",
              boxShadow: "0 4px 20px rgba(99,102,241,.4)",
            }}>
              Get Started →
            </Link>
            <Link href="/demo" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              border: "1.5px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.04)",
              color: "rgba(255,255,255,.7)", textDecoration: "none",
            }}>
              Watch Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section style={{ padding: "80px 24px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Lora', serif",
            fontSize: "clamp(26px, 3vw, 38px)",
            fontWeight: 700, textAlign: "center",
            letterSpacing: "-.8px", marginBottom: 12,
          }}>
            What&apos;s included
          </h2>
          <p style={{ textAlign:"center", fontSize:15, color:"rgba(255,255,255,.4)", marginBottom:48 }}>
            Everything you need — nothing you don&apos;t.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {m.capabilities.map((c, i) => (
              <div key={i} className="cap-card" style={{
                borderRadius: 14, padding: "20px 18px",
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.07)",
              }}>
                <div style={{ fontSize: 22, marginBottom: 10 }}>{c.icon}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.9)", marginBottom: 6 }}>{c.title}</h3>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.38)", lineHeight: 1.7 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section style={{ padding: "72px 24px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "5px 14px", borderRadius: 100, marginBottom: 18,
              background: `${m.color}15`, border: `1px solid ${m.color}30`,
              fontSize: 11, fontWeight: 700, color: m.color, letterSpacing: ".08em",
            }}>
              WHO IT&apos;S FOR
            </div>
            <h2 style={{
              fontFamily: "'Lora', serif",
              fontSize: "clamp(24px, 3vw, 36px)",
              fontWeight: 700, letterSpacing: "-.6px", lineHeight: 1.2, marginBottom: 16,
            }}>
              Built for businesses like yours
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.42)", lineHeight: 1.8 }}>
              Whether you&apos;re running a single outlet or a multi-branch operation, {m.title} adapts to your workflow.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {m.whoFor.map((w) => (
              <div key={w} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 18px", borderRadius: 12,
                background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,.75)" }}>{w}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related modules ── */}
      <section style={{ padding: "72px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Lora', serif",
            fontSize: "clamp(22px, 2.5vw, 32px)",
            fontWeight: 700, marginBottom: 8, letterSpacing: "-.5px",
          }}>
            Works great with
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.38)", marginBottom: 28 }}>These modules connect seamlessly with {m.title}.</p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {m.related.map((r) => (
              <Link key={r} href={`/features/${r}`} className="rel-card" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "14px 20px", borderRadius: 14,
                background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                textDecoration: "none", color: "rgba(255,255,255,.75)", fontWeight: 600, fontSize: 14,
              }}>
                <span>{MODULES[r]?.icon}</span>
                <span>{RELATED_LABELS[r]}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            ))}
          </div>

          {/* Final CTA */}
          <div style={{
            marginTop: 64, borderRadius: 20, padding: "44px 48px",
            background: "rgba(99,102,241,.07)", border: "1.5px solid rgba(99,102,241,.2)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 24, position: "relative", overflow: "hidden",
          }}>
            <div style={{ position:"absolute", right:-40, top:"50%", transform:"translateY(-50%)", width:250, height:250, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.14),transparent 70%)", pointerEvents:"none" }} />
            <div style={{ position: "relative" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "4px 12px", borderRadius: 100, marginBottom: 12,
                background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.25)",
                fontSize: 11, fontWeight: 700, color: "#fbbf24",
              }}>
                🏷️ 75% OFF — FIRST 3 MONTHS
              </div>
              <h3 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(18px,2.5vw,24px)", fontWeight:700, marginBottom:6, letterSpacing:"-.4px" }}>
                Ready to try {m.title}?
              </h3>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.4)" }}>All modules included in every plan. No add-on fees.</p>
            </div>
            <div style={{ display:"flex", gap:12, position:"relative", flexWrap:"wrap" }}>
              <Link href="/pricing" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"13px 28px", borderRadius:12, fontSize:14, fontWeight:700,
                background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                color:"white", textDecoration:"none",
                boxShadow:"0 4px 20px rgba(99,102,241,.4)",
              }}>
                Get Started →
              </Link>
              <Link href="/features" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"12px 22px", borderRadius:12, fontSize:14, fontWeight:600,
                border:"1.5px solid rgba(255,255,255,.12)",
                background:"rgba(255,255,255,.04)",
                color:"rgba(255,255,255,.7)", textDecoration:"none",
              }}>
                All Features
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
