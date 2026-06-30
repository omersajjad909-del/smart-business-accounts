"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface BizType {
  id: string; label: string; icon: string;
  phase: 1|2|3|4; category: string; description: string; isLive: boolean;
}

/* ─── Industry-specific content ─── */

const PAIN_POINTS: Record<string, { icon:string; text:string }[]> = {
  travel: [
    { icon:"📋", text:"Passenger details, PNRs, and visa statuses tracked in different WhatsApp chats and sheets" },
    { icon:"💸", text:"Service fees collected without proper invoices — no balance visibility per client" },
    { icon:"⏰", text:"Visa deadlines and follow-ups missed because there's no centralized case management" },
  ],
  Commerce: [
    { icon:"📋", text:"Invoices created in spreadsheets — no auto-totals, no payment tracking, no reminders" },
    { icon:"📦", text:"Stock goes negative because purchases and sales aren't linked in real time" },
    { icon:"💸", text:"Collections delayed because you don't know exactly who owes what and since when" },
  ],
  Services: [
    { icon:"🕐", text:"Hours billed manually — underbilling clients without realizing it" },
    { icon:"💸", text:"Project expenses not tracked, so actual profit on each project is unknown" },
    { icon:"📋", text:"Recurring client invoices created manually every month — time-consuming and error-prone" },
  ],
  Healthcare: [
    { icon:"🏥", text:"Patient bills generated on paper — errors, duplicates, and missing charges are common" },
    { icon:"💊", text:"Pharmacy stock-outs because no alert system tracks expiry or reorder levels" },
    { icon:"📋", text:"Insurance claim tracking done in registers — settlements delayed for months" },
  ],
  Education: [
    { icon:"💰", text:"Fee defaulters not identified on time — collection rates drop month after month" },
    { icon:"👨‍🏫", text:"Payroll calculations done in Excel — errors in deductions and advances every month" },
    { icon:"📊", text:"No consolidated financial view across campuses — reporting takes weeks" },
  ],
  Hospitality: [
    { icon:"🍽️", text:"Orders written on paper — kitchen confusion, missed items, angry customers" },
    { icon:"💸", text:"End-of-day cash shortages because payment types aren't reconciled at shift close" },
    { icon:"📦", text:"Food wastage high because ingredient stock and recipe consumption aren't tracked" },
  ],
  Production: [
    { icon:"⚙️", text:"BOM not tracked — raw material consumption is guesswork, margins are unclear" },
    { icon:"📦", text:"Finished goods inventory mismatched because production and dispatch aren't linked" },
    { icon:"💰", text:"Cost per unit calculated at month end — too late to fix pricing errors" },
  ],
  Logistics: [
    { icon:"🚛", text:"Trip expenses logged in notebooks — fuel, toll, and driver costs not consolidated" },
    { icon:"💸", text:"COD collections not reconciled — cash goes missing between driver and office" },
    { icon:"📊", text:"No visibility into which routes or vehicles are profitable and which are losing money" },
  ],
  default: [
    { icon:"📋", text:"Financial records scattered across spreadsheets, emails, and notebooks" },
    { icon:"💸", text:"Outstanding payments chased manually without clear visibility into aging" },
    { icon:"📊", text:"Month-end reporting takes days — numbers never fully reconcile" },
  ],
};

const WORKFLOWS: Record<string, string[]> = {
  travel:      ["Client Enquiry", "Quotation", "Booking & Docs", "Invoice", "Payment Collection", "Case Closed"],
  Commerce:    ["Purchase Order", "GRN (Goods Receipt)", "Inventory Update", "Sales Invoice", "Payment Collection", "Bank Reconciliation"],
  Services:    ["Client Brief", "Quotation / Agreement", "Work Delivery", "Invoice", "Payment Receipt", "Profit Review"],
  Healthcare:  ["Patient Registration", "Consultation", "Prescription / Lab", "Itemized Bill", "Payment / Insurance", "Medical Records"],
  Education:   ["Enrollment", "Fee Schedule Setup", "Monthly Collection", "Defaulter Alerts", "Payroll Processing", "Financial Reports"],
  Hospitality: ["Table / Order Entry", "Kitchen Display", "Bill Generation", "Payment Collection", "Daily Close", "Stock Update"],
  Production:  ["Raw Material PO", "GRN & Stock In", "Production Order", "BOM Consumption", "Finished Goods", "Customer Invoice"],
  Logistics:   ["Trip Assignment", "Fuel & Expense Log", "Delivery Confirmation", "COD Collection", "Driver Settlement", "Route P&L"],
  default:     ["Setup Chart of Accounts", "Record Transactions", "Reconcile Bank", "Generate Reports", "Close Period"],
};

const STATS: Record<string, { val:string; label:string }[]> = {
  travel:      [{ val:"100%", label:"Passenger file visibility" }, { val:"Zero", label:"Missed visa follow-ups" }, { val:"3×", label:"Faster invoicing" }],
  Commerce:    [{ val:"87%", label:"Less reconciliation time" }, { val:"3×", label:"Faster month-end close" }, { val:"Zero", label:"Data entry errors" }],
  Services:    [{ val:"65%", label:"Faster invoice collection" }, { val:"Zero", label:"Missed billable expenses" }, { val:"1 day", label:"Monthly close (was 2 weeks)" }],
  Healthcare:  [{ val:"95%", label:"Billing accuracy" }, { val:"60%", label:"Less pharmacy stock wastage" }, { val:"Instant", label:"Patient ledger lookup" }],
  Education:   [{ val:"90%", label:"Fee collection on time" }, { val:"Zero", label:"Payroll calculation errors" }, { val:"1 hr", label:"Monthly payroll closure" }],
  Hospitality: [{ val:"30%", label:"Less food wastage" }, { val:"2×", label:"Faster table turnover" }, { val:"Zero", label:"Cash shortage at close" }],
  Production:  [{ val:"18%", label:"Average margin improvement" }, { val:"40%", label:"Less wastage via tracking" }, { val:"Daily", label:"Cost per unit visibility" }],
  Logistics:   [{ val:"Per vehicle", label:"Profit & loss visibility" }, { val:"100%", label:"COD reconciliation rate" }, { val:"2 hrs", label:"Daily route settlement" }],
  default:     [{ val:"80%", label:"Less manual data entry" }, { val:"3×", label:"Faster reporting" }, { val:"100%", label:"Audit trail coverage" }],
};

const FEATURES: Record<string, { icon:string; title:string; desc:string }[]> = {
  travel: [
    { icon:"🎫", title:"Airline Ticket Desk",       desc:"Track booking refs, airlines, routes, travel dates, and PNRs per passenger file." },
    { icon:"🛂", title:"Visa Processing Cases",      desc:"Manage document check, submission, approval, and rejection per applicant." },
    { icon:"📄", title:"Travel Quotations",          desc:"Prepare ticket and visa quotes before issuing services to the client." },
    { icon:"💳", title:"Service Billing",            desc:"Convert confirmed work into invoices and collect fees with clear balances." },
    { icon:"👥", title:"Passenger File History",     desc:"Keep each client's travel file, route, passport reference, and case status together." },
    { icon:"📊", title:"Travel Revenue Reports",     desc:"Total ticket value, active visa cases, and pending files at a glance." },
    { icon:"🔁", title:"Recurring Client Billing",   desc:"Auto-generate invoices for regular corporate travel accounts on schedule." },
    { icon:"🏦", title:"Foreign Currency Support",   desc:"Issue quotes and invoices in multiple currencies with live FX conversion." },
  ],
  Commerce: [
    { icon:"🧾", title:"Sales & Purchase Invoicing", desc:"Professional invoices, POs, and delivery challans — PDF export and WhatsApp sharing." },
    { icon:"📦", title:"Inventory Management",       desc:"Real-time stock tracking, GRN, barcode scanning, and reorder level alerts." },
    { icon:"📒", title:"Party Ledger & Ageing",      desc:"Full customer/supplier ledger with ageing analysis and payment history." },
    { icon:"🏦", title:"Bank Reconciliation",        desc:"Import bank statements and reconcile with books in minutes, not hours." },
    { icon:"🏪", title:"Multi-Branch Operations",    desc:"Manage warehouses and branches from one dashboard with consolidated P&L." },
    { icon:"📊", title:"Profit by Product / Party",  desc:"Know which SKUs and suppliers actually make you money — not just revenue." },
    { icon:"🔁", title:"Recurring Transactions",     desc:"Auto-post monthly rent, utility bills, and salary entries on schedule." },
    { icon:"💱", title:"Multi-Currency",             desc:"Invoice and purchase in USD, EUR, AED — auto-convert at live rates." },
  ],
  Services: [
    { icon:"🧾", title:"Project & Retainer Billing", desc:"Invoice clients by project, milestone, or monthly retainer — flexible billing." },
    { icon:"💰", title:"Expense Tracking",           desc:"Log and categorize every business expense with receipt attachments." },
    { icon:"👥", title:"CRM & Client Management",    desc:"Contacts, follow-ups, and communication history in one place." },
    { icon:"👨‍💼", title:"HR & Payroll",              desc:"Staff attendance, salary processing, advances, and leave management." },
    { icon:"📊", title:"Project Profitability",      desc:"Revenue vs cost per project — know your real margin before the final invoice." },
    { icon:"🔄", title:"Recurring Invoices",         desc:"Auto-generate and send invoices for retainer clients on a set schedule." },
    { icon:"📒", title:"Client Ledger & Ageing",     desc:"Full receivables tracking with ageing buckets — know who owes what since when." },
    { icon:"🧮", title:"Quotation to Invoice",       desc:"Convert approved quotations to invoices with one click — no re-entry." },
  ],
  Healthcare: [
    { icon:"🏥", title:"Patient Billing",            desc:"Itemized bills for consultations, procedures, lab tests, and medicines." },
    { icon:"💊", title:"Pharmacy Inventory",         desc:"Drug stock by batch, expiry, and usage — auto-reorder alerts." },
    { icon:"📋", title:"Doctor & OPD Management",    desc:"Appointment scheduling, OPD fees, and doctor shift management." },
    { icon:"🏦", title:"Insurance & TPA Claims",     desc:"Track insurance payments, TPAs, and claim approval statuses." },
    { icon:"🔬", title:"Lab & Diagnostic Records",   desc:"Attach lab results to patient files — no lost reports." },
    { icon:"👨‍💼", title:"Staff Payroll",              desc:"Doctor and nursing staff salaries, advances, and deductions." },
    { icon:"📊", title:"Department Revenue Reports", desc:"Daily OPD collections, department-wise income, and cost analysis." },
    { icon:"🏢", title:"Multi-Branch / Chain",       desc:"Manage multiple clinics from one centralized dashboard." },
  ],
  Education: [
    { icon:"💰", title:"Fee Collection & Receipts",  desc:"Tuition, transport, and activity fees with instant printed receipts." },
    { icon:"📒", title:"Student Fee Ledger",         desc:"Per-student balance tracking with outstanding amounts and payment history." },
    { icon:"⚠️", title:"Defaulter Alerts",           desc:"Automatic flags for overdue fee accounts — never miss a follow-up." },
    { icon:"👨‍💼", title:"Staff Payroll",              desc:"Teacher and admin salaries with deductions, bonuses, and advance tracking." },
    { icon:"📅", title:"Academic Year Management",   desc:"Manage fee structures per class, session, and term independently." },
    { icon:"📊", title:"Financial Reports",          desc:"Monthly income statements, department budgets, and full audit trails." },
    { icon:"🎓", title:"Student Management",         desc:"Enrollment, class assignment, and complete academic profile per student." },
    { icon:"🏢", title:"Multi-Campus",               desc:"Centralized reporting across all campuses with entity-level isolation." },
  ],
  Hospitality: [
    { icon:"🍽️", title:"Table & Order Management",  desc:"Live floor plan. Open orders per table. Split bills instantly." },
    { icon:"👨‍🍳", title:"Kitchen Display System",    desc:"Orders flow directly to kitchen — no lost tickets, no delays." },
    { icon:"📋", title:"Menu Management",            desc:"Update prices, availability, and categories in real time." },
    { icon:"💰", title:"Daily Cash Register",        desc:"Cash, card, and digital payments reconciled at shift close." },
    { icon:"📦", title:"Ingredient Inventory",       desc:"Track raw materials. Know when to reorder before you run out." },
    { icon:"🧮", title:"Recipe & Food Costing",      desc:"Know the exact cost of each dish — price your menu profitably." },
    { icon:"👨‍💼", title:"Staff Shift Management",    desc:"Assign shifts, track attendance, and calculate commissions." },
    { icon:"📊", title:"Daily Sales Reports",        desc:"Best-selling items, peak hours, and per-shift revenue summaries." },
  ],
  Production: [
    { icon:"⚙️", title:"Bill of Materials (BOM)",   desc:"Define raw material requirements per product — auto-deduct on production." },
    { icon:"🏭", title:"Production Orders",          desc:"Plan and track manufacturing batches from start to finish." },
    { icon:"📦", title:"Raw Material Stock",         desc:"Monitor inputs, finished goods, and work-in-progress separately." },
    { icon:"💰", title:"Production Cost Tracking",   desc:"Labour, overhead, and raw material cost per batch — calculated automatically." },
    { icon:"🔍", title:"Variance Analysis",          desc:"Compare standard vs actual cost per production run. Spot inefficiencies." },
    { icon:"📋", title:"Purchase Orders & GRN",      desc:"Raise POs to suppliers. Receive materials and match supplier invoices." },
    { icon:"📊", title:"Profitability by Product",   desc:"Know your margin on every SKU before setting the sale price." },
    { icon:"🚛", title:"Dispatch & Delivery",        desc:"Outward challans, delivery tracking, and customer invoicing." },
  ],
  Logistics: [
    { icon:"🚛", title:"Fleet Management",           desc:"Vehicle assignments, fuel tracking, and maintenance logs per vehicle." },
    { icon:"🗺️", title:"Trip & Freight Tracking",   desc:"Log trips with origin, destination, cargo, and freight revenue." },
    { icon:"⛽", title:"Fuel & Expense Log",         desc:"Daily fuel receipts, toll, and driver allowances tracked per trip." },
    { icon:"🔧", title:"Vehicle Maintenance",        desc:"Service reminders and full repair history per vehicle." },
    { icon:"👤", title:"Driver Management",          desc:"Driver records, advance payments, and daily settlement tracking." },
    { icon:"💸", title:"COD Reconciliation",         desc:"Track cash-on-delivery collections across riders and routes." },
    { icon:"📊", title:"Route Profitability",        desc:"Revenue minus all costs per vehicle — know which trucks earn." },
    { icon:"👨‍💼", title:"Driver Payroll",            desc:"Commission-based or fixed salary with advance deductions." },
  ],
  default: [
    { icon:"📒", title:"Full Accounting Suite",      desc:"Journal vouchers, ledger, trial balance, P&L, and balance sheet." },
    { icon:"🧾", title:"Sales & Purchase Invoicing", desc:"Professional invoices with PDF export, branding, and WhatsApp sharing." },
    { icon:"📦", title:"Inventory Management",       desc:"Stock control, GRN, barcode scanning, and low-stock alerts." },
    { icon:"🏦", title:"Bank Reconciliation",        desc:"Import statements, auto-match transactions, and close with confidence." },
    { icon:"👨‍💼", title:"HR & Payroll",              desc:"Attendance, salary processing, advances, and leave management." },
    { icon:"📊", title:"Business Reports",           desc:"Profit & loss, cash flow, ageing, and custom financial reports." },
    { icon:"🔁", title:"Recurring Transactions",     desc:"Schedule monthly salary, rent, and utility entries automatically." },
    { icon:"🏢", title:"Multi-Branch",               desc:"Manage multiple locations from one consolidated dashboard." },
  ],
};

const FAQS: Record<string, { q:string; a:string }[]> = {
  travel: [
    { q:"Can I manage both tickets and visas in the same system?", a:"Yes — airline tickets and visa processing are separate workflows but linked to the same passenger file and client account." },
    { q:"Does it support multi-currency invoicing?", a:"Fully. You can quote and invoice in USD, EUR, or any currency — with automatic conversion to your base currency." },
    { q:"Can multiple team members use it simultaneously?", a:"Yes, the Professional plan supports 3 users and Enterprise is unlimited. Each user has their own login and audit trail." },
    { q:"How long does setup take?", a:"Most travel agencies are fully set up within 30 minutes. Your opening balances and client list can be imported from Excel." },
  ],
  Commerce: [
    { q:"Can I import my existing stock and customer data?", a:"Yes — FinovaOS supports Excel/CSV import for items, customers, suppliers, and opening balances." },
    { q:"Does it work for businesses with multiple warehouses?", a:"Yes. The Professional and Enterprise plans support multi-branch and multi-warehouse operations with inter-branch transfers." },
    { q:"Can I use it for both import and local sales?", a:"Yes — multi-currency invoicing lets you buy in USD/EUR and sell in your local currency with automatic FX conversion." },
    { q:"How does bank reconciliation work?", a:"Import your bank statement (CSV/Excel) and FinovaOS automatically matches entries against your recorded transactions. Unmatched items are flagged for review." },
  ],
  Services: [
    { q:"Can I invoice clients by project and by retainer at the same time?", a:"Yes — each client can have a mix of project-based, milestone-based, and recurring retainer invoices within the same account." },
    { q:"How does the expense tracking work?", a:"Log expenses against a project or cost center, attach receipts, and they automatically reduce that project's net margin in reports." },
    { q:"Can I set up automatic monthly invoices for retainer clients?", a:"Yes — configure recurring invoices once and they auto-generate on your chosen date each month, ready to send or auto-send." },
    { q:"Is there a CRM to manage leads and follow-ups?", a:"Yes — the CRM module tracks contacts, interactions, quotation statuses, and follow-up reminders for your sales pipeline." },
  ],
  Healthcare: [
    { q:"Does it handle both OPD and IPD billing?", a:"Yes — OPD billing is fast and item-based. IPD billing tracks room charges, daily costs, procedures, and final settlement." },
    { q:"Can I track medicine expiry dates?", a:"Yes — each drug batch has an expiry date. The system alerts you 30-90 days before expiry so you can clear stock in time." },
    { q:"Does it work for multi-specialty hospitals?", a:"Yes — departments, doctors, and billing categories are all configurable. The Enterprise plan supports unlimited departments and branches." },
    { q:"Can we integrate with insurance or TPA systems?", a:"Currently, insurance claims are tracked manually within FinovaOS. Direct integration is on the roadmap for the Enterprise plan." },
  ],
  Education: [
    { q:"Can I set different fee structures for each class?", a:"Yes — fee schedules are fully configurable by class, term, and fee type (tuition, transport, activity, etc.)." },
    { q:"How does defaulter tracking work?", a:"Any student whose payment is overdue past a set date is automatically flagged. You can generate defaulter lists and send reminders." },
    { q:"Can it manage multiple schools under one account?", a:"Yes — the Enterprise plan supports multi-campus with data isolation per campus and consolidated reports at the group level." },
    { q:"Does it handle staff payroll and leave management?", a:"Yes — payroll supports salary, advances, bonuses, deductions, and leave encashment with monthly processing workflow." },
  ],
  Hospitality: [
    { q:"Does it work with an existing POS system?", a:"FinovaOS includes its own POS. Daily sales from external POS systems can also be imported via CSV for accounting integration." },
    { q:"Can I manage multiple restaurant branches?", a:"Yes — each outlet runs independently with its own sales, stock, and staff. The owner sees consolidated reports across all branches." },
    { q:"How does food costing work?", a:"Define a recipe for each menu item with ingredients and quantities. When an order is placed, the system deducts ingredients from stock and calculates food cost." },
    { q:"Does the kitchen display system work on a tablet?", a:"Yes — the KDS is web-based and works on any screen. No dedicated hardware required." },
  ],
  Production: [
    { q:"How does BOM-based production work?", a:"Define the Bill of Materials for each product. When a production order is created, the system auto-deducts raw materials from stock and adds finished goods." },
    { q:"Can I track work-in-progress (WIP) separately?", a:"Yes — WIP is tracked as a separate inventory category between raw materials and finished goods." },
    { q:"Does it calculate cost per unit automatically?", a:"Yes — after a production run, the system calculates total cost (materials + labour + overhead) and divides by units produced." },
    { q:"Can I manage multiple production lines or factories?", a:"Yes — the Enterprise plan supports multi-branch with separate production tracking per factory and consolidated group P&L." },
  ],
  Logistics: [
    { q:"How does trip-wise expense tracking work?", a:"Each trip has its own expense log — fuel, toll, driver allowance, and loading charges. The system calculates net profit per trip after deductions." },
    { q:"Can I track COD collections from multiple riders?", a:"Yes — each rider's COD collections are tracked separately and reconciled against their delivery list at day close." },
    { q:"Does it handle fuel cards or only cash expenses?", a:"Both — fuel expenses can be entered as cash, bank transfer, or fuel card transactions, each linked to the specific trip." },
    { q:"Can I manage a fleet of 50+ vehicles?", a:"Yes — there's no limit on vehicles in any plan. Each vehicle has its own P&L, maintenance history, and trip log." },
  ],
  default: [
    { q:"How long does it take to set up?", a:"Most businesses are fully set up in under 30 minutes. Your chart of accounts comes pre-configured for your industry." },
    { q:"Can I import my existing data?", a:"Yes — FinovaOS supports Excel and CSV import for contacts, items, and opening balances." },
    { q:"Is there a mobile version?", a:"FinovaOS is fully responsive and works on any device through the browser. No app download required." },
    { q:"What support is available?", a:"All plans include email and chat support. Professional and Enterprise plans include priority support with faster response times." },
  ],
};

const PLAN_ROWS: Record<string, { feature:string; starter:string|boolean; pro:string|boolean; enterprise:string|boolean }[]> = {
  travel: [
    { feature:"Airline ticket tracking",     starter:true,      pro:true,          enterprise:true },
    { feature:"Visa processing cases",       starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Travel quotations",           starter:true,      pro:true,          enterprise:true },
    { feature:"Service billing",             starter:true,      pro:true,          enterprise:true },
    { feature:"CRM & passenger history",     starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-currency invoicing",    starter:false,     pro:true,          enterprise:true },
    { feature:"Revenue analytics",           starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
    { feature:"Team members",                starter:"1",       pro:"Up to 3",     enterprise:"Unlimited" },
  ],
  Commerce: [
    { feature:"Sales & purchase invoicing",  starter:true,      pro:true,          enterprise:true },
    { feature:"Inventory management",        starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Party ledger & ageing",       starter:true,      pro:true,          enterprise:true },
    { feature:"Bank reconciliation",         starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-branch operations",     starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Multi-currency",              starter:false,     pro:true,          enterprise:true },
    { feature:"Trade reports",               starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
    { feature:"CRM",                         starter:false,     pro:true,          enterprise:true },
  ],
  Services: [
    { feature:"Project & retainer billing",  starter:true,      pro:true,          enterprise:true },
    { feature:"Expense tracking",            starter:true,      pro:true,          enterprise:true },
    { feature:"CRM & client management",     starter:"Basic",   pro:true,          enterprise:true },
    { feature:"HR & payroll",                starter:false,     pro:true,          enterprise:true },
    { feature:"Recurring invoices",          starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-branch",                starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Profitability reports",       starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
    { feature:"API access",                  starter:false,     pro:false,         enterprise:true },
  ],
  Healthcare: [
    { feature:"Patient billing",             starter:true,      pro:true,          enterprise:true },
    { feature:"Pharmacy inventory",          starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Doctor & OPD management",     starter:false,     pro:true,          enterprise:true },
    { feature:"Insurance claim tracking",    starter:false,     pro:true,          enterprise:true },
    { feature:"Lab & diagnostic records",    starter:false,     pro:true,          enterprise:true },
    { feature:"Staff payroll",               starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-branch / chain",        starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Revenue analytics",           starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
  ],
  Education: [
    { feature:"Fee collection",              starter:true,      pro:true,          enterprise:true },
    { feature:"Student ledger",              starter:true,      pro:true,          enterprise:true },
    { feature:"Defaulter alerts",            starter:true,      pro:true,          enterprise:true },
    { feature:"Staff payroll",               starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Academic year management",    starter:true,      pro:true,          enterprise:true },
    { feature:"Multi-campus",                starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Financial reports",           starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
    { feature:"Parent communication",        starter:false,     pro:true,          enterprise:true },
  ],
  Hospitality: [
    { feature:"Table & order billing",       starter:true,      pro:true,          enterprise:true },
    { feature:"Kitchen display system",      starter:true,      pro:true,          enterprise:true },
    { feature:"F&B inventory",               starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Recipe / food costing",       starter:false,     pro:true,          enterprise:true },
    { feature:"Staff management & payroll",  starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-outlet",                starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Daily sales reports",         starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
    { feature:"White-label branding",        starter:false,     pro:false,         enterprise:true },
  ],
  Production: [
    { feature:"Bill of Materials (BOM)",     starter:true,      pro:true,          enterprise:true },
    { feature:"Production orders",           starter:true,      pro:true,          enterprise:true },
    { feature:"Raw material stock",          starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Production cost tracking",    starter:false,     pro:true,          enterprise:true },
    { feature:"Variance analysis",           starter:false,     pro:true,          enterprise:true },
    { feature:"Purchase orders & GRN",       starter:true,      pro:true,          enterprise:true },
    { feature:"Multi-factory / branch",      starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Efficiency reports",          starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
  ],
  Logistics: [
    { feature:"Fleet management",            starter:true,      pro:true,          enterprise:true },
    { feature:"Trip & freight tracking",     starter:true,      pro:true,          enterprise:true },
    { feature:"Fuel & expense log",          starter:true,      pro:true,          enterprise:true },
    { feature:"COD reconciliation",          starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Driver payroll",              starter:false,     pro:true,          enterprise:true },
    { feature:"Vehicle maintenance log",     starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-depot / branch",        starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Route profitability reports", starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
  ],
  default: [
    { feature:"Invoicing & billing",         starter:true,      pro:true,          enterprise:true },
    { feature:"Inventory management",        starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Ledger & trial balance",      starter:true,      pro:true,          enterprise:true },
    { feature:"Bank reconciliation",         starter:false,     pro:true,          enterprise:true },
    { feature:"HR & payroll",                starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-branch",                starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Advanced reports",            starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
    { feature:"API access",                  starter:false,     pro:false,         enterprise:true },
  ],
};

const PHASE_COLORS: Record<number,string> = { 1:"#34d399", 2:"#818cf8", 3:"#fbbf24", 4:"#f87171" };

function key(id:string, cat:string, map:Record<string,any>) {
  return map[id] ?? map[cat] ?? map.default;
}

function Cell({ val }: { val:string|boolean }) {
  if (val===true)  return <span style={{ color:"#34d399", fontSize:18, fontWeight:700 }}>✓</span>;
  if (val===false) return <span style={{ color:"rgba(255,255,255,.15)", fontSize:16 }}>—</span>;
  return <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.75)" }}>{val as string}</span>;
}

export default function IndustryPage() {
  const { industry } = useParams<{ industry:string }>();
  const router = useRouter();
  const [type,     setType]     = useState<BizType|null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notified, setNotified] = useState(false);
  const [email,    setEmail]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [prices,   setPrices]   = useState({ starter:49, pro:99, enterprise:249 });
  const [currency, setCurrency] = useState("USD");
  const [openFaq,  setOpenFaq]  = useState<number|null>(null);

  useEffect(() => {
    fetch("/api/public/business-types")
      .then(r => r.json())
      .then(d => { setType((d.types??[]).find((t:BizType)=>t.id===industry)??null); setLoading(false); })
      .catch(()=>setLoading(false));
    fetch("/api/public/pricing").then(r=>r.json()).then(d=>{
      if(d?.pricing) setPrices({ starter:d.pricing.starter?.monthly??49, pro:d.pricing.pro?.monthly??99, enterprise:d.pricing.enterprise?.monthly??249 });
    }).catch(()=>{});
    fetch("/api/public/geo",{cache:"no-store"}).then(r=>r.json()).then(d=>{ if(d?.currency) setCurrency(d.currency); }).catch(()=>{});
  }, [industry]);

  async function joinWaitlist() {
    if (!email||sending) return;
    setSending(true);
    try {
      await fetch("/api/public/notify-me",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email, businessType:industry}) });
      setNotified(true);
    } catch {}
    setSending(false);
  }

  function fmtPrice(usd:number) {
    try { const { formatFromUSD } = require("@/lib/currency"); return formatFromUSD(usd,currency); }
    catch { return `$${usd}`; }
  }

  const ff = "'Outfit','DM Sans',sans-serif";

  if (loading) return <div style={{ minHeight:"100vh", background:"#080c1e", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:ff, color:"rgba(255,255,255,.3)", fontSize:15 }}>Loading…</div>;

  if (!type) return (
    <div style={{ minHeight:"100vh", background:"#080c1e", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:ff, color:"white", gap:20, textAlign:"center", padding:24 }}>
      <div style={{ fontSize:64 }}>🔍</div>
      <h1 style={{ fontSize:28, fontWeight:900, margin:0 }}>Industry not found</h1>
      <p style={{ color:"rgba(255,255,255,.4)", margin:0 }}>We couldn't find &ldquo;{industry}&rdquo; in our system.</p>
      <Link href="/solutions" style={{ padding:"12px 24px", borderRadius:12, background:"rgba(99,102,241,.2)", border:"1px solid rgba(99,102,241,.4)", color:"#a5b4fc", textDecoration:"none", fontWeight:700 }}>Browse all industries →</Link>
    </div>
  );

  const phaseColor = PHASE_COLORS[type.phase];
  const features  = key(type.id, type.category, FEATURES);
  const painPts   = key(type.id, type.category, PAIN_POINTS);
  const workflow  = key(type.id, type.category, WORKFLOWS);
  const stats     = key(type.id, type.category, STATS);
  const faqs      = key(type.id, type.category, FAQS);
  const planRows  = key(type.id, type.category, PLAN_ROWS);

  const PLANS = [
    { key:"starter",    name:"Starter",      price:prices.starter,    color:"#818cf8", gradient:"linear-gradient(135deg,#6366f1,#4f46e5)" },
    { key:"pro",        name:"Professional", price:prices.pro,        color:"#a5b4fc", gradient:"linear-gradient(135deg,#818cf8,#6366f1)", featured:true },
    { key:"enterprise", name:"Enterprise",   price:prices.enterprise, color:"#34d399", gradient:"linear-gradient(135deg,#059669,#34d399)" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#060918 0%,#080c22 60%,#0a0f2a 100%)", fontFamily:ff, color:"white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:ital,wght@0,700;1,700&display=swap');
        *,*::before,*::after{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .5s ease forwards}
        @media(max-width:700px){
          .feat-grid{grid-template-columns:1fr!important}
          .plan-grid{grid-template-columns:1fr!important}
          .plan-row{grid-template-columns:1fr!important}
          .plan-row>div:not(:first-child){display:none!important}
          .stat-grid{grid-template-columns:1fr 1fr!important}
          .wf-list{flex-direction:column!important;gap:8px!important}
          .wf-arrow{display:none!important}
          .pain-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* ── Topbar ── */}
      <div style={{ padding:"18px 24px", maxWidth:1160, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button onClick={()=>router.back()} style={{
          display:"flex", alignItems:"center", gap:8, background:"none", border:"1px solid rgba(255,255,255,.1)",
          borderRadius:10, padding:"7px 16px", color:"rgba(255,255,255,.5)", fontSize:12,
          fontWeight:600, cursor:"pointer", fontFamily:ff, transition:"all .2s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.25)";e.currentTarget.style.color="rgba(255,255,255,.8)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.1)";e.currentTarget.style.color="rgba(255,255,255,.5)";}}
        >← Back</button>
        <Link href="/solutions" style={{ fontSize:12, color:"rgba(255,255,255,.35)", textDecoration:"none", fontWeight:600 }}>All Industries →</Link>
      </div>

      {/* ── HERO ── */}
      <div style={{ maxWidth:900, margin:"0 auto", padding:"48px 24px 80px", textAlign:"center" }}>
        <div style={{ fontSize:88, marginBottom:20, lineHeight:1, filter:"drop-shadow(0 0 32px rgba(99,102,241,.3))" }}>{type.icon}</div>

        <div style={{ marginBottom:18 }}>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:7, padding:"7px 18px",
            borderRadius:24, fontSize:12, fontWeight:800, letterSpacing:".05em",
            background: type.isLive ? "rgba(52,211,153,.14)" : "rgba(251,191,36,.12)",
            border:`1px solid ${type.isLive ? "rgba(52,211,153,.4)" : "rgba(251,191,36,.4)"}`,
            color: type.isLive ? "#34d399" : "#fbbf24",
          }}>
            {type.isLive ? "🟢 Live Now" : `⏳ Phase ${type.phase} — Coming Soon`}
          </span>
        </div>

        <h1 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(34px,5.5vw,62px)", fontWeight:700, letterSpacing:"-2px", lineHeight:1.08, margin:"0 0 16px" }}>
          FinovaOS for{" "}
          <span style={{ fontStyle:"italic", background:`linear-gradient(135deg,${phaseColor},#6366f1)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            {type.label}
          </span>
        </h1>
        <p style={{ fontSize:18, color:"rgba(255,255,255,.45)", maxWidth:580, margin:"0 auto 40px", lineHeight:1.75 }}>
          {type.description}
        </p>

        {type.isLive ? (
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href={`/onboarding/signup/starter?businessType=${type.id}`} style={{
              padding:"14px 36px", borderRadius:14, background:"linear-gradient(135deg,#6366f1,#4f46e5)",
              color:"white", fontWeight:800, fontSize:15, textDecoration:"none",
              boxShadow:"0 8px 32px rgba(99,102,241,.4)", transition:"all .25s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 40px rgba(99,102,241,.55)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 8px 32px rgba(99,102,241,.4)";}}
            >
              Get Started — {type.label} →
            </Link>
            <Link href="/pricing" style={{
              padding:"14px 32px", borderRadius:14, background:"rgba(255,255,255,.06)",
              border:"1px solid rgba(255,255,255,.14)", color:"rgba(255,255,255,.75)",
              fontWeight:700, fontSize:15, textDecoration:"none", transition:"all .25s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.1)";e.currentTarget.style.color="white";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.06)";e.currentTarget.style.color="rgba(255,255,255,.75)";}}
            >View Pricing</Link>
          </div>
        ) : (
          <div style={{ maxWidth:460, margin:"0 auto" }}>
            {notified ? (
              <div style={{ padding:"20px 28px", borderRadius:16, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.3)", color:"#34d399", fontWeight:700, fontSize:15 }}>
                ✅ You&apos;re on the list! We&apos;ll email you when {type.label} goes live.
              </div>
            ) : (
              <div style={{ padding:"28px 32px", borderRadius:20, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)" }}>
                <p style={{ fontSize:14, color:"rgba(255,255,255,.5)", marginBottom:16, fontWeight:600 }}>🔔 Get notified when {type.label} launches</p>
                <div style={{ display:"flex", gap:10 }}>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
                    onKeyDown={e=>e.key==="Enter"&&joinWaitlist()}
                    style={{ flex:1, padding:"12px 16px", borderRadius:10, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.12)", color:"white", fontSize:14, outline:"none", fontFamily:ff }}
                  />
                  <button onClick={joinWaitlist} disabled={sending} style={{
                    padding:"12px 20px", borderRadius:10, background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                    border:"none", color:"white", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:ff, opacity:sending?0.6:1,
                  }}>{sending?"…":"Notify Me"}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.06)", borderBottom:"1px solid rgba(255,255,255,.06)", background:"rgba(255,255,255,.02)", padding:"36px 24px" }}>
        <div className="stat-grid" style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:0 }}>
          {(stats as {val:string;label:string}[]).map((s,i) => (
            <div key={i} style={{ textAlign:"center", padding:"0 24px", borderRight: i<2?"1px solid rgba(255,255,255,.06)":undefined }}>
              <div style={{ fontFamily:"'Lora',serif", fontSize:"clamp(28px,4vw,42px)", fontWeight:700, color:phaseColor, letterSpacing:"-1px" }}>{s.val}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", fontWeight:500, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── THE PROBLEM ── */}
      <div style={{ maxWidth:1000, margin:"0 auto", padding:"80px 24px 0" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"5px 14px", borderRadius:20, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.25)", fontSize:11, fontWeight:700, color:"#f87171", letterSpacing:".08em", marginBottom:18 }}>
            ⚠️ THE PROBLEM
          </div>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(22px,3vw,34px)", fontWeight:700, letterSpacing:"-1px", margin:"0 0 10px" }}>
            What breaks without a proper system
          </h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.38)", maxWidth:480, margin:"0 auto" }}>
            These are the exact pain points {type.label} businesses face before switching to FinovaOS.
          </p>
        </div>
        <div className="pain-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {(painPts as {icon:string;text:string}[]).map((p,i) => (
            <div key={i} style={{ padding:"22px 20px", borderRadius:16, background:"rgba(239,68,68,.04)", border:"1px solid rgba(239,68,68,.14)", display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ fontSize:28 }}>{p.icon}</div>
              <p style={{ fontSize:13.5, color:"rgba(255,255,255,.55)", lineHeight:1.7, margin:0 }}>{p.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── WORKFLOW ── */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"80px 24px 0" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"5px 14px", borderRadius:20, background:`${phaseColor}14`, border:`1px solid ${phaseColor}35`, fontSize:11, fontWeight:700, color:phaseColor, letterSpacing:".08em", marginBottom:18 }}>
            ⚡ HOW IT WORKS
          </div>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(22px,3vw,34px)", fontWeight:700, letterSpacing:"-1px", margin:0 }}>
            Your {type.label} workflow — automated
          </h2>
        </div>
        <div className="wf-list" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0, flexWrap:"wrap", maxWidth:900, margin:"0 auto" }}>
          {(workflow as string[]).map((step,i) => (
            <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
              <div style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                padding:"16px 20px", borderRadius:14,
                background:`${phaseColor}10`, border:`1px solid ${phaseColor}30`,
                minWidth:120, textAlign:"center",
              }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:phaseColor, color:"#0f172a", fontWeight:900, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>{i+1}</div>
                <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.8)", lineHeight:1.35 }}>{step}</div>
              </div>
              {i < (workflow as string[]).length-1 && (
                <div className="wf-arrow" style={{ color:phaseColor, fontSize:18, opacity:.5, margin:"0 4px", flexShrink:0 }}>→</div>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{ maxWidth:1160, margin:"0 auto", padding:"80px 24px 0" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(24px,3.5vw,38px)", fontWeight:700, letterSpacing:"-1px", margin:"0 0 12px" }}>
            Everything a {type.label} needs
          </h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,.4)", maxWidth:480, margin:"0 auto" }}>
            Pre-configured for your industry — get started in minutes, not days.
          </p>
        </div>
        <div className="feat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
          {(features as {icon:string;title:string;desc:string}[]).map((f,i) => (
            <div key={i} style={{ padding:"22px 20px", borderRadius:18, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", transition:"all .25s" }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.06)";e.currentTarget.style.borderColor=`${phaseColor}40`;e.currentTarget.style.transform="translateY(-3px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.03)";e.currentTarget.style.borderColor="rgba(255,255,255,.08)";e.currentTarget.style.transform="translateY(0)";}}
            >
              <div style={{ fontSize:26, marginBottom:12 }}>{f.icon}</div>
              <div style={{ fontSize:14, fontWeight:800, color:"white", marginBottom:7, lineHeight:1.3 }}>{f.title}</div>
              <div style={{ fontSize:12.5, color:"rgba(255,255,255,.42)", lineHeight:1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PLAN COMPARISON ── */}
      {type.isLive && (
        <div style={{ maxWidth:1000, margin:"80px auto 0", padding:"0 24px" }}>
          <h2 style={{ textAlign:"center", fontFamily:"'Lora',serif", fontSize:"clamp(22px,3vw,34px)", fontWeight:700, letterSpacing:"-1px", marginBottom:10 }}>
            Which plan suits your {type.label}?
          </h2>
          <p style={{ textAlign:"center", color:"rgba(255,255,255,.4)", fontSize:15, marginBottom:40 }}>
            All plans include core accounting. Higher plans unlock more {type.label.toLowerCase()} features.
          </p>

          <div style={{ borderRadius:20, overflow:"hidden", border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.02)" }}>
            {/* Headers */}
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", borderBottom:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.02)" }}>
              <div style={{ padding:"20px 24px", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em" }}>Feature</div>
              {PLANS.map(p => (
                <div key={p.key} style={{ padding:"20px 16px", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.06)", background:p.featured?"rgba(99,102,241,.06)":"transparent" }}>
                  {p.featured && <div style={{ fontSize:9, fontWeight:800, color:"#fbbf24", letterSpacing:".08em", marginBottom:4 }}>POPULAR</div>}
                  <div style={{ fontSize:12, fontWeight:900, color:p.color, marginBottom:4 }}>{p.name}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:"white" }}>{fmtPrice(p.price)}<span style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:500 }}>/mo</span></div>
                </div>
              ))}
            </div>
            {/* Rows */}
            {(planRows as any[]).map((row:any,i:number) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", borderBottom:"1px solid rgba(255,255,255,.04)", background:i%2?"rgba(255,255,255,.01)":"transparent" }}>
                <div style={{ padding:"13px 24px", fontSize:13, color:"rgba(255,255,255,.6)" }}>{row.feature}</div>
                {(["starter","pro","enterprise"] as const).map(k => (
                  <div key={k} style={{ padding:"13px 16px", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.04)", background:k==="pro"?"rgba(99,102,241,.03)":"transparent" }}>
                    <Cell val={row[k]} />
                  </div>
                ))}
              </div>
            ))}
            {/* CTA */}
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", background:"rgba(255,255,255,.02)", borderTop:"1px solid rgba(255,255,255,.08)" }}>
              <div style={{ padding:"20px 24px", fontSize:12, color:"rgba(255,255,255,.28)" }}>🔥 75% off — first 3 months</div>
              {PLANS.map(p => (
                <div key={p.key} style={{ padding:"14px", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.06)", background:p.featured?"rgba(99,102,241,.06)":"transparent" }}>
                  <Link href={`/onboarding/signup/${p.key==="pro"?"professional":p.key}?businessType=${type.id}`} style={{
                    display:"block", padding:"10px 0", borderRadius:10,
                    background:p.featured?p.gradient:"rgba(255,255,255,.07)",
                    border:p.featured?"none":`1px solid ${p.color}30`,
                    color:"white", fontWeight:700, fontSize:12, textDecoration:"none",
                  }}>Get {p.name}</Link>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign:"center", marginTop:14 }}>
            <Link href="/pricing" style={{ fontSize:13, color:"#818cf8", textDecoration:"none", fontWeight:600 }}>View full pricing details →</Link>
          </div>
        </div>
      )}

      {/* ── FAQ ── */}
      <div style={{ maxWidth:760, margin:"80px auto 0", padding:"0 24px" }}>
        <h2 style={{ textAlign:"center", fontFamily:"'Lora',serif", fontSize:"clamp(22px,3vw,32px)", fontWeight:700, letterSpacing:"-1px", marginBottom:10 }}>
          Common questions
        </h2>
        <p style={{ textAlign:"center", color:"rgba(255,255,255,.38)", fontSize:14, marginBottom:40 }}>
          Everything {type.label} owners ask before switching.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {(faqs as {q:string;a:string}[]).map((faq,i) => (
            <div key={i} style={{ borderRadius:14, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.02)", overflow:"hidden" }}>
              <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{
                width:"100%", padding:"18px 20px", background:"none", border:"none",
                color:"white", fontFamily:ff, fontSize:14, fontWeight:700, textAlign:"left",
                cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12,
              }}>
                <span>{faq.q}</span>
                <span style={{ color:phaseColor, fontSize:18, flexShrink:0, transition:"transform .2s", transform:openFaq===i?"rotate(45deg)":"rotate(0)" }}>+</span>
              </button>
              {openFaq===i && (
                <div style={{ padding:"0 20px 18px", fontSize:13.5, color:"rgba(255,255,255,.52)", lineHeight:1.75, borderTop:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ paddingTop:14 }}>{faq.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{ maxWidth:800, margin:"80px auto", padding:"0 24px" }}>
        <div style={{ borderRadius:24, padding:"60px 40px", textAlign:"center", background:`linear-gradient(135deg,${phaseColor}12,rgba(99,102,241,.06))`, border:`1px solid ${phaseColor}25`, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle,${phaseColor}18,transparent 70%)`, top:-100, right:-80, pointerEvents:"none" }}/>
          <div style={{ position:"relative" }}>
            <div style={{ fontSize:52, marginBottom:18 }}>{type.icon}</div>
            <h3 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(22px,3.5vw,36px)", fontWeight:700, letterSpacing:"-1px", marginBottom:12 }}>
              Ready to transform your {type.label}?
            </h3>
            <p style={{ color:"rgba(255,255,255,.45)", fontSize:15, marginBottom:36, lineHeight:1.75, maxWidth:500, margin:"0 auto 36px" }}>
              Join businesses already running on FinovaOS. Set up in under 30 minutes, no credit card required.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:24 }}>
              {type.isLive ? (
                <>
                  <Link href={`/onboarding/signup/starter?businessType=${type.id}`} style={{ padding:"14px 36px", borderRadius:13, background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"white", fontWeight:800, fontSize:15, textDecoration:"none", boxShadow:"0 6px 24px rgba(99,102,241,.4)" }}>
                    Get Started — Free →
                  </Link>
                  <Link href="/contact" style={{ padding:"14px 28px", borderRadius:13, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.14)", color:"rgba(255,255,255,.75)", fontWeight:700, fontSize:15, textDecoration:"none" }}>
                    Talk to Sales
                  </Link>
                </>
              ) : (
                <Link href="/solutions" style={{ padding:"14px 36px", borderRadius:13, background:`${phaseColor}18`, border:`1px solid ${phaseColor}40`, color:phaseColor, fontWeight:700, fontSize:15, textDecoration:"none" }}>
                  Browse live industries →
                </Link>
              )}
            </div>
            {/* Trust signals */}
            <div style={{ display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap" }}>
              {["✓ 10-min setup","✓ No credit card","✓ Cancel anytime","✓ Dedicated support"].map(t => (
                <span key={t} style={{ fontSize:12, color:"rgba(255,255,255,.3)", fontWeight:600 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer nav ── */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,.05)", padding:"28px 24px", textAlign:"center" }}>
        <div style={{ display:"flex", gap:24, justifyContent:"center", flexWrap:"wrap" }}>
          {[{href:"/",label:"Home"},{href:"/solutions",label:"All Industries"},{href:"/features",label:"Features"},{href:"/pricing",label:"Pricing"},{href:"/contact",label:"Contact"}].map(l => (
            <Link key={l.href} href={l.href} style={{ color:"rgba(255,255,255,.3)", fontSize:12, fontWeight:600, textDecoration:"none", transition:"color .2s" }}
              onMouseEnter={e=>{e.currentTarget.style.color="rgba(255,255,255,.7)";}}
              onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.3)";}}
            >{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
