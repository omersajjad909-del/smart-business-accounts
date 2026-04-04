"use client";
import Link from "next/link";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════
   DATA — All FinovaOS features with complete data
══════════════════════════════════════════════════════════ */
const CATEGORIES = [
  {
    id: "accounting",
    label: "Accounting & Finance",
    emoji: "📊",
    color: "#818cf8",
    glow: "rgba(129,140,248,.22)",
    dim: "rgba(129,140,248,.08)",
    border: "rgba(129,140,248,.3)",
    items: [
      {
        name: "General Ledger & Trial Balance",
        description: "Maintain a real-time, accurate general ledger with double-entry bookkeeping. Every transaction is automatically posted to the correct accounts. Generate trial balances instantly to ensure your books are always balanced.",
        highlights: ["Double-entry precision", "Instant trial balance", "Historical data tracking"],
        mockType: "ledger",
      },
      {
        name: "Profit & Loss Statement",
        description: "Track your company's financial performance with detailed P&L reports. Analyze revenue streams, break down costs by category, and monitor net profitability over any custom date range.",
        highlights: ["Revenue analysis", "Expense breakdown", "Net profit tracking"],
        mockType: "pl",
      },
      {
        name: "Balance Sheet",
        description: "Get a real-time snapshot of your company's financial health. View current assets, fixed assets, liabilities, and equity in a standardized format ready for auditors, banks, or investors.",
        highlights: ["Asset valuation", "Liability management", "Equity overview"],
        mockType: "balance",
      },
      {
        name: "Tax Summary & Reporting",
        description: "Simplify tax season with automated tax summaries. Track GST, Sales Tax, and VAT — compatible exports for major tax authorities worldwide. One click to generate filing-ready reports.",
        highlights: ["GST/VAT automation", "Multi-jurisdiction compatible", "Tax liability reports"],
        mockType: "tax",
      },
      {
        name: "Bank Reconciliation",
        description: "Import bank statement transactions alongside FinovaOS ledger entries, review differences quickly, and close your books with a guided reconciliation workflow.",
        highlights: ["Statement import", "Discrepancy flagging", "Review workflow"],
        mockType: "reconciliation",
      },
      {
        name: "Cost Center Management",
        description: "Track revenues and expenses by department, project, or branch. Assign any transaction to a cost center and generate profitability reports per segment — without creating separate companies.",
        highlights: ["Departmental tracking", "Project profitability", "Granular expense control"],
        mockType: "costcenter",
      },
      {
        name: "Budgeting & Forecasting",
        description: "Set monthly or annual budgets for any account or department. Compare actuals vs. budget in real time. Get alerts when spending approaches limits — stay in control, proactively.",
        highlights: ["Monthly & annual budgets", "Actual vs. budget variance", "Overspend alerts"],
        mockType: "budget",
      },
      {
        name: "Cash Payment & Receipt Vouchers (CPV/CRV)",
        description: "Record all cash payments and receipts with structured vouchers. Every CPV and CRV is linked to the correct account, posted in real time, and carries a full audit trail — no untracked cash movements.",
        highlights: ["Cash payment vouchers", "Cash receipt vouchers", "Real-time ledger posting"],
        mockType: "cpv",
      },
      {
        name: "Opening Balances & Financial Year",
        description: "Set your opening balances when migrating from another system. Lock closed financial years to prevent backdated entries. One-click year-end closing posts carry-forward entries automatically.",
        highlights: ["Migration-friendly setup", "Year locking", "Auto carry-forward"],
        mockType: "opening",
      },
      {
        name: "Recurring Transactions",
        description: "Automate repeat entries — monthly rent, utility bills, subscriptions, and standing journal entries. Set frequency, end date, and FinovaOS posts them automatically — zero manual effort.",
        highlights: ["Auto-posting", "Flexible frequency", "Invoice & JV support"],
        mockType: "recurring",
      },
      {
        name: "Journal Vouchers",
        description: "Post manual journal entries for adjustments, accruals, and corrections. Every entry has a full audit trail with user, timestamp, and narration. Recurring journal entries can be automated.",
        highlights: ["Manual adjustments", "Recurring JVs", "Full audit trail"],
        mockType: "journal",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales & Invoicing",
    emoji: "🧾",
    color: "#34d399",
    glow: "rgba(52,211,153,.22)",
    dim: "rgba(52,211,153,.08)",
    border: "rgba(52,211,153,.3)",
    items: [
      {
        name: "Professional Sales Invoices",
        description: "Create and send beautiful, branded invoices in under 2 minutes. Choose from 5 professional templates, add your logo, and send directly from FinovaOS via email or WhatsApp. Track payment status in real time.",
        highlights: ["5 branded templates", "Email & WhatsApp send", "Real-time payment tracking"],
        mockType: "invoice",
      },
      {
        name: "Quotations & Estimates",
        description: "Generate detailed quotations, set validity dates, and track quote progress from draft to customer approval with a clean sales workflow.",
        highlights: ["Validity tracking", "Quote status visibility", "Share-ready documents"],
        mockType: "quotation",
      },
      {
        name: "Delivery Challans",
        description: "Create delivery challans before invoicing — perfect for businesses that deliver first and invoice later. Track dispatch details, driver, vehicle number, and convert to invoice when confirmed.",
        highlights: ["Pre-invoice dispatch", "Driver & vehicle tracking", "Challan to invoice"],
        mockType: "challan",
      },
      {
        name: "Sales Returns & Credit Notes",
        description: "Handle sales returns efficiently. Issue credit notes against specific invoices, automatically update stock levels, and keep your accounts perfectly in sync — no manual corrections needed.",
        highlights: ["Credit note issuance", "Auto inventory update", "Return-to-invoice linking"],
        mockType: "returns",
      },
      {
        name: "Accounts Receivable",
        description: "Monitor all outstanding customer payments in one view. Aging reports show overdue invoices by 0–30, 31–60, 61–90, and 90+ days, with customer statements ready when you need follow-up.",
        highlights: ["Aging analysis", "Customer statements", "Receivables visibility"],
        mockType: "receivable",
      },
      {
        name: "Multi-Currency Invoicing",
        description: "Invoice international clients with supported currencies, keep exchange rates up to date, and manage foreign-currency transactions from one place.",
        highlights: ["Supported global currencies", "Rate management", "International invoicing"],
        mockType: "multicurrency",
      },
    ],
  },
  {
    id: "purchases",
    label: "Purchases & Payables",
    emoji: "🛒",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.22)",
    dim: "rgba(251,191,36,.08)",
    border: "rgba(251,191,36,.3)",
    items: [
      {
        name: "Purchase Orders",
        description: "Create and send professional purchase orders to suppliers. Track delivery status — fully received, partial, or pending. Auto-generate purchase invoices when goods arrive.",
        highlights: ["PO to GRN matching", "Partial receipt tracking", "Supplier communication"],
        mockType: "po",
      },
      {
        name: "Purchase Invoices & GRN",
        description: "Record supplier invoices with automatic stock updates. Match against purchase orders to prevent over-invoicing. Every purchase is posted to your accounts payable instantly.",
        highlights: ["3-way matching", "Auto stock entry", "AP posting"],
        mockType: "purchase",
      },
      {
        name: "Accounts Payable",
        description: "Track all supplier payments with aging reports. Know exactly what you owe, to whom, and when it's due. Schedule payments to maintain good supplier relationships.",
        highlights: ["Payables aging", "Payment scheduling", "Supplier statements"],
        mockType: "payable",
      },
      {
        name: "Advance Payments",
        description: "Record advance payments to suppliers and adjust them against future invoices. Track the advance balance per supplier and ensure accurate accounting treatment.",
        highlights: ["Advance tracking", "Invoice adjustment", "Balance monitoring"],
        mockType: "advance",
      },
      {
        name: "Expense Vouchers",
        description: "Record and approve business expenses with a structured workflow. Attach receipts, categorize by expense type, and route through approval levels. Expenses post directly to your accounts.",
        highlights: ["Receipt attachments", "Approval workflow", "Auto account posting"],
        mockType: "expense",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & Stock",
    emoji: "📦",
    color: "#38bdf8",
    glow: "rgba(56,189,248,.22)",
    dim: "rgba(56,189,248,.08)",
    border: "rgba(56,189,248,.3)",
    items: [
      {
        name: "Real-Time Inventory Tracking",
        description: "Monitor stock levels across all locations in real time. Every purchase and sale automatically updates inventory. Set minimum stock levels and receive alerts before you run out.",
        highlights: ["Live stock levels", "Auto update on sales/purchase", "Low-stock alerts"],
        mockType: "stock",
      },
      {
        name: "Stock Reports & Analytics",
        description: "Generate detailed stock ledgers, movement history, location-wise summaries, and stock valuation reports. Know exactly what you have, where it is, and what it's worth.",
        highlights: ["Stock ledger", "Movement history", "Valuation reports"],
        mockType: "stockreport",
      },
      {
        name: "Multi-Location Management",
        description: "Manage inventory across multiple warehouses, branches, or godowns. Transfer stock between locations with full audit trails. Each location has its own stock position.",
        highlights: ["Unlimited locations", "Stock transfers", "Location-wise reports"],
        mockType: "multilocation",
      },
      {
        name: "Barcode & SKU Management",
        description: "Assign barcodes to all products for fast scanning at point of sale or goods receipt. Search by barcode, SKU, or product name. Supports all standard barcode formats.",
        highlights: ["Barcode scanning", "SKU management", "Fast item lookup"],
        mockType: "barcode",
      },
    ],
  },
  {
    id: "hr",
    label: "HR & Payroll",
    emoji: "👥",
    color: "#f87171",
    glow: "rgba(248,113,113,.22)",
    dim: "rgba(248,113,113,.08)",
    border: "rgba(248,113,113,.3)",
    items: [
      {
        name: "Employee Management",
        description: "Centralize all employee information — personal details, national ID, designation, department, joining date, and salary structure. Store contracts, certificates, and documents in the digital vault.",
        highlights: ["Digital employee files", "Document storage", "Department management"],
        mockType: "employee",
      },
      {
        name: "Attendance & Leave Tracking",
        description: "Track daily attendance, check-in/out times, and leave applications. Manage casual, sick, and annual leave balances. Attendance data flows directly into payroll — no double entry.",
        highlights: ["Daily attendance", "Leave management", "Payroll integration"],
        mockType: "attendance",
      },
      {
        name: "Automated Payroll",
        description: "Run monthly payroll in minutes. FinovaOS automatically calculates basic salary, allowances, deductions, Social Security, gratuity accrual, and Tax Withholding.",
        highlights: ["Auto tax deductions", "Social Security", "One-click payslips"],
        mockType: "payroll",
      },
      {
        name: "Advance Salary Management",
        description: "Record employee salary advances and automatically deduct from future payroll. Track the outstanding advance balance per employee. Complete audit trail for every advance.",
        highlights: ["Advance recording", "Auto deduction", "Balance tracking"],
        mockType: "advance_salary",
      },
    ],
  },
  {
    id: "banking",
    label: "Banking & Cash Flow",
    emoji: "🏦",
    color: "#2dd4bf",
    glow: "rgba(45,212,191,.22)",
    dim: "rgba(45,212,191,.08)",
    border: "rgba(45,212,191,.3)",
    items: [
      {
        name: "Loans & Disbursements",
        description: "Record and track employee or business loans with full repayment schedules. Monitor outstanding balances, calculate interest accrual, and auto-post EMI payments to your accounts — no manual journal entries needed.",
        highlights: ["Repayment schedules", "Interest tracking", "Auto EMI posting"],
        mockType: "loans",
      },
      {
        name: "Petty Cash Management",
        description: "Manage daily petty cash with a dedicated cash box per location. Record expenses, track the running balance, and reconcile actual cash vs. system balance with a complete audit trail.",
        highlights: ["Per-location cash boxes", "Balance tracking", "Expense categorisation"],
        mockType: "pettycash",
      },
      {
        name: "Bulk Payment Processing",
        description: "Approve and process multiple supplier payments in a single batch. Reduce manual data entry, eliminate payment errors, and maintain a full record of every bulk payment run.",
        highlights: ["Batch approvals", "Error-free processing", "Full payment history"],
        mockType: "bulkpay",
      },
      {
        name: "Cash Flow Statement",
        description: "See exactly where your cash is coming from and where it's going. FinovaOS generates a real-time cash flow statement categorized into operating, investing, and financing activities — no manual preparation.",
        highlights: ["Operating / investing / financing", "Real-time view", "Export-ready"],
        mockType: "cashflow",
      },
    ],
  },
  {
    id: "crm",
    label: "CRM & Contacts",
    emoji: "🤝",
    color: "#c4b5fd",
    glow: "rgba(196,181,253,.22)",
    dim: "rgba(196,181,253,.08)",
    border: "rgba(196,181,253,.3)",
    items: [
      {
        name: "Contact Management",
        description: "Maintain a complete database of customers, suppliers, leads, and partners. Each contact has a full profile with interaction history, outstanding balances, and linked documents.",
        highlights: ["360° contact view", "Interaction history", "Outstanding balances"],
        mockType: "contacts",
      },
      {
        name: "Sales Pipeline",
        description: "Track deals from lead to close with a visual pipeline. Set deal values, probability, and expected close dates. See your total pipeline value and forecast revenue accurately.",
        highlights: ["Visual pipeline", "Deal forecasting", "Stage management"],
        mockType: "pipeline",
      },
      {
        name: "Interaction Logging",
        description: "Log every call, meeting, email, and site visit against a contact. Set follow-up reminders. Your entire sales team shares a unified activity feed — no lead falls through the cracks.",
        highlights: ["Activity logging", "Follow-up reminders", "Team visibility"],
        mockType: "interactions",
      },
    ],
  },
  {
    id: "admin",
    label: "Administration & Security",
    emoji: "🔒",
    color: "#a78bfa",
    glow: "rgba(167,139,250,.22)",
    dim: "rgba(167,139,250,.08)",
    border: "rgba(167,139,250,.3)",
    items: [
      {
        name: "Role-Based Access Control",
        description: "Define exactly what each user can see and do. Create custom roles (Admin, Accountant, Viewer, Sales), assign granular permissions per module, and isolate data by branch or company.",
        highlights: ["Custom roles", "Module permissions", "Branch isolation"],
        mockType: "rbac",
      },
      {
        name: "Audit Trails & Activity Logs",
        description: "Every action in FinovaOS is logged with user identity, timestamp, IP address, and device. See who created, edited, approved, or deleted any record. Full compliance-ready audit trail.",
        highlights: ["User tracking", "IP & device logs", "Change history"],
        mockType: "audit",
      },
      {
        name: "Multi-Company Management",
        description: "Manage multiple businesses from a single FinovaOS account. Switch between companies instantly. Complete data isolation between entities — no cross-contamination of financial data.",
        highlights: ["Instant switching", "Data isolation", "Group consolidation"],
        mockType: "multicompany",
      },
      {
        name: "Multi-Branch Operations",
        description: "Run operations across multiple branches or offices with branch-level reporting and access control. Consolidate all branches into a single P&L and Balance Sheet with one click.",
        highlights: ["Branch-level reporting", "Consolidated accounts", "Branch access control"],
        mockType: "multibranch",
      },
      {
        name: "API Access & Integrations",
        description: "Connect FinovaOS with selected business tools and bank services, with deeper integration support available for custom enterprise deployments.",
        highlights: ["Bank integrations", "Data exports", "Custom enterprise setup"],
        mockType: "api",
      },
      {
        name: "Approval Workflows",
        description: "Route invoices, purchase orders, expense vouchers, and payments through multi-level approval chains before posting. Prevent unauthorized transactions and maintain full control over your financials.",
        highlights: ["Multi-level approvals", "Automated routing", "Rejection with remarks"],
        mockType: "approvals",
      },
      {
        name: "Financial Period Locking",
        description: "Lock closed financial months or years to prevent accidental backdated entries. Only admins can unlock a period — with a full audit trail of who unlocked it and why.",
        highlights: ["Month/year locking", "Backdating prevention", "Admin override trail"],
        mockType: "periodlock",
      },
      {
        name: "WhatsApp & SMS Notifications",
        description: "Send payment reminders, invoices, and alerts directly via WhatsApp or SMS. Increase collection rates, reduce follow-up time, and reach customers on their preferred channel.",
        highlights: ["WhatsApp integration", "SMS fallback", "Payment reminders"],
        mockType: "whatsapp",
      },
      {
        name: "Data Import Wizard (Excel / CSV)",
        description: "Migrate from any accounting software or spreadsheet in minutes. Import customers, suppliers, inventory items, opening balances, and historical transactions with a guided step-by-step wizard and automatic field mapping.",
        highlights: ["Excel & CSV support", "Auto field mapping", "Validation before import"],
        mockType: "import",
      },
      {
        name: "AI Financial Assistant",
        description: "Ask questions about your business in plain English. Get instant summaries, spot anomalies, and receive actionable recommendations powered by Claude AI, built directly into your dashboard.",
        highlights: ["Natural language queries", "Multi-language support", "Claude AI powered"],
        mockType: "ai",
      },
    ],
  },
  {
    id: "industries",
    label: "Industry Solutions",
    emoji: "🏭",
    color: "#f59e0b",
    glow: "rgba(245,158,11,.22)",
    dim: "rgba(245,158,11,.08)",
    border: "rgba(245,158,11,.3)",
    items: [
      {
        name: "Manufacturing & Production",
        description: "Manage Bills of Materials (BOM), production orders, work orders, and raw material consumption. Track costs from raw material to finished goods with full costing visibility.",
        highlights: ["BOM management", "Production orders", "Cost tracking"],
        mockType: "manufacturing",
      },
      {
        name: "Restaurant & Food Service",
        description: "Manage tables, menu items, kitchen orders, and recipe costing. Calculate the exact cost of every dish, track food waste, and monitor profitability per menu item.",
        highlights: ["Table management", "Kitchen display", "Recipe costing"],
        mockType: "restaurant",
      },
      {
        name: "Real Estate & Property",
        description: "Track properties, tenants, rent collection, and lease agreements in one place. Automatic rent invoicing, overdue alerts, and property-wise profitability reports.",
        highlights: ["Tenant management", "Auto rent invoicing", "Property P&L"],
        mockType: "realestate",
      },
      {
        name: "School & Academy",
        description: "Manage students, fee collection, class schedules, and exam results. Automate fee reminders, generate fee receipts, and produce financial reports per academic term.",
        highlights: ["Fee management", "Student records", "Exam results"],
        mockType: "school",
      },
      {
        name: "Hospital & Clinic",
        description: "Handle patient records, appointments, prescriptions, and lab tests. Fully integrated with billing so every patient visit is automatically invoiced and posted to accounts.",
        highlights: ["Patient records", "Appointment scheduling", "Lab billing"],
        mockType: "hospital",
      },
      {
        name: "Retail & Point of Sale",
        description: "Run a full POS with barcode scanning, loyalty points, and real-time stock sync. Every sale posts instantly to accounts — no end-of-day reconciliation needed.",
        highlights: ["POS with barcode", "Loyalty program", "Live stock sync"],
        mockType: "retail",
      },
      {
        name: "Services & Agency",
        description: "Built for consultancies, agencies, and professional service firms. Manage client projects, quotations, retainer billing, and expense tracking — all linked to your accounts.",
        highlights: ["Project billing", "Retainer invoices", "Client portal"],
        mockType: "services",
      },
      {
        name: "Distribution & Wholesale",
        description: "Optimise your distribution network with route management, van sales, and delivery tracking. Wholesale-ready with multi-tier pricing, credit limits, and volume discount support.",
        highlights: ["Route management", "Van sales", "Credit limits"],
        mockType: "wholesale",
      },
    ],
  },
];

/* ══════════════════════════════════════════════════════════
   MOCK SCREEN COMPONENTS — Feature-specific designs
══════════════════════════════════════════════════════════ */
function MockScreen({ type, color }: { type: string; color: string }) {
  const dim = `${color}15`;
  const border = `${color}25`;

  const screens: Record<string, React.ReactNode> = {
    // Ledger
    ledger: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <div style={{ fontSize:11, fontWeight:700, color, opacity:.8 }}>General Ledger</div>
          <div style={{ display:"flex", gap:6 }}>
            {["DR","CR","BAL"].map(t=><div key={t} style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.3)", width:36, textAlign:"right" }}>{t}</div>)}
          </div>
        </div>
        {[
          { acc:"Cash & Bank",   dr:"124,500",cr:"38,200",  bal:"86,300",  c:color },
          { acc:"Sales Revenue", dr:"0",       cr:"420,000", bal:"420,000", c:"#34d399" },
          { acc:"Cost of Goods", dr:"210,000", cr:"0",       bal:"210,000", c:"#f87171" },
          { acc:"Accounts Rec.", dr:"85,000",  cr:"12,000",  bal:"73,000",  c:"#fbbf24" },
          { acc:"Expenses",      dr:"45,000",  cr:"0",       bal:"45,000",  c:"#f87171" },
        ].map(r=>(
          <div key={r.acc} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:`1px solid rgba(255,255,255,.05)` }}>
            <div style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.7)", flex:1 }}>{r.acc}</div>
            {[r.dr,r.cr,r.bal].map((v,i)=><div key={i} style={{ fontSize:10, fontWeight:700, color:i===2?r.c:"rgba(255,255,255,.5)", width:46, textAlign:"right" }}>{v}</div>)}
          </div>
        ))}
        <div style={{ marginTop:4, padding:"6px 8px", borderRadius:8, background:dim, border:`1px solid ${border}`, display:"flex", justifyContent:"flex-end", gap:12 }}>
          <div style={{ fontSize:10, fontWeight:800, color }}>Balanced ✓</div>
        </div>
      </div>
    ),

    // P&L
    pl: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Profit & Loss — March 2025</div>
        {[
          { label:"Revenue",          val:"$142,000", sub:true,  positive:true  },
          { label:"Cost of Goods",    val:"$71,000",  sub:false, positive:false },
          { label:"Gross Profit",     val:"$71,000",  sub:true,  positive:true  },
          { label:"Operating Expenses",val:"$19,000", sub:false, positive:false },
          { label:"Net Profit",       val:"$52,000",  sub:true,  positive:true  },
        ].map((r,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:r.sub?"7px 8px":"5px 8px", borderRadius:r.sub?8:0,
            background:r.sub?dim:"transparent", border:r.sub?`1px solid ${border}`:"none",
            borderBottom:!r.sub?"1px solid rgba(255,255,255,.05)":"none" }}>
            <span style={{ fontSize:10, fontWeight:r.sub?700:500, color:r.sub?"white":"rgba(255,255,255,.5)" }}>{r.label}</span>
            <span style={{ fontSize:10, fontWeight:700, color:r.positive?"#34d399":"#f87171" }}>{r.val}</span>
          </div>
        ))}
        <div style={{ marginTop:4, height:4, borderRadius:2, background:"rgba(255,255,255,.06)" }}>
          <div style={{ width:"73%", height:"100%", borderRadius:2, background:`linear-gradient(90deg,${color},#34d399)` }}/>
        </div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", textAlign:"right" }}>Profit Margin: 36.6%</div>
      </div>
    ),

    // Balance Sheet
    balance: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:6 }}>Balance Sheet</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div>
            <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Assets</div>
            {[["Cash & Bank","124,500"],["Receivables","85,000"],["Inventory","210,000"],["Fixed Assets","380,000"]].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                <span style={{ fontSize:9, color:"rgba(255,255,255,.5)" }}>{l}</span>
                <span style={{ fontSize:9, fontWeight:700, color:"#34d399" }}>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Liabilities & Equity</div>
            {[["Payables","92,000"],["Loans","180,000"],["Capital","427,500"],["Retained","100,000"]].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                <span style={{ fontSize:9, color:"rgba(255,255,255,.5)" }}>{l}</span>
                <span style={{ fontSize:9, fontWeight:700, color }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop:6, padding:"6px 8px", borderRadius:8, background:dim, border:`1px solid ${border}`, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:10, color:"rgba(255,255,255,.5)" }}>Total Assets = Total L+E</span>
          <span style={{ fontSize:10, fontWeight:800, color }}>799,500 ✓</span>
        </div>
      </div>
    ),

    // Tax
    tax: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Tax Summary — Q1 2025</div>
        {[
          { label:"Taxable Sales",      val:"$142,000", color:"rgba(255,255,255,.6)" },
          { label:"Sales Tax Collected",val:"$14,200",  color:"#f87171" },
          { label:"Input Tax",          val:"$7,100",   color:"#34d399" },
          { label:"Net Tax Payable",    val:"$7,100",   color },
        ].map(r=>(
          <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
            <span style={{ fontSize:10, color:"rgba(255,255,255,.55)" }}>{r.label}</span>
            <span style={{ fontSize:10, fontWeight:700, color:r.color }}>{r.val}</span>
          </div>
        ))}
        <div style={{ marginTop:4, padding:"8px 12px", borderRadius:10, background:dim, border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:10, color:"rgba(255,255,255,.5)" }}>Tax Authority Export</span>
          <div style={{ padding:"3px 10px", borderRadius:20, background:color+"30", color, fontSize:9, fontWeight:800 }}>READY ↓</div>
        </div>
      </div>
    ),

    // Bank Reconciliation
    reconciliation: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:2 }}>Bank Reconciliation</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
          <div style={{ padding:"8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)", textAlign:"center" }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginBottom:3 }}>Bank Balance</div>
            <div style={{ fontSize:13, fontWeight:800, color:"#34d399" }}>124,500</div>
          </div>
          <div style={{ padding:"8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)", textAlign:"center" }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginBottom:3 }}>Book Balance</div>
            <div style={{ fontSize:13, fontWeight:800, color }}>124,500</div>
          </div>
        </div>
        {[
          { desc:"HBL Payment Ref #4421", status:"matched",   c:"#34d399" },
          { desc:"Supplier MCB Transfer",  status:"matched",   c:"#34d399" },
          { desc:"Bank Charge 0.1%",       status:"unmatched", c:"#f87171" },
          { desc:"UBL Credit Ref #8823",   status:"matched",   c:"#34d399" },
        ].map(r=>(
          <div key={r.desc} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 8px", borderRadius:7, background:"rgba(255,255,255,.02)", border:`1px solid rgba(255,255,255,.04)` }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.55)" }}>{r.desc}</span>
            <span style={{ fontSize:8, fontWeight:800, color:r.c, padding:"2px 8px", borderRadius:10, background:`${r.c}18` }}>{r.status.toUpperCase()}</span>
          </div>
        ))}
        <div style={{ marginTop:2, fontSize:9, color:"rgba(255,255,255,.25)", textAlign:"right" }}>3 / 4 matched automatically</div>
      </div>
    ),

    // Cost Center
    costcenter: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Cost Center Report</div>
        {[
          { dept:"Sales",       revenue:"840,000", expense:"210,000", profit:"630,000", pct:75 },
          { dept:"Operations",  revenue:"0",       expense:"180,000", profit:"-180,000",pct:0  },
          { dept:"Marketing",   revenue:"120,000", expense:"95,000",  profit:"25,000",  pct:21 },
          { dept:"Admin",       revenue:"0",       expense:"65,000",  profit:"-65,000", pct:0  },
        ].map(r=>(
          <div key={r.dept} style={{ padding:"7px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontSize:10, fontWeight:700, color:"white" }}>{r.dept}</span>
              <span style={{ fontSize:10, fontWeight:700, color:r.pct>0?"#34d399":"#f87171" }}>{r.profit}</span>
            </div>
            <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,.06)" }}>
              <div style={{ width:`${r.pct}%`, height:"100%", borderRadius:2, background:r.pct>0?color:"#f87171" }}/>
            </div>
          </div>
        ))}
      </div>
    ),

    // Budget
    budget: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Budget vs Actual</div>
        {[
          { cat:"Marketing",   budget:80000,  actual:65000,  pct:81 },
          { cat:"Operations",  budget:150000, actual:142000, pct:95 },
          { cat:"Salaries",    budget:300000, actual:300000, pct:100},
          { cat:"Travel",      budget:30000,  actual:38000,  pct:127},
        ].map(r=>(
          <div key={r.cat} style={{ padding:"6px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,.6)" }}>{r.cat}</span>
              <span style={{ fontSize:9, fontWeight:800, color:r.pct>100?"#f87171":r.pct>90?"#fbbf24":"#34d399" }}>{r.pct}%</span>
            </div>
            <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,.06)", overflow:"hidden" }}>
              <div style={{ width:`${Math.min(r.pct,100)}%`, height:"100%", borderRadius:2, background:r.pct>100?"#f87171":r.pct>90?"#fbbf24":color }}/>
            </div>
          </div>
        ))}
      </div>
    ),

    // Journal
    journal: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Journal Voucher #JV-2025-089</div>
        <div style={{ padding:"8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)", marginBottom:4 }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginBottom:6 }}>Narration: Monthly depreciation — March 2025</div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, fontWeight:700, color:"rgba(255,255,255,.3)", borderBottom:"1px solid rgba(255,255,255,.06)", paddingBottom:4, marginBottom:4 }}>
            <span>Account</span><span>Debit</span><span>Credit</span>
          </div>
          {[
            { acc:"Depreciation Expense",  dr:"12,500", cr:"—" },
            { acc:"Accumulated Depr.",      dr:"—",      cr:"12,500" },
          ].map(r=>(
            <div key={r.acc} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0" }}>
              <span style={{ fontSize:9, color:"rgba(255,255,255,.6)" }}>{r.acc}</span>
              <span style={{ fontSize:9, fontWeight:700, color:"#f87171" }}>{r.dr}</span>
              <span style={{ fontSize:9, fontWeight:700, color:"#34d399" }}>{r.cr}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <div style={{ flex:1, padding:"5px 8px", borderRadius:7, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)", textAlign:"center" }}>
            <div style={{ fontSize:8, color:"rgba(255,255,255,.3)" }}>Total DR</div>
            <div style={{ fontSize:11, fontWeight:800, color:"#f87171" }}>12,500</div>
          </div>
          <div style={{ flex:1, padding:"5px 8px", borderRadius:7, background:dim, border:`1px solid ${border}`, textAlign:"center" }}>
            <div style={{ fontSize:8, color:"rgba(255,255,255,.3)" }}>Total CR</div>
            <div style={{ fontSize:11, fontWeight:800, color:"#34d399" }}>12,500</div>
          </div>
        </div>
        <div style={{ padding:"5px 8px", borderRadius:7, background:dim, border:`1px solid ${border}`, fontSize:9, color, fontWeight:700, textAlign:"center" }}>
          ✓ Balanced Entry — Posted by Admin · Mar 31, 2025
        </div>
      </div>
    ),

    // Invoice
    invoice: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:"white" }}>INVOICE</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.35)" }}>#INV-2025-0847</div>
          </div>
          <div style={{ padding:"3px 10px", borderRadius:20, background:"rgba(52,211,153,.15)", color:"#34d399", fontSize:8, fontWeight:800 }}>SENT</div>
        </div>
        <div style={{ height:1, background:"rgba(255,255,255,.06)" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"rgba(255,255,255,.3)" }}>
          <div>To: <span style={{ color:"white", fontWeight:600 }}>Mahmood Trading Co.</span></div>
          <div>Due: <span style={{ color:"#f87171", fontWeight:600 }}>Mar 31, 2025</span></div>
        </div>
        {[["Web Development Services","1","$4,250"],["Monthly Maintenance","3","$750"],["Domain & Hosting","1","$250"]].map(([desc,qty,amt])=>(
          <div key={desc} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.55)", flex:1 }}>{desc}</span>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.3)", width:20, textAlign:"center" }}>{qty}</span>
            <span style={{ fontSize:9, fontWeight:700, color:color, width:70, textAlign:"right" }}>{amt}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 8px", borderRadius:8, background:dim, border:`1px solid ${border}` }}>
          <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.7)" }}>Total</span>
          <span style={{ fontSize:11, fontWeight:800, color }}>$6,500</span>
        </div>
      </div>
    ),

    // Quotation
    quotation: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:11, fontWeight:700, color, opacity:.8 }}>Quotations Pipeline</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.3)" }}>12 active</div>
        </div>
        {[
          { client:"Al-Noor Traders",    val:"$21,000", status:"ACCEPTED", c:"#34d399" },
          { client:"Sunrise Corp",       val:"$9,250",  status:"SENT",     c:"#fbbf24" },
          { client:"Global Exports Ltd", val:"$44,500", status:"DRAFT",    c:"rgba(255,255,255,.3)" },
          { client:"Tech Solutions PK",  val:"$12,500", status:"SENT",     c:"#fbbf24" },
        ].map(r=>(
          <div key={r.client} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
            <div>
              <div style={{ fontSize:10, fontWeight:600, color:"white" }}>{r.client}</div>
              <div style={{ fontSize:9, fontWeight:700, color }}>{r.val}</div>
            </div>
            <span style={{ fontSize:8, fontWeight:800, color:r.c, padding:"2px 8px", borderRadius:10, background:`${r.c}18` }}>{r.status}</span>
          </div>
        ))}
      </div>
    ),

    // Challan
    challan: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:2 }}>Delivery Challan #DC-0234</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {[["Customer","Global Traders Ltd"],["Driver","Kamran Ali"],["Vehicle","TRK-1234"],["Date","Mar 17, 2025"]].map(([l,v])=>(
            <div key={l} style={{ padding:"5px 7px", borderRadius:7, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
              <div style={{ fontSize:8, color:"rgba(255,255,255,.3)" }}>{l}</div>
              <div style={{ fontSize:9, fontWeight:700, color:"white" }}>{v}</div>
            </div>
          ))}
        </div>
        {[["Premium Cotton Fabric","50 meters"],["Plain White Sheets","100 pcs"],["Packaging Material","1 box"]].map(([item,qty])=>(
          <div key={item} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.55)" }}>{item}</span>
            <span style={{ fontSize:9, fontWeight:700, color }}>{qty}</span>
          </div>
        ))}
        <div style={{ padding:"5px 10px", borderRadius:8, background:dim, border:`1px solid ${border}`, fontSize:9, color, fontWeight:700, textAlign:"center" }}>
          → Convert to Invoice
        </div>
      </div>
    ),

    // Returns
    returns: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Sales Return #SR-0089</div>
        <div style={{ padding:"8px", borderRadius:8, background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.15)", marginBottom:4 }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginBottom:4 }}>Against Invoice: INV-2025-0812</div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.6)" }}>Customer: Al-Noor Traders</span>
            <span style={{ fontSize:9, fontWeight:800, color:"#f87171" }}>Return</span>
          </div>
        </div>
        {[["Cotton Fabric (Damaged)","10 mtrs","$900"],["Wrong Size Delivered","5 pcs","$225"]].map(([item,qty,val])=>(
          <div key={item} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.55)", flex:1 }}>{item}</span>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.35)", width:44 }}>{qty}</span>
            <span style={{ fontSize:9, fontWeight:700, color:"#f87171" }}>{val}</span>
          </div>
        ))}
        <div style={{ padding:"6px 8px", borderRadius:8, background:dim, border:`1px solid ${border}`, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:9, color:"rgba(255,255,255,.5)" }}>Credit Note Issued</span>
          <span style={{ fontSize:9, fontWeight:800, color }}>$1,125 ✓</span>
        </div>
      </div>
    ),

    // Receivable
    receivable: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Accounts Receivable Aging</div>
        {[
          { range:"Current (0–30d)",  amt:"$21,000", c:"#34d399", w:"100%" },
          { range:"31–60 days",       amt:"$9,250",  c:"#fbbf24", w:"44%"  },
          { range:"61–90 days",       amt:"$4,750",  c:"#f87171", w:"23%"  },
          { range:"Over 90 days",     amt:"$2,100",  c:"#ef4444", w:"10%"  },
        ].map(r=>(
          <div key={r.range} style={{ padding:"6px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:9, color:"rgba(255,255,255,.5)" }}>{r.range}</span>
              <span style={{ fontSize:9, fontWeight:700, color:r.c }}>{r.amt}</span>
            </div>
            <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,.06)" }}>
              <div style={{ width:r.w, height:"100%", borderRadius:2, background:r.c }}/>
            </div>
          </div>
        ))}
        <div style={{ fontSize:9, fontWeight:800, color, textAlign:"right" }}>Total Outstanding: $37,100</div>
      </div>
    ),

    // Multi-currency
    multicurrency: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Multi-Currency Invoices</div>
        {[
          { client:"London Client",  curr:"GBP", amt:"£ 2,400",   pkr:"≈ $3,040" },
          { client:"Dubai Partner",  curr:"AED", amt:"AED 18,500", pkr:"≈ $5,040" },
          { client:"US Customer",    curr:"USD", amt:"$ 3,200",    pkr:"≈ $3,200" },
          { client:"KSA Distributor",curr:"SAR", amt:"SAR 12,000", pkr:"≈ $3,200" },
        ].map(r=>(
          <div key={r.client} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
            <div>
              <div style={{ fontSize:9, fontWeight:600, color:"white" }}>{r.client}</div>
              <div style={{ fontSize:8, color:"rgba(255,255,255,.35)" }}>{r.pkr}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:9, fontWeight:800, color }}>{r.amt}</div>
              <div style={{ fontSize:8, padding:"1px 6px", borderRadius:10, background:`${color}20`, color, fontWeight:700 }}>{r.curr}</div>
            </div>
          </div>
        ))}
      </div>
    ),

    // Purchase Order
    po: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:2 }}>Purchase Orders</div>
        {[
          { po:"PO-0421", supplier:"Textile Mills Ltd",  status:"PENDING",  val:"$14,000" },
          { po:"PO-0420", supplier:"Raw Materials Co",   status:"PARTIAL",  val:"$7,250"  },
          { po:"PO-0419", supplier:"Packaging Supply",   status:"RECEIVED", val:"$2,100"  },
          { po:"PO-0418", supplier:"Chemical Suppliers", status:"RECEIVED", val:"$4,775"  },
        ].map(r=>{
          const sc = r.status==="RECEIVED"?"#34d399":r.status==="PARTIAL"?"#fbbf24":"rgba(255,255,255,.4)";
          return (
            <div key={r.po} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
              <div>
                <div style={{ fontSize:9, fontWeight:700, color }}>{r.po}</div>
                <div style={{ fontSize:8, color:"rgba(255,255,255,.45)" }}>{r.supplier}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9, fontWeight:700, color:"white" }}>{r.val}</div>
                <span style={{ fontSize:7, fontWeight:800, color:sc, padding:"1px 6px", borderRadius:10, background:`${sc}18` }}>{r.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    ),

    // Purchase Invoice
    purchase: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Purchase Invoice #PI-0312</div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"rgba(255,255,255,.4)", marginBottom:4 }}>
          <span>Supplier: <span style={{ color:"white", fontWeight:600 }}>Textile Mills Ltd</span></span>
          <span>Ref PO: <span style={{ color, fontWeight:600 }}>PO-0421</span></span>
        </div>
        {[["Cotton Yarn 40/2","500 kg","$9,000"],["Polyester Fiber","200 kg","$3,000"],["Dyes & Chemicals","50 kg","$2,000"]].map(([item,qty,amt])=>(
          <div key={item} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.55)", flex:1 }}>{item}</span>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.3)", width:44 }}>{qty}</span>
            <span style={{ fontSize:9, fontWeight:700, color }}>{amt}</span>
          </div>
        ))}
        <div style={{ display:"flex", gap:6, marginTop:4 }}>
          <div style={{ flex:1, padding:"5px 8px", borderRadius:7, background:dim, border:`1px solid ${border}`, textAlign:"center" }}>
            <div style={{ fontSize:8, color:"rgba(255,255,255,.3)" }}>Total</div>
            <div style={{ fontSize:11, fontWeight:800, color }}>$14,000</div>
          </div>
          <div style={{ flex:1, padding:"5px 8px", borderRadius:7, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.2)", textAlign:"center" }}>
            <div style={{ fontSize:8, color:"rgba(255,255,255,.3)" }}>Stock Updated</div>
            <div style={{ fontSize:10, fontWeight:800, color:"#34d399" }}>✓ Auto</div>
          </div>
        </div>
      </div>
    ),

    // Payable
    payable: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Accounts Payable Aging</div>
        {[
          { supplier:"Textile Mills Ltd",  amt:"$14,000", due:"5 days",   c:"#f87171" },
          { supplier:"Raw Materials Co",   amt:"$7,250",  due:"12 days",  c:"#fbbf24" },
          { supplier:"Chemical Suppliers", amt:"$4,775",  due:"28 days",  c:"#34d399" },
          { supplier:"Packaging Supply",   amt:"$2,100",  due:"45 days",  c:"#34d399" },
        ].map(r=>(
          <div key={r.supplier} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
            <div>
              <div style={{ fontSize:9, fontWeight:600, color:"white" }}>{r.supplier}</div>
              <div style={{ fontSize:8, color:"rgba(255,255,255,.35)" }}>Due in {r.due}</div>
            </div>
            <span style={{ fontSize:9, fontWeight:700, color:r.c }}>{r.amt}</span>
          </div>
        ))}
        <div style={{ fontSize:9, fontWeight:800, color:"#f87171", textAlign:"right" }}>Total Payable: $28,125</div>
      </div>
    ),

    // Advance
    advance: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Advance Payments</div>
        {[
          { supplier:"Textile Mills",  advance:"$5,000", used:"$4,000", balance:"$1,000" },
          { supplier:"Chemical Co",    advance:"$2,500", used:"$0",     balance:"$2,500" },
          { supplier:"Raw Materials",  advance:"$3,750", used:"$3,750", balance:"$0" },
        ].map(r=>(
          <div key={r.supplier} style={{ padding:"8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"white", marginBottom:5 }}>{r.supplier}</div>
            <div style={{ display:"flex", gap:8 }}>
              {[["Advance",r.advance,"rgba(255,255,255,.4)"],["Used",r.used,"#fbbf24"],["Balance",r.balance,color]].map(([l,v,c])=>(
                <div key={String(l)} style={{ flex:1, textAlign:"center" }}>
                  <div style={{ fontSize:7, color:"rgba(255,255,255,.3)" }}>{l}</div>
                  <div style={{ fontSize:9, fontWeight:700, color:c as string }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),

    // Expense
    expense: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Expense Vouchers</div>
        {[
          { desc:"Office Rent — March",      cat:"Rent",    amt:"$4,250", status:"APPROVED" },
          { desc:"Team Lunch Meeting",        cat:"Food",    amt:"$425",   status:"APPROVED" },
          { desc:"NY to London Travel",       cat:"Travel",  amt:"$1,100", status:"PENDING"  },
          { desc:"Office Stationery",         cat:"Supplies",amt:"$210",   status:"APPROVED" },
        ].map(r=>{
          const sc = r.status==="APPROVED"?"#34d399":"#fbbf24";
          return (
            <div key={r.desc} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, fontWeight:600, color:"white" }}>{r.desc}</div>
                <div style={{ fontSize:8, color:"rgba(255,255,255,.35)" }}>{r.cat}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9, fontWeight:700, color }}>{r.amt}</div>
                <span style={{ fontSize:7, fontWeight:800, color:sc }}>{r.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    ),

    // Stock
    stock: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Live Inventory</div>
        {[
          { item:"Cotton Yarn 40/2",  stock:420,  min:100, unit:"kg",  alert:false },
          { item:"Polyester Fiber",   stock:85,   min:100, unit:"kg",  alert:true  },
          { item:"Dyes (Blue)",       stock:32,   min:50,  unit:"kg",  alert:true  },
          { item:"Packing Rolls",     stock:1200, min:200, unit:"pcs", alert:false },
        ].map(r=>(
          <div key={r.item} style={{ padding:"6px 8px", borderRadius:8, background:r.alert?"rgba(248,113,113,.06)":"rgba(255,255,255,.03)", border:`1px solid ${r.alert?"rgba(248,113,113,.2)":"rgba(255,255,255,.05)"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:9, fontWeight:600, color:"white" }}>{r.item}</span>
              <span style={{ fontSize:9, fontWeight:700, color:r.alert?"#f87171":color }}>{r.stock} {r.unit} {r.alert?"⚠":"✓"}</span>
            </div>
            <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,.06)" }}>
              <div style={{ width:`${Math.min((r.stock/r.min)*30,100)}%`, height:"100%", borderRadius:2, background:r.alert?"#f87171":color }}/>
            </div>
          </div>
        ))}
      </div>
    ),

    // Stock Report
    stockreport: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Stock Valuation Report</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:6 }}>
          {[["Total SKUs","284"],["Total Value","$ 210K"],["Locations","3"]].map(([l,v])=>(
            <div key={l} style={{ padding:"7px 8px", borderRadius:8, background:dim, border:`1px solid ${border}`, textAlign:"center" }}>
              <div style={{ fontSize:8, color:"rgba(255,255,255,.35)" }}>{l}</div>
              <div style={{ fontSize:11, fontWeight:800, color }}>{v}</div>
            </div>
          ))}
        </div>
        {[["Cotton Yarn 40/2","420 kg","$7,560"],["Polyester Fiber","85 kg","$1,275"],["Finished Fabric","1,200 m","$48,000"]].map(([item,qty,val])=>(
          <div key={item} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.55)", flex:1 }}>{item}</span>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.35)", width:50 }}>{qty}</span>
            <span style={{ fontSize:9, fontWeight:700, color }}>{val}</span>
          </div>
        ))}
      </div>
    ),

    // Multi-location
    multilocation: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Stock by Location</div>
        {[
          { loc:"Main Warehouse", items:284, val:"$140K" },
          { loc:"Branch A",      items:142, val:"$55K"  },
          { loc:"Dubai Godown",  items:56,  val:"$15K"  },
        ].map(r=>(
          <div key={r.loc} style={{ padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,.03)", border:`1px solid ${border}`, marginBottom:2 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:10, fontWeight:600, color:"white" }}>{r.loc}</span>
              <span style={{ fontSize:10, fontWeight:700, color }}>{r.val}</span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <span style={{ fontSize:9, color:"rgba(255,255,255,.4)" }}>{r.items} SKUs</span>
              <div style={{ flex:1, height:4, borderRadius:2, background:"rgba(255,255,255,.06)", alignSelf:"center" }}>
                <div style={{ width:`${(r.items/284)*100}%`, height:"100%", borderRadius:2, background:color }}/>
              </div>
            </div>
          </div>
        ))}
        <div style={{ padding:"5px 10px", borderRadius:7, background:dim, border:`1px solid ${border}`, fontSize:9, color, fontWeight:700, textAlign:"center" }}>
          Transfer Stock Between Locations →
        </div>
      </div>
    ),

    // Barcode
    barcode: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Barcode Management</div>
        <div style={{ padding:"12px", borderRadius:10, background:dim, border:`1px solid ${border}`, textAlign:"center", marginBottom:4 }}>
          <div style={{ fontFamily:"monospace", fontSize:24, letterSpacing:4, color:"white", marginBottom:4 }}>|||||||||||</div>
          <div style={{ fontFamily:"monospace", fontSize:10, color:"rgba(255,255,255,.5)", letterSpacing:2 }}>6901234567890</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", marginTop:4 }}>Cotton Yarn 40/2</div>
        </div>
        {[["Item Code","CY-40-2-WHT"],["Category","Raw Material"],["Unit","Kg"],["Rate","$18/kg"]].map(([l,v])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.4)" }}>{l}</span>
            <span style={{ fontSize:9, fontWeight:700, color }}>{v}</span>
          </div>
        ))}
      </div>
    ),

    // Employee
    employee: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Employee Profile</div>
        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:6 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${color}40,${color}20)`, border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color }}>MK</div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"white" }}>Muhammad Kamran</div>
            <div style={{ fontSize:9, color }}>Senior Accountant</div>
          </div>
        </div>
        {[["Department","Finance"],["Joining","Jan 1, 2022"],["ID No.","ID-42101-1234567"],["Salary","$4,250"],["Social Security","Enrolled ✓"]].map(([l,v])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.4)" }}>{l}</span>
            <span style={{ fontSize:9, fontWeight:600, color:"rgba(255,255,255,.7)" }}>{v}</span>
          </div>
        ))}
      </div>
    ),

    // Attendance
    attendance: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Attendance — March 2025</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:8 }}>
          {["M","T","W","T","F","S","S"].map((d,i)=>(
            <div key={i} style={{ textAlign:"center", fontSize:8, color:"rgba(255,255,255,.3)", fontWeight:700 }}>{d}</div>
          ))}
          {[...Array(21)].map((_,i)=>{
            const status = i===5||i===6||i===12||i===13||i===19||i===20 ? "off" : i===8 ? "leave" : "present";
            return (
              <div key={i} style={{ aspectRatio:"1", borderRadius:4, background:status==="present"?`${color}30`:status==="leave"?"rgba(251,191,36,.2)":"rgba(255,255,255,.04)", border:`1px solid ${status==="present"?border:status==="leave"?"rgba(251,191,36,.3)":"rgba(255,255,255,.06)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, fontWeight:700, color:status==="present"?color:status==="leave"?"#fbbf24":"rgba(255,255,255,.2)" }}>
                {i+1}
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["Present","19",color],["Leave","1","#fbbf24"],["Absent","0","#f87171"]].map(([l,v,c])=>(
            <div key={String(l)} style={{ flex:1, padding:"5px 6px", borderRadius:7, background:`${c}10`, border:`1px solid ${c}25`, textAlign:"center" }}>
              <div style={{ fontSize:11, fontWeight:800, color:c as string }}>{v}</div>
              <div style={{ fontSize:7, color:"rgba(255,255,255,.3)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    // Payroll
    payroll: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Payslip — March 2025</div>
        <div style={{ fontSize:10, fontWeight:600, color:"white", marginBottom:4 }}>Muhammad Kamran · Senior Accountant</div>
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>Earnings</div>
          {[["Basic Salary","$3,250"],["HRA","$650"],["Conveyance","$250"],["Medical","$100"]].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"2px 0" }}>
              <span style={{ fontSize:9, color:"rgba(255,255,255,.5)" }}>{l}</span>
              <span style={{ fontSize:9, fontWeight:600, color:"#34d399" }}>{v}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>Deductions</div>
          {[["Social Security","$16"],["Income Tax","$163"],["Advance","$0"]].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"2px 0" }}>
              <span style={{ fontSize:9, color:"rgba(255,255,255,.5)" }}>{l}</span>
              <span style={{ fontSize:9, fontWeight:600, color:"#f87171" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:"6px 8px", borderRadius:8, background:dim, border:`1px solid ${border}`, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.7)" }}>Net Salary</span>
          <span style={{ fontSize:11, fontWeight:800, color }}>$4,071</span>
        </div>
      </div>
    ),

    // Advance Salary
    advance_salary: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Advance Salary Tracker</div>
        {[
          { name:"Ali Hassan",     advance:"$1,250", deducted:"$500",   balance:"$750"  },
          { name:"Sara Ahmed",     advance:"$750",   deducted:"$750",   balance:"$0"   },
          { name:"Kamran Sheikh",  advance:"$1,500", deducted:"$0",     balance:"$1,500"},
        ].map(r=>(
          <div key={r.name} style={{ padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"white", marginBottom:5 }}>{r.name}</div>
            <div style={{ display:"flex", gap:8 }}>
              {[["Given",r.advance,"rgba(255,255,255,.5)"],["Deducted",r.deducted,"#fbbf24"],["Balance",r.balance,r.balance==="$0"?"#34d399":color]].map(([l,v,c])=>(
                <div key={String(l)} style={{ flex:1 }}>
                  <div style={{ fontSize:7, color:"rgba(255,255,255,.3)" }}>{l}</div>
                  <div style={{ fontSize:9, fontWeight:700, color:c as string }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),

    // Contacts
    contacts: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Contact Manager</div>
        {[
          { name:"Tariq Mahmood",   type:"CUSTOMER",  co:"Mahmood Trading",  bal:"$4,250 DR" },
          { name:"Textile Mills Ltd",type:"SUPPLIER",  co:"Manufacturer",    bal:"$14,000 CR" },
          { name:"Sunrise Corp",    type:"LEAD",      co:"Potential Client", bal:"—" },
          { name:"Ali Distribution",type:"CUSTOMER",  co:"Distributor",     bal:"$2,100 DR" },
        ].map(r=>{
          const tc = r.type==="CUSTOMER"?"#34d399":r.type==="SUPPLIER"?"#f87171":"#fbbf24";
          return (
            <div key={r.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)" }}>
              <div>
                <div style={{ fontSize:9, fontWeight:600, color:"white" }}>{r.name}</div>
                <div style={{ fontSize:8, color:"rgba(255,255,255,.35)" }}>{r.co}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <span style={{ fontSize:7, fontWeight:800, color:tc, padding:"1px 6px", borderRadius:10, background:`${tc}18` }}>{r.type}</span>
                <div style={{ fontSize:8, color:"rgba(255,255,255,.4)", marginTop:2 }}>{r.bal}</div>
              </div>
            </div>
          );
        })}
      </div>
    ),

    // Pipeline
    pipeline: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Sales Pipeline</div>
        {[
          { stage:"Lead",        count:8,  val:"$60K", c:"rgba(255,255,255,.4)", w:"100%" },
          { stage:"Prospect",    count:5,  val:"$42K", c:"#fbbf24",              w:"70%"  },
          { stage:"Negotiation", count:3,  val:"$31K", c:"#818cf8",              w:"52%"  },
          { stage:"Close",       count:2,  val:"$24K", c:"#38bdf8",              w:"40%"  },
          { stage:"Won",         count:12, val:"$140K", c:"#34d399",              w:"233%" },
        ].map(r=>(
          <div key={r.stage} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:70, fontSize:9, color:"rgba(255,255,255,.5)" }}>{r.stage}</div>
            <div style={{ flex:1, height:16, borderRadius:8, background:"rgba(255,255,255,.04)", overflow:"hidden", position:"relative" }}>
              <div style={{ width:r.w, maxWidth:"100%", height:"100%", borderRadius:8, background:`${r.c}25`, border:`1px solid ${r.c}40` }}/>
            </div>
            <div style={{ width:44, fontSize:9, fontWeight:700, color:r.c, textAlign:"right" }}>{r.count}</div>
          </div>
        ))}
        <div style={{ fontSize:9, fontWeight:800, color, textAlign:"right" }}>Total Pipeline: $157K</div>
      </div>
    ),

    // Interactions
    interactions: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Activity Feed</div>
        {[
          { type:"📞", act:"Called — Tariq Mahmood re: Q2 order",   time:"2h ago",   c:color },
          { type:"📧", act:"Email sent — proposal to Sunrise Corp",  time:"Yesterday",c:"#34d399" },
          { type:"🤝", act:"Meeting — Al-Noor Traders office visit", time:"Mar 15",   c:"#fbbf24" },
          { type:"⏰", act:"Follow-up due — Horizon Exports",        time:"Tomorrow", c:"#f87171" },
        ].map(r=>(
          <div key={r.act} style={{ display:"flex", gap:8, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <span style={{ fontSize:14, flexShrink:0 }}>{r.type}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.65)", lineHeight:1.4 }}>{r.act}</div>
              <div style={{ fontSize:8, color:r.c, marginTop:2 }}>{r.time}</div>
            </div>
          </div>
        ))}
      </div>
    ),

    // RBAC
    rbac: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Role Permissions</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:4, marginBottom:4 }}>
          {["Module","Admin","Acct.","Viewer"].map(h=>(
            <div key={h} style={{ fontSize:8, fontWeight:800, color:"rgba(255,255,255,.3)", textTransform:"uppercase", textAlign:"center" }}>{h}</div>
          ))}
        </div>
        {[
          { module:"Invoices",  admin:true,  acct:true,  viewer:false },
          { module:"Payroll",   admin:true,  acct:true,  viewer:false },
          { module:"Reports",   admin:true,  acct:true,  viewer:true  },
          { module:"Settings",  admin:true,  acct:false, viewer:false },
          { module:"Users",     admin:true,  acct:false, viewer:false },
        ].map(r=>(
          <div key={r.module} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:4, alignItems:"center" }}>
            <span style={{ fontSize:9, color:"rgba(255,255,255,.6)" }}>{r.module}</span>
            {[r.admin,r.acct,r.viewer].map((v,i)=>(
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ width:14, height:14, borderRadius:4, background:v?`${color}25`:"rgba(255,255,255,.04)", border:`1px solid ${v?border:"rgba(255,255,255,.08)"}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto", fontSize:8, color:v?color:"rgba(255,255,255,.2)" }}>
                  {v?"✓":"×"}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    ),

    // Audit
    audit: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Audit Trail</div>
        {[
          { user:"Admin",     action:"Approved Invoice INV-847",   time:"11:42 AM", ip:"192.168.1.1", type:"create" },
          { user:"Accountant",action:"Edited Expense Voucher EV-12",time:"11:18 AM", ip:"192.168.1.5", type:"edit"   },
          { user:"Admin",     action:"Created Employee: Ali Hassan", time:"10:55 AM", ip:"192.168.1.1", type:"create" },
          { user:"Viewer",    action:"Viewed P&L Report March 2025", time:"10:30 AM", ip:"10.0.0.12",   type:"view"   },
        ].map(r=>{
          const tc = r.type==="create"?"#34d399":r.type==="edit"?"#fbbf24":"rgba(255,255,255,.4)";
          return (
            <div key={r.action} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:tc, flexShrink:0, marginTop:3 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.7)" }}><span style={{ color:tc, fontWeight:700 }}>{r.user}</span> — {r.action}</div>
                <div style={{ fontSize:8, color:"rgba(255,255,255,.25)", marginTop:1 }}>{r.time} · {r.ip}</div>
              </div>
            </div>
          );
        })}
      </div>
    ),

    // Multi-company
    multicompany: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Company Switcher</div>
        {[
          { name:"Mahmood Trading Co.",     type:"Trading",    status:"ACTIVE",  color:"#818cf8" },
          { name:"Mahmood Exports Ltd.",    type:"Export",     status:"ACTIVE",  color:"#34d399" },
          { name:"MM Real Estate",          type:"Property",   status:"ACTIVE",  color:"#fbbf24" },
          { name:"Dubai Branch Office",     type:"Operations", status:"ACTIVE",  color:"#38bdf8" },
        ].map((r,i)=>(
          <div key={r.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:10, background:i===0?`${r.color}15`:"rgba(255,255,255,.03)", border:`1px solid ${i===0?r.color+"40":"rgba(255,255,255,.06)"}`, cursor:"pointer" }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`${r.color}25`, border:`1px solid ${r.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:r.color }}>
              {r.name[0]}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, fontWeight:600, color:i===0?"white":"rgba(255,255,255,.6)" }}>{r.name}</div>
              <div style={{ fontSize:8, color:"rgba(255,255,255,.3)" }}>{r.type}</div>
            </div>
            {i===0 && <div style={{ fontSize:8, fontWeight:800, color:r.color, padding:"2px 8px", borderRadius:10, background:`${r.color}20` }}>ACTIVE</div>}
          </div>
        ))}
      </div>
    ),

    // Multi-branch
    multibranch: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Branch Performance</div>
        {[
          { branch:"Head Office", revenue:"$90K",  expense:"$45K",  profit:"$45K",  pct:100 },
          { branch:"Branch A",    revenue:"$40K",  expense:"$20K",  profit:"$20K",  pct:44  },
          { branch:"Dubai Office",revenue:"$20K",  expense:"$15K",  profit:"$5K",   pct:11  },
        ].map(r=>(
          <div key={r.branch} style={{ padding:"8px 10px", borderRadius:10, background:"rgba(255,255,255,.03)", border:`1px solid ${border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:10, fontWeight:600, color:"white" }}>{r.branch}</span>
              <span style={{ fontSize:10, fontWeight:700, color }}>{r.profit}</span>
            </div>
            <div style={{ display:"flex", gap:12, fontSize:8, color:"rgba(255,255,255,.35)", marginBottom:4 }}>
              <span>Rev: {r.revenue}</span><span>Exp: {r.expense}</span>
            </div>
            <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,.06)" }}>
              <div style={{ width:`${r.pct}%`, height:"100%", borderRadius:2, background:color }}/>
            </div>
          </div>
        ))}
      </div>
    ),

    // API
    api: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>API Dashboard</div>
        <div style={{ padding:"8px 10px", borderRadius:8, background:"rgba(0,0,0,.3)", border:"1px solid rgba(255,255,255,.08)", fontFamily:"monospace" }}>
          <div style={{ fontSize:8, color:"rgba(52,211,153,.8)", marginBottom:4 }}>GET /api/v1/invoices</div>
          <div style={{ fontSize:8, color:"rgba(255,255,255,.4)" }}>Authorization: Bearer sk_live_xxxx</div>
          <div style={{ fontSize:8, color:"rgba(255,255,255,.25)", marginTop:4 }}>200 OK · 42ms</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {[["Endpoints","47"],["Calls Today","1,240"],["Success Rate","99.8%"],["Avg Latency","38ms"]].map(([l,v])=>(
            <div key={l} style={{ padding:"7px 8px", borderRadius:8, background:dim, border:`1px solid ${border}`, textAlign:"center" }}>
              <div style={{ fontSize:9, fontWeight:800, color }}>{v}</div>
              <div style={{ fontSize:7, color:"rgba(255,255,255,.35)" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", textAlign:"center" }}>Available on Enterprise Plan</div>
      </div>
    ),

    // Loans
    loans: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Loan Tracker</div>
        {[
          { name:"Ahmed Khan", amount:"250,000", paid:"75,000", bal:"175,000", emi:"12,500" },
          { name:"Sara Malik", amount:"100,000", paid:"40,000", bal:"60,000", emi:"5,000" },
          { name:"Usman Ali",  amount:"500,000", paid:"150,000",bal:"350,000", emi:"20,000" },
        ].map(r=>(
          <div key={r.name} style={{ padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.8)" }}>{r.name}</span>
              <span style={{ fontSize:9, color:"#f87171" }}>Bal: {r.bal}</span>
            </div>
            <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,.08)" }}>
              <div style={{ width:`${Math.round(parseInt(r.paid.replace(",",""))/parseInt(r.amount.replace(",",""))*100)}%`, height:"100%", borderRadius:2, background:color }}/>
            </div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginTop:3 }}>EMI/month: {r.emi}</div>
          </div>
        ))}
      </div>
    ),

    // Petty Cash
    pettycash: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:2 }}>Petty Cash — Main Office</div>
        <div style={{ padding:"10px 12px", borderRadius:10, background:`rgba(45,212,191,.1)`, border:`1px solid rgba(45,212,191,.2)`, textAlign:"center" }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.4)" }}>Current Balance</div>
          <div style={{ fontSize:22, fontWeight:800, color }}>$925</div>
        </div>
        {[
          { desc:"Tea & Snacks",  amt:"-350",  cat:"Food" },
          { desc:"Courier Fee",   amt:"-800",  cat:"Logistics" },
          { desc:"Office Supplies",amt:"-1,200",cat:"Supplies" },
          { desc:"Cash Deposit",  amt:"+5,000", cat:"Deposit" },
        ].map(r=>(
          <div key={r.desc} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 8px", borderRadius:6, background:"rgba(255,255,255,.03)" }}>
            <div>
              <span style={{ fontSize:10, color:"rgba(255,255,255,.7)" }}>{r.desc}</span>
              <span style={{ fontSize:8, color:"rgba(255,255,255,.3)", marginLeft:6 }}>{r.cat}</span>
            </div>
            <span style={{ fontSize:10, fontWeight:700, color:r.amt.startsWith("-")?"#f87171":"#34d399" }}>{r.amt}</span>
          </div>
        ))}
      </div>
    ),

    // Bulk payments
    bulkpay: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Bulk Payment Run — March 2025</div>
        {[
          { supplier:"Pak Steel Ltd",    amount:"24,250", status:"APPROVED" },
          { supplier:"Allied Chemicals",  amount:"11,500", status:"APPROVED" },
          { supplier:"Global Logistics",  amount:"4,775",  status:"PENDING" },
          { supplier:"Tech Solutions",    amount:"3,350",  status:"APPROVED" },
        ].map(r=>(
          <div key={r.supplier} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", borderRadius:8, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.06)" }}>
            <span style={{ fontSize:10, color:"rgba(255,255,255,.7)" }}>{r.supplier}</span>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:10, fontWeight:700, color }}>{r.amount}</span>
              <span style={{ fontSize:8, padding:"2px 6px", borderRadius:4, background:r.status==="APPROVED"?"rgba(52,211,153,.15)":"rgba(251,191,36,.15)", color:r.status==="APPROVED"?"#34d399":"#fbbf24" }}>{r.status}</span>
            </div>
          </div>
        ))}
        <div style={{ marginTop:4, display:"flex", justifyContent:"space-between", padding:"7px 8px", borderRadius:8, background:`${color}15`, border:`1px solid ${color}25` }}>
          <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.6)" }}>Total Batch</span>
          <span style={{ fontSize:11, fontWeight:800, color }}>$43,875</span>
        </div>
      </div>
    ),

    // Approvals
    approvals: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Pending Approvals</div>
        {[
          { doc:"SI-2025-0891", type:"Sales Invoice",    amount:"120,000", by:"Umar" },
          { doc:"EXP-2025-044", type:"Expense Voucher",  amount:"18,500",  by:"Sara" },
          { doc:"PO-2025-0213", type:"Purchase Order",   amount:"340,000", by:"Ali" },
        ].map(r=>(
          <div key={r.doc} style={{ padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:10, fontWeight:600, color }}>{r.doc}</span>
              <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.8)" }}>$ {r.amount}</span>
            </div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginTop:2 }}>{r.type} · by {r.by}</div>
            <div style={{ display:"flex", gap:6, marginTop:6 }}>
              <div style={{ flex:1, padding:"3px 0", borderRadius:5, background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.25)", textAlign:"center", fontSize:9, color:"#34d399", fontWeight:700 }}>Approve</div>
              <div style={{ flex:1, padding:"3px 0", borderRadius:5, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.2)", textAlign:"center", fontSize:9, color:"#f87171", fontWeight:700 }}>Reject</div>
            </div>
          </div>
        ))}
      </div>
    ),

    // Period Lock
    periodlock: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Financial Period Control</div>
        {[
          { period:"Jan 2025", locked:true  },
          { period:"Feb 2025", locked:true  },
          { period:"Mar 2025", locked:false },
          { period:"Apr 2025", locked:false },
        ].map(r=>(
          <div key={r.period} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,.04)", border:`1px solid ${r.locked?"rgba(248,113,113,.2)":"rgba(52,211,153,.2)"}` }}>
            <span style={{ fontSize:10, color:"rgba(255,255,255,.7)" }}>{r.period}</span>
            <span style={{ fontSize:9, padding:"3px 8px", borderRadius:4, background:r.locked?"rgba(248,113,113,.1)":"rgba(52,211,153,.1)", color:r.locked?"#f87171":"#34d399", fontWeight:700 }}>
              {r.locked?"🔒 Locked":"🔓 Open"}
            </span>
          </div>
        ))}
        <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", textAlign:"center" }}>Admin override required to unlock</div>
      </div>
    ),

    // WhatsApp
    whatsapp: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>Notifications Sent</div>
        {[
          { to:"Ahmed Khan",    channel:"WhatsApp", msg:"Invoice INV-0891 of $2,250 due in 3 days", time:"10:22 AM", sent:true },
          { to:"Sara Textile",  channel:"SMS",      msg:"Payment reminder: $6,000 overdue by 7 days", time:"10:23 AM", sent:true },
          { to:"Ali Brothers",  channel:"WhatsApp", msg:"Your invoice INV-0888 has been approved", time:"10:24 AM", sent:true },
        ].map(r=>(
          <div key={r.to} style={{ padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.8)" }}>{r.to}</span>
              <span style={{ fontSize:8, padding:"2px 5px", borderRadius:3, background:r.channel==="WhatsApp"?"rgba(52,211,153,.15)":"rgba(56,189,248,.15)", color:r.channel==="WhatsApp"?"#34d399":"#38bdf8" }}>{r.channel}</span>
            </div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.4)" }}>{r.msg}</div>
          </div>
        ))}
      </div>
    ),

    // AI Assistant
    ai: (
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color, opacity:.8, marginBottom:4 }}>AI Assistant</div>
        <div style={{ padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", marginBottom:4 }}>You asked:</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.8)" }}>Which customer has the highest overdue balance this month?</div>
        </div>
        <div style={{ padding:"8px 10px", borderRadius:8, background:`${color}12`, border:`1px solid ${color}25` }}>
          <div style={{ fontSize:9, color, marginBottom:4, fontWeight:700 }}>AI Response:</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.7)", lineHeight:1.5 }}>
            <strong style={{ color }}>Ahmed Brothers</strong> has the highest overdue: $12,400 (61 days). Suggested action: send WhatsApp reminder or escalate to sales team.
          </div>
        </div>
        <div style={{ display:"flex", gap:4, padding:"6px 8px", borderRadius:8, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)" }}>
          <input style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:10, color:"rgba(255,255,255,.5)" }} defaultValue="Ask anything about your finances..." readOnly />
          <div style={{ fontSize:14, color }}>↑</div>
        </div>
      </div>
    ),
  };

  return (
    <div style={{
      width:"100%", aspectRatio:"16/9",
      background:"linear-gradient(135deg,rgba(8,12,30,1) 0%,rgba(15,20,50,1) 100%)",
      borderRadius:14, overflow:"hidden", position:"relative", display:"flex", flexDirection:"column",
    }}>
      {/* Fake top bar */}
      <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        {["#f87171","#fbbf24","#34d399"].map(c=>(
          <div key={c} style={{ width:9, height:9, borderRadius:"50%", background:c, opacity:.6 }}/>
        ))}
        <div style={{ flex:1, height:7, borderRadius:4, background:"rgba(255,255,255,.05)", marginLeft:8 }}/>
      </div>
      {/* Content */}
      <div style={{ flex:1, overflow:"hidden" }}>
        {screens[type] || screens.ledger}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HOOKS & COMPONENTS
══════════════════════════════════════════════════════════ */
function useVisible(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible] as const;
}

function FeatureRow({ feature, globalIndex, color, glow, border, dim }: {
  feature: typeof CATEGORIES[0]["items"][0]; globalIndex: number;
  color: string; glow: string; border: string; dim: string;
}) {
  const [ref, visible] = useVisible(0.1);
  const isReversed = globalIndex % 2 === 1;

  return (
    <div ref={ref} style={{
      display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"center",
      direction: isReversed ? "rtl" : "ltr",
      opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(28px)",
      transition:"all .65s cubic-bezier(.22,1,.36,1)",
    }}>
      {/* Copy */}
      <div style={{ direction:"ltr" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"4px 12px", borderRadius:20, background:dim, border:`1px solid ${border}`, fontSize:10, fontWeight:700, color, letterSpacing:".1em", textTransform:"uppercase" as const, marginBottom:16 }}>
          <span style={{ width:5, height:5, borderRadius:"50%", background:color }}/>
          Feature {String(globalIndex+1).padStart(2,"0")}
        </div>
        <h3 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(20px,2.5vw,28px)", fontWeight:700, color:"white", letterSpacing:"-.5px", lineHeight:1.25, marginBottom:12 }}>
          {feature.name}
        </h3>
        <p style={{ fontSize:14.5, color:"rgba(255,255,255,.45)", lineHeight:1.8, marginBottom:22 }}>
          {feature.description}
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          {feature.highlights.map(h=>(
            <div key={h} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:dim, border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="9" height="9" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5.5L4.5 9 11 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize:13.5, color:"rgba(255,255,255,.68)", fontWeight:500 }}>{h}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mock screen */}
      <div style={{ direction:"ltr" }}>
        <div style={{ borderRadius:18, padding:3, background:`linear-gradient(135deg,${color}30,rgba(255,255,255,.04))`, boxShadow:`0 20px 56px rgba(0,0,0,.4), 0 0 0 1px ${border}` }}>
          <div style={{ borderRadius:16, overflow:"hidden", background:"#080c1e" }}>
            <MockScreen type={(feature as any).mockType || "ledger"} color={color}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategorySection({ cat, startIdx }: { cat: typeof CATEGORIES[0]; startIdx: number }) {
  const [headerRef, headerVisible] = useVisible(0.15);
  return (
    <section id={cat.id} style={{ padding:"90px 24px", borderTop:"1px solid rgba(255,255,255,.05)", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle,${cat.glow},transparent 65%)`, top:-80, right:-80, pointerEvents:"none" }}/>
      <div style={{ maxWidth:1160, margin:"0 auto", position:"relative" }}>
        {/* Header */}
        <div ref={headerRef} style={{ display:"flex", alignItems:"center", gap:16, marginBottom:64, opacity:headerVisible?1:0, transform:headerVisible?"translateX(0)":"translateX(-20px)", transition:"all .55s ease" }}>
          <div style={{ width:52, height:52, borderRadius:15, flexShrink:0, background:cat.dim, border:`1.5px solid ${cat.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, boxShadow:`0 4px 20px ${cat.glow}` }}>
            {cat.emoji}
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <div style={{ width:24, height:3, borderRadius:2, background:cat.color }}/>
              <span style={{ fontSize:10.5, fontWeight:700, color:cat.color, letterSpacing:".1em", textTransform:"uppercase" as const }}>{cat.items.length} Features</span>
            </div>
            <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(22px,3vw,34px)", fontWeight:700, color:"white", letterSpacing:"-.6px", lineHeight:1.15, margin:0 }}>
              {cat.label}
            </h2>
          </div>
        </div>
        {/* Feature rows */}
        <div style={{ display:"flex", flexDirection:"column", gap:80 }}>
          {cat.items.map((item,i)=>(
            <FeatureRow key={item.name} feature={item} globalIndex={startIdx+i} color={cat.color} glow={cat.glow} border={cat.border} dim={cat.dim}/>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function FeaturesPage() {
  const [heroRef, heroVisible] = useVisible(0.2);
  const [ctaRef, ctaVisible]   = useVisible(0.15);
  const [activeTab, setActiveTab] = useState("accounting");

  const startIndices = CATEGORIES.reduce<number[]>((acc,cat,i) => {
    acc.push(i===0?0:acc[i-1]+CATEGORIES[i-1].items.length);
    return acc;
  }, []);

  const totalFeatures = CATEGORIES.reduce((s,c)=>s+c.items.length, 0);

  const scrollTo = (id: string) => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  return (
    <>
      <Head>
        <title>Features — FinovaOS</title>
        <meta name="description" content={`${totalFeatures} features for accounting, inventory, HR, CRM and more — built for modern SMEs.`}/>
      </Head>

      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#080c1e 0%,#0c0f2e 25%,#080c1e 100%)", color:"white", fontFamily:"'Outfit','DM Sans',sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:ital,wght@0,700;1,700&display=swap');
          *,*::before,*::after{box-sizing:border-box;}
          @keyframes orbDrift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-16px) scale(1.05)}}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
          @keyframes floatBadge{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
          @keyframes rotateSlow{to{transform:rotate(360deg)}}
          .feat-tab{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:24px;cursor:pointer;font-size:13px;font-weight:600;font-family:'Outfit',sans-serif;border:1.5px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:rgba(255,255,255,.45);transition:all .25s;white-space:nowrap;}
          .feat-tab:hover{color:rgba(255,255,255,.8);border-color:rgba(255,255,255,.2);}
          @media(max-width:900px){.feat-row{grid-template-columns:1fr!important;direction:ltr!important;}}
        `}</style>

        {/* ── HERO ── */}
        <section style={{ padding:"100px 24px 60px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.05) 1px,transparent 1px)", backgroundSize:"48px 48px" }}/>
            <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.13),transparent 65%)", top:-130, right:-100, animation:"orbDrift 14s ease-in-out infinite" }}/>
            <div style={{ position:"absolute", width:380, height:380, borderRadius:"50%", background:"radial-gradient(circle,rgba(52,211,153,.07),transparent 65%)", bottom:0, left:80, animation:"orbDrift 19s ease-in-out infinite reverse" }}/>
            <div style={{ position:"absolute", width:680, height:680, borderRadius:"50%", border:"1px solid rgba(99,102,241,.05)", top:"50%", left:"50%", transform:"translate(-50%,-50%)", animation:"rotateSlow 40s linear infinite", pointerEvents:"none" }}>
              <div style={{ position:"absolute", top:-4, left:"50%", width:8, height:8, borderRadius:"50%", background:"#6366f1", marginLeft:-4, boxShadow:"0 0 14px rgba(99,102,241,.9)" }}/>
            </div>
            <div style={{ position:"absolute", top:0, left:"12%", right:"12%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }}/>
          </div>

          <div ref={heroRef} style={{ maxWidth:860, margin:"0 auto", textAlign:"center", position:"relative" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:24, background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.28)", fontSize:11, fontWeight:700, color:"#a5b4fc", letterSpacing:".09em", textTransform:"uppercase" as const, marginBottom:24, opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)", transition:"all .5s ease" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#6366f1", animation:"blink 2s ease infinite" }}/>
              {totalFeatures} Features & Counting
            </div>

            <h1 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(36px,5.5vw,62px)", fontWeight:700, color:"white", letterSpacing:"-2px", lineHeight:1.08, marginBottom:18, opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(20px)", transition:"all .6s ease .08s" }}>
              All the tools you need
              <span style={{ display:"block", fontStyle:"italic", background:"linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                to run your business.
              </span>
            </h1>

            <p style={{ fontSize:17, color:"rgba(255,255,255,.45)", lineHeight:1.8, maxWidth:580, margin:"0 auto 44px", opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)", transition:"all .6s ease .16s" }}>
              From double-entry accounting to real-time inventory — every feature purpose-built for the way modern SMEs actually operate.
            </p>

            <div style={{ display:"flex", justifyContent:"center", gap:14, flexWrap:"wrap", marginBottom:52, opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(14px)", transition:"all .6s ease .22s" }}>
              <Link href="/signup" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"13px 28px", borderRadius:13, background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"white", fontWeight:700, fontSize:14, textDecoration:"none", fontFamily:"inherit", boxShadow:"0 6px 24px rgba(99,102,241,.4)", transition:"all .25s" }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 32px rgba(99,102,241,.55)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(99,102,241,.4)"; }}>
                Get Started →
              </Link>
              <Link href="/pricing" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"12px 24px", borderRadius:13, border:"1.5px solid rgba(255,255,255,.12)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.65)", fontWeight:600, fontSize:14, textDecoration:"none", fontFamily:"inherit", transition:"all .25s" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.28)"; e.currentTarget.style.color="white"; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.12)"; e.currentTarget.style.color="rgba(255,255,255,.65)"; }}>
                View Pricing
              </Link>
            </div>

            {/* Category tabs */}
            <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:8, opacity:heroVisible?1:0, transition:"opacity .6s ease .3s" }}>
              {CATEGORIES.map(cat=>(
                <button key={cat.id} onClick={()=>scrollTo(cat.id)}
                  className="feat-tab"
                  style={{ borderColor:activeTab===cat.id?cat.border:undefined, background:activeTab===cat.id?cat.dim:undefined, color:activeTab===cat.id?cat.color:undefined }}>
                  <span>{cat.emoji}</span>{cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.05)", background:"rgba(255,255,255,.02)" }}>
          <div style={{ maxWidth:1000, margin:"0 auto", padding:"28px 24px", display:"flex", justifyContent:"center", flexWrap:"wrap", gap:0 }}>
            {[
              { val:`${totalFeatures}+`, label:"Total Features",     color:"#818cf8" },
              { val:"7",                 label:"Core Modules",        color:"#34d399" },
              { val:"12,000+",           label:"Businesses Using It", color:"#fbbf24" },
              { val:"10 min",            label:"To Get Started",      color:"#f87171" },
            ].map(({ val, label, color },i)=>(
              <div key={label} style={{ padding:"0 36px", textAlign:"center", borderRight:i<3?"1px solid rgba(255,255,255,.07)":"none" }}>
                <div style={{ fontFamily:"'Lora',serif", fontSize:26, fontWeight:700, color, letterSpacing:"-.5px" }}>{val}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.3)", fontWeight:500, marginTop:3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CATEGORY SECTIONS ── */}
        {CATEGORIES.map((cat,i)=>(
          <CategorySection key={cat.id} cat={cat} startIdx={startIndices[i]}/>
        ))}

        {/* ── FINAL CTA ── */}
        <section style={{ padding:"80px 24px", maxWidth:1100, margin:"0 auto" }}>
          <div ref={ctaRef} style={{ borderRadius:28, overflow:"hidden", position:"relative", background:"linear-gradient(135deg,#2d2b6b 0%,#1e1b55 35%,#1a1848 70%,#231548 100%)", padding:"72px 48px", textAlign:"center", boxShadow:"0 32px 80px rgba(99,102,241,.35)", border:"1px solid rgba(165,180,252,.2)", opacity:ctaVisible?1:0, transform:ctaVisible?"translateY(0)":"translateY(20px)", transition:"all .7s ease" }}>
            <div style={{ position:"absolute", width:520, height:520, borderRadius:"50%", border:"1px solid rgba(165,180,252,.07)", top:"50%", left:"50%", transform:"translate(-50%,-50%)", animation:"rotateSlow 30s linear infinite", pointerEvents:"none" }}>
              <div style={{ position:"absolute", top:-4, left:"50%", width:8, height:8, borderRadius:"50%", background:"#818cf8", marginLeft:-4, boxShadow:"0 0 12px rgba(129,140,248,.8)" }}/>
            </div>
            <div style={{ position:"absolute", width:380, height:380, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.12),transparent 70%)", top:-80, right:-60, pointerEvents:"none" }}/>
            <div style={{ position:"relative" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 16px", borderRadius:24, background:"rgba(251,191,36,.12)", border:"1.5px solid rgba(251,191,36,.3)", fontSize:11, fontWeight:800, color:"#fbbf24", letterSpacing:".09em", textTransform:"uppercase" as const, marginBottom:22, animation:"floatBadge 3s ease-in-out infinite" }}>
                🔥 14-Day Free Trial — No Credit Card
              </div>
              <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(28px,4.5vw,50px)", fontWeight:700, color:"white", letterSpacing:"-1.2px", lineHeight:1.12, marginBottom:14 }}>
                Ready to transform
                <span style={{ display:"block", fontStyle:"italic", background:"linear-gradient(135deg,#a5b4fc,#818cf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  your business?
                </span>
              </h2>
              <p style={{ fontSize:16, color:"rgba(255,255,255,.5)", marginBottom:40, maxWidth:460, margin:"0 auto 40px", lineHeight:1.8 }}>
                Join 12,000+ SMEs who trust FinovaOS for their daily operations.
              </p>
              <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
                <Link href="/pricing" style={{ padding:"14px 36px", borderRadius:14, background:"linear-gradient(135deg,#fbbf24,#f59e0b)", color:"#0f172a", fontWeight:800, fontSize:15, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8, boxShadow:"0 6px 24px rgba(251,191,36,.4)", transition:"all .25s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 32px rgba(251,191,36,.55)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(251,191,36,.4)"; }}>
                  Get Started Now →
                </Link>
                <Link href="/contact" style={{ padding:"13px 32px", borderRadius:14, border:"1.5px solid rgba(255,255,255,.2)", background:"rgba(255,255,255,.06)", backdropFilter:"blur(8px)", color:"rgba(255,255,255,.75)", fontWeight:700, fontSize:15, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8, transition:"all .25s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.4)"; e.currentTarget.style.color="white"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,.2)"; e.currentTarget.style.color="rgba(255,255,255,.75)"; }}>
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
