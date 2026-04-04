"use client";

import { useMemo, useState } from "react";
import { setCurrentUser, setStoredDemoBusinessPreference } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";

type DemoBusinessId =
  | "trading"
  | "wholesale"
  | "distribution"
  | "restaurant"
  | "retail"
  | "manufacturing"
  | "hospital"
  | "school"
  | "hotel"
  | "construction"
  | "pharmacy"
  | "transport"
  | "real_estate"
  | "import_company";

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
  users: string;
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
    proof: ["100+ trading businesses active on FinovaOS", "Average invoice-to-collection time reduced by 40%", "Multi-currency support for import goods"],
    highlights: [
      { label: "Quotation to Order", value: "1-click", sub: "No re-entry, no duplication" },
      { label: "Receivable Visibility", value: "Real-time", sub: "Outstanding by customer always visible" },
      { label: "Margin Tracking", value: "Per Item", sub: "Know exactly what makes money" },
    ],
    sampleDocs: ["Quotation", "Sales Invoice", "Delivery Challan", "Customer Statement", "Purchase Order"],
    users: "2,400+",
  },
  {
    id: "wholesale",
    liveBusinessType: "trading",
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
    users: "1,800+",
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
    users: "950+",
  },
  {
    id: "restaurant",
    liveBusinessType: "restaurant",
    demoAvailable: false,
    icon: "🍽️",
    label: "Restaurant",
    category: "Food & Beverage",
    tagline: "Tables, kitchen, recipes, and daily cash — fully managed.",
    description:
      "Built for restaurants, cafes, fast food chains, and food courts that need table management, kitchen orders, and cost tracking.",
    color: "#f97316",
    gradient: "linear-gradient(135deg,#ea580c,#f97316)",
    modules: ["Table Management", "Kitchen Orders (KOT)", "Menu & Pricing", "Recipe Costing", "Daily Cash Report", "Staff Tips", "Reservations", "Expense Tracking"],
    workflow: [
      { step: "Customer seated", detail: "Assign table and open order in seconds" },
      { step: "Order to kitchen", detail: "KOT printed or displayed on kitchen screen" },
      { step: "Bill and payment", detail: "Generate bill, split if needed, accept cash or card" },
      { step: "End-of-day report", detail: "Daily sales, wastage, and cash reconciliation" },
    ],
    insights: ["Best-selling dishes by revenue and margin", "Peak hours to plan staffing better", "Recipe-wise food cost vs selling price"],
    aiFeatures: [
      "🤖 AI identifies your most profitable menu items",
      "📉 Alerts when food cost percentage rises above target",
      "🍕 Suggests pricing adjustments based on ingredient cost changes",
    ],
    proof: ["Built specifically for food service operations", "Recipe costing tracks real food cost per dish", "Daily cash reports close the day in minutes not hours"],
    highlights: [
      { label: "Order Processing", value: "Instant", sub: "KOT to kitchen in under 10 seconds" },
      { label: "Recipe Costing", value: "Per Dish", sub: "Real food cost tracked automatically" },
      { label: "Daily Close", value: "5 Minutes", sub: "Cash report generates itself" },
    ],
    sampleDocs: ["KOT (Kitchen Order Ticket)", "Customer Bill", "Daily Sales Report", "Recipe Cost Sheet", "Expense Voucher"],
    users: "3,100+",
  },
  {
    id: "retail",
    liveBusinessType: "retail",
    demoAvailable: false,
    icon: "🏪",
    label: "Retail & POS",
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
    users: "4,200+",
  },
  {
    id: "manufacturing",
    liveBusinessType: "manufacturing",
    demoAvailable: false,
    icon: "🏭",
    label: "Manufacturing",
    category: "Production",
    tagline: "Raw materials to finished goods — track every production step.",
    description:
      "Built for factories, production units, and manufacturers needing BOM, work orders, production tracking, and cost control.",
    color: "#6366f1",
    gradient: "linear-gradient(135deg,#4f46e5,#6366f1)",
    modules: ["Bill of Materials (BOM)", "Work Orders", "Production Tracking", "Raw Material Control", "Finished Goods", "Quality Control", "Manufacturing Cost", "Waste Tracking"],
    workflow: [
      { step: "Sales order received", detail: "Create production order based on demand and BOM" },
      { step: "Issue raw materials", detail: "Materials issued from warehouse to production floor" },
      { step: "Track production", detail: "Work order progress tracked in real-time" },
      { step: "Finished goods to store", detail: "Quality check, then goods moved to finished stock" },
    ],
    insights: ["Production efficiency per batch and per machine", "Raw material consumption vs standard BOM", "Cost per unit vs selling price — real manufacturing margin"],
    aiFeatures: [
      "🤖 AI detects production inefficiencies per batch",
      "📦 Predicts raw material shortages before they stop production",
      "💰 Alerts when actual cost per unit exceeds standard",
    ],
    proof: ["BOM-based production planning eliminates over-ordering", "Real cost tracking vs estimated gives true profit picture", "Quality control integrated into production workflow"],
    highlights: [
      { label: "BOM Accuracy", value: "100%", sub: "Actual vs standard variance tracked" },
      { label: "Waste Control", value: "Measured", sub: "Every gram of raw material accounted" },
      { label: "Cost Visibility", value: "Per Unit", sub: "Real production cost always known" },
    ],
    sampleDocs: ["Work Order", "BOM Sheet", "Material Issue Voucher", "Production Report", "Quality Check Form"],
    users: "720+",
  },
  {
    id: "hospital",
    liveBusinessType: "hospital",
    demoAvailable: false,
    icon: "🏥",
    label: "Hospital / Clinic",
    category: "Healthcare",
    tagline: "Patients, prescriptions, lab, and billing — all connected.",
    description:
      "For hospitals, clinics, diagnostic centers, and specialist practices needing patient records, lab integration, and billing.",
    color: "#ec4899",
    gradient: "linear-gradient(135deg,#db2777,#ec4899)",
    modules: ["Patient Registration", "Appointments", "Prescriptions", "Lab Orders & Results", "Ward Management", "Doctor Billing", "Insurance Claims", "Pharmacy Link"],
    workflow: [
      { step: "Patient registered", detail: "Complete patient profile with history in one place" },
      { step: "Doctor consultation", detail: "Prescription written and linked to patient record" },
      { step: "Lab or pharmacy", detail: "Lab tests ordered, results linked back to file" },
      { step: "Billing and discharge", detail: "Full bill generated from all services rendered" },
    ],
    insights: ["Doctor-wise patient load and revenue performance", "Most common diagnoses and treatment patterns", "Insurance claim acceptance rate and pending recoveries"],
    aiFeatures: [
      "🤖 AI flags patients overdue for follow-up",
      "💊 Detects prescription patterns that suggest over-medication",
      "📋 Summarizes patient history before each consultation",
    ],
    proof: ["Patient records linked across departments in real-time", "Lab results auto-attach to prescription and billing", "Insurance claim tracking reduces revenue leakage"],
    highlights: [
      { label: "Patient Flow", value: "Seamless", sub: "OPD to IPD to discharge fully tracked" },
      { label: "Lab TAT", value: "Monitored", sub: "Test turnaround time measured per lab" },
      { label: "Billing Accuracy", value: "99%+", sub: "All services auto-captured in final bill" },
    ],
    sampleDocs: ["Prescription", "Lab Report", "Patient Invoice", "Insurance Claim", "Discharge Summary"],
    users: "580+",
  },
  {
    id: "school",
    liveBusinessType: "school",
    demoAvailable: false,
    icon: "🎓",
    label: "School / Institute",
    category: "Education",
    tagline: "Students, fees, exams, and attendance — one platform.",
    description:
      "For schools, colleges, academies, and training institutes managing students, fee collection, exam results, and schedules.",
    color: "#14b8a6",
    gradient: "linear-gradient(135deg,#0d9488,#14b8a6)",
    modules: ["Student Enrollment", "Fee Collection", "Attendance Tracking", "Exam Results", "Class Schedules", "Teacher Management", "Parent Statements", "Expense Tracking"],
    workflow: [
      { step: "Student enrolled", detail: "Complete profile with guardian info and class assignment" },
      { step: "Fee schedule set", detail: "Monthly, quarterly, or custom fee terms configured" },
      { step: "Attendance and exams", detail: "Daily attendance logged, exam results recorded per student" },
      { step: "Parent statement", detail: "Fee status and academic performance shared with parents" },
    ],
    insights: ["Fee collection rate by class and term", "Students with repeated absences — early warning", "Exam performance trends across batches"],
    aiFeatures: [
      "🤖 AI identifies students at risk of dropping out",
      "📅 Predicts which students will miss fee payment",
      "📊 Generates academic performance summary per student",
    ],
    proof: ["Fee defaulters tracked automatically with reminders", "Attendance-to-performance correlation visible to teachers", "Parent statements reduce inquiry calls to administration"],
    highlights: [
      { label: "Fee Recovery", value: "Tracked", sub: "Defaulters flagged with full history" },
      { label: "Attendance", value: "Daily Log", sub: "Class and student level both tracked" },
      { label: "Parent Access", value: "Statements", sub: "Transparent fee and academic records" },
    ],
    sampleDocs: ["Enrollment Form", "Fee Invoice", "Attendance Sheet", "Report Card", "Parent Statement"],
    users: "1,100+",
  },
  {
    id: "hotel",
    liveBusinessType: "hotel",
    demoAvailable: false,
    icon: "🏨",
    label: "Hotel & Hospitality",
    category: "Hospitality",
    tagline: "Reservations, rooms, housekeeping, and folios — all managed.",
    description:
      "For hotels, guesthouses, service apartments, and resorts managing bookings, room service, and guest billing.",
    color: "#a78bfa",
    gradient: "linear-gradient(135deg,#7c3aed,#a78bfa)",
    modules: ["Reservations", "Front Desk Check-in", "Room Management", "Housekeeping", "Room Service Orders", "Guest Folio", "Restaurant Integration", "Revenue Reports"],
    workflow: [
      { step: "Reservation made", detail: "Booking created with room assignment and dates" },
      { step: "Check-in and folio open", detail: "Guest identity verified, folio opened for all charges" },
      { step: "Services during stay", detail: "Room service, restaurant, and extras added to folio" },
      { step: "Checkout and billing", detail: "Full folio presented, payment received, room released" },
    ],
    insights: ["Occupancy rate by room type and day of week", "RevPAR (revenue per available room) tracked daily", "Service revenue per guest vs room revenue"],
    aiFeatures: [
      "🤖 AI forecasts occupancy for next 30 days",
      "💰 Recommends dynamic pricing based on demand signals",
      "🏨 Identifies guests with high lifetime value for loyalty programs",
    ],
    proof: ["Folio tracks every charge from check-in to checkout", "Housekeeping task assignment keeps rooms ready on time", "Revenue analysis by room type improves pricing decisions"],
    highlights: [
      { label: "Occupancy Tracking", value: "Live", sub: "Real-time room status always visible" },
      { label: "Folio Accuracy", value: "100%", sub: "Every charge posted to guest account" },
      { label: "Checkout Speed", value: "2 Min", sub: "Folio ready before guest arrives at desk" },
    ],
    sampleDocs: ["Reservation Confirmation", "Guest Folio", "Room Service Order", "Housekeeping Log", "Revenue Report"],
    users: "430+",
  },
  {
    id: "construction",
    liveBusinessType: "construction",
    demoAvailable: false,
    icon: "🏗️",
    label: "Construction",
    category: "Projects",
    tagline: "Projects, BOQ, contractors, and cost — all under control.",
    description:
      "For contractors, builders, and project-based businesses managing sites, BOQ, subcontractors, and material costs.",
    color: "#fb923c",
    gradient: "linear-gradient(135deg,#ea580c,#fb923c)",
    modules: ["Project Management", "BOQ (Bill of Quantities)", "Material Requisition", "Subcontractor Payments", "Site Expenses", "Progress Billing", "Cost vs Budget", "Labour Tracking"],
    workflow: [
      { step: "Project created", detail: "BOQ entered with estimated quantities and rates" },
      { step: "Materials ordered", detail: "Requisition raised, GRN received and linked to project cost" },
      { step: "Subcontractor work", detail: "Work certified and payment processed against contract" },
      { step: "Progress billing", detail: "Client billed per milestone or percentage completion" },
    ],
    insights: ["Cost vs budget per project — where overruns happen", "Subcontractor payment history and outstanding", "Material wastage vs BOQ estimate"],
    aiFeatures: [
      "🤖 AI predicts which projects are at risk of cost overrun",
      "📋 Alerts when material consumption exceeds BOQ estimate",
      "💡 Recommends contractor payment schedule optimization",
    ],
    proof: ["BOQ-linked cost tracking eliminates project budget surprises", "Progress billing keeps cash flow positive during long projects", "Site expense controls reduce informal cash leakage"],
    highlights: [
      { label: "Budget Control", value: "Live", sub: "Actual vs estimated always visible" },
      { label: "Subcontractor Bill", value: "Verified", sub: "Work certified before payment released" },
      { label: "Project Margin", value: "Real-time", sub: "Revenue minus all costs as you go" },
    ],
    sampleDocs: ["BOQ Sheet", "Material Requisition", "Subcontractor Certificate", "Progress Invoice", "Cost Report"],
    users: "660+",
  },
  {
    id: "pharmacy",
    liveBusinessType: "pharmacy",
    demoAvailable: false,
    icon: "💊",
    label: "Pharmacy",
    category: "Healthcare",
    tagline: "Medicines, prescriptions, expiry, and batch control — covered.",
    description:
      "For retail pharmacies, wholesale drug stores, and hospital pharmacies needing batch control, expiry alerts, and counter sales.",
    color: "#22d3ee",
    gradient: "linear-gradient(135deg,#0891b2,#22d3ee)",
    modules: ["Counter Sales", "Prescription Management", "Batch & Expiry Control", "Inventory Valuation", "Supplier Purchases", "Return Management", "Near-Expiry Alerts", "Sales Analytics"],
    workflow: [
      { step: "Prescription received", detail: "Enter prescription and search medicines instantly" },
      { step: "Batch selection", detail: "System auto-selects nearest expiry batch (FEFO)" },
      { step: "Counter sale billed", detail: "Invoice generated with batch and expiry details" },
      { step: "Reorder triggered", detail: "Low stock alert prompts purchase order to supplier" },
    ],
    insights: ["Near-expiry medicines by value — return or discount before loss", "Fast vs slow-moving medicines by category", "Prescription vs OTC sales split"],
    aiFeatures: [
      "🤖 AI predicts which medicines will go near-expiry next month",
      "📦 Recommends optimal reorder quantity per medicine",
      "⚠️ Flags medicines frequently sold below approved price",
    ],
    proof: ["FEFO (First Expiry First Out) batch selection prevents waste", "Near-expiry alerts give time to return stock to supplier", "Prescription tracking reduces dispensing errors"],
    highlights: [
      { label: "Expiry Control", value: "FEFO", sub: "Auto-selects earliest expiry batch" },
      { label: "Wastage Reduction", value: "-60%", sub: "Alerts before expiry crosses deadline" },
      { label: "Sales Speed", value: "Instant", sub: "Search by name, generic, or brand" },
    ],
    sampleDocs: ["Counter Sale Invoice", "Prescription Record", "Batch Ledger", "Near-Expiry Report", "Purchase Invoice"],
    users: "1,950+",
  },
  {
    id: "transport",
    liveBusinessType: "transport",
    demoAvailable: false,
    icon: "🚛",
    label: "Transport & Fleet",
    category: "Logistics",
    tagline: "Fleet, drivers, trips, fuel, and maintenance — fully tracked.",
    description:
      "For transport companies, fleet operators, and logistics businesses managing vehicles, drivers, trips, and costs.",
    color: "#34d399",
    gradient: "linear-gradient(135deg,#059669,#34d399)",
    modules: ["Fleet Management", "Driver Profiles", "Trip Management", "Fuel Tracking", "Vehicle Maintenance", "Route Dispatch", "Freight Billing", "Transport Analytics"],
    workflow: [
      { step: "Trip assigned", detail: "Driver and vehicle matched to consignment and route" },
      { step: "Dispatch and tracking", detail: "Departure logged, fuel issued, route confirmed" },
      { step: "Delivery confirmed", detail: "Proof of delivery recorded, freight charges posted" },
      { step: "Cost reconciliation", detail: "Fuel, tolls, driver allowance all matched to trip" },
    ],
    insights: ["Cost per trip per vehicle — actual vs estimated", "Fuel consumption variance by driver and route", "Vehicle maintenance schedule and overdue services"],
    aiFeatures: [
      "🤖 AI identifies drivers with high fuel consumption patterns",
      "🔧 Predicts vehicle breakdowns before they cause delays",
      "📍 Suggests optimal routing to reduce cost per km",
    ],
    proof: ["Trip-wise cost tracking removes informal expense leakage", "Maintenance schedule prevents unexpected breakdowns", "Fuel control reduces one of the biggest transport cost variables"],
    highlights: [
      { label: "Trip Cost", value: "Per Trip", sub: "Full cost visibility per journey" },
      { label: "Fuel Control", value: "Tracked", sub: "Issued, consumed, variance reported" },
      { label: "Fleet Health", value: "Scheduled", sub: "Maintenance alerts prevent breakdown" },
    ],
    sampleDocs: ["Trip Sheet", "Fuel Issue Voucher", "Freight Invoice", "Maintenance Log", "Driver Expense Claim"],
    users: "780+",
  },
  {
    id: "real_estate",
    liveBusinessType: "real_estate",
    demoAvailable: false,
    icon: "🏢",
    label: "Real Estate",
    category: "Property",
    tagline: "Properties, tenants, leases, and rent — all in one ledger.",
    description:
      "For property managers, real estate companies, and landlords managing rental properties, leases, and maintenance.",
    color: "#f472b6",
    gradient: "linear-gradient(135deg,#db2777,#f472b6)",
    modules: ["Property Management", "Tenant Profiles", "Lease Agreements", "Rent Collection", "Maintenance Requests", "Expense Tracking", "Vacancy Dashboard", "Owner Reports"],
    workflow: [
      { step: "Property listed", detail: "Add property with units, specifications, and target rent" },
      { step: "Tenant onboarded", detail: "Lease terms set, deposit recorded, access granted" },
      { step: "Monthly rent collected", detail: "Invoices auto-generated, payments posted to ledger" },
      { step: "Renewal or exit", detail: "Lease renewal or vacancy handled with full history" },
    ],
    insights: ["Occupancy rate across portfolio by property type", "Rent collection rate and defaulters with ageing", "Maintenance cost per unit vs rental income"],
    aiFeatures: [
      "🤖 AI predicts which tenants are likely to not renew",
      "📊 Recommends rent revision based on market comps",
      "🔔 Alerts when maintenance costs are eroding net yield",
    ],
    proof: ["Auto rent invoicing eliminates manual follow-up", "Vacancy dashboard shows which units need attention first", "Owner reports give portfolio performance in one view"],
    highlights: [
      { label: "Rent Collection", value: "Auto", sub: "Invoices generated on lease schedule" },
      { label: "Vacancy Rate", value: "Monitored", sub: "Every empty unit flagged with days idle" },
      { label: "Net Yield", value: "Per Unit", sub: "Income minus expenses per property" },
    ],
    sampleDocs: ["Lease Agreement", "Rent Invoice", "Maintenance Request", "Deposit Receipt", "Owner Report"],
    users: "510+",
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
    users: "890+",
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

const TRUST_STATS = [
  { value: "18,000+", label: "Businesses on FinovaOS", icon: "🏢" },
  { value: "4.8 / 5", label: "Average rating", icon: "⭐" },
  { value: "99.9%", label: "Uptime SLA", icon: "🔒" },
  { value: "14 Types", label: "Business verticals", icon: "📊" },
];

export default function DemoPage() {
  const [selectedBiz, setSelectedBiz] = useState<DemoBusinessId | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "workflow" | "ai">("overview");

  const filteredBusinesses = useMemo(
    () => (activeCategory ? BUSINESSES.filter((b) => b.category === activeCategory) : BUSINESSES),
    [activeCategory]
  );

  const biz = useMemo(() => BUSINESSES.find((b) => b.id === selectedBiz) || null, [selectedBiz]);

  async function handleTryDashboard() {
    if (!biz || loading || !biz.demoAvailable) return;
    setLoading(true);
    setStoredDemoBusinessPreference(biz.liveBusinessType);
    try {
      const res = await fetch("/api/demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: biz.liveBusinessType }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser({
            ...data.user,
            businessType: data.company?.businessType || biz.liveBusinessType,
          });
        }
        setStoredDemoBusinessPreference(data.company?.businessType || biz.liveBusinessType);
        window.location.href = "/dashboard";
        return;
      }
    } catch {}
    setLoading(false);
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
        <p style={{ fontSize: 17, color: "rgba(255,255,255,.5)", lineHeight: 1.8, maxWidth: 620, margin: "0 auto 32px" }}>
          14 business verticals. Each demo opens a real live workspace configured for your industry — with AI insights, workflows, and actual data pre-loaded.
        </p>

        <div style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 999, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24" }}>Live now:</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>Trading</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>|</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>Wholesale</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>|</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>Distribution</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>|</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>Import / Export</span>
        </div>

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
                      background: entry.demoAvailable ? "rgba(16,185,129,.12)" : "rgba(245,158,11,.1)",
                      border: `1px solid ${entry.demoAvailable ? "rgba(16,185,129,.25)" : "rgba(245,158,11,.2)"}`,
                      color: entry.demoAvailable ? "#34d399" : "#fbbf24",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {entry.demoAvailable ? "Live Demo" : "Coming Soon"}
                  </span>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.25)", fontWeight: 700 }}>{entry.users} users</div>
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
                    {biz.users} users
                  </div>
                  <div style={{ padding: "4px 12px", borderRadius: 999, background: biz.demoAvailable ? "rgba(16,185,129,.14)" : "rgba(245,158,11,.12)", color: biz.demoAvailable ? "#34d399" : "#fbbf24", fontSize: 11, fontWeight: 800 }}>
                    {biz.demoAvailable ? "Live Demo Ready" : "Coming Soon"}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.7, maxWidth: 680 }}>{biz.description}</div>
              </div>
              <button
                className="launch-btn"
                onClick={handleTryDashboard}
                disabled={loading || !biz.demoAvailable}
                style={{
                  flexShrink: 0,
                  background: biz.demoAvailable ? biz.gradient : "rgba(255,255,255,.08)",
                  color: biz.demoAvailable ? "#fff" : "rgba(255,255,255,.45)",
                  borderRadius: 16,
                  padding: "14px 28px",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: loading || !biz.demoAvailable ? "not-allowed" : "pointer",
                  boxShadow: biz.demoAvailable ? `0 10px 28px ${biz.color}35` : "none",
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? "Opening..." : `Try ${biz.label} Live →`}
              </button>
            </div>

            {!biz.demoAvailable && (
              <div style={{ marginTop: -8, marginBottom: 20, padding: "14px 18px", borderRadius: 16, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.6 }}>
                This business preview is available, but its live demo workspace has not launched yet. For now, only Trading, Wholesale, Distribution, and Import / Export open into a real live demo.
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
                    <div style={{ fontSize: 12, fontWeight: 800, color: biz.color, marginBottom: 6 }}>🚀 Ready to see this live?</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.6, marginBottom: 14 }}>Click below to open the real dashboard pre-configured for {biz.label}. No sign-up required.</div>
                    <button
                      className="launch-btn"
                      onClick={handleTryDashboard}
                      disabled={loading}
                      style={{ width: "100%", background: biz.gradient, color: "#fff", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 800, boxShadow: `0 6px 20px ${biz.color}28` }}
                    >
                      {loading ? "Opening live workspace..." : `Open ${biz.label} Demo`}
                    </button>
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

            {/* Bottom CTA */}
              <div className="demo-bottom-cta" style={{ marginTop: 28, padding: "32px 32px", borderRadius: 24, background: `linear-gradient(135deg,${biz.color}12,rgba(255,255,255,.03))`, border: `1px solid ${biz.color}25`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 6 }}>
                  Ready to explore the {biz.label} dashboard?
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>
                  No sign-up. No credit card. Real features, real data, real AI. Click and the workspace opens instantly.
                </div>
              </div>
              <button
                className="launch-btn"
                onClick={handleTryDashboard}
                disabled={loading}
                style={{
                  background: biz.gradient,
                  color: "#fff",
                  borderRadius: 18,
                  padding: "16px 36px",
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: `0 14px 36px ${biz.color}35`,
                  letterSpacing: -0.3,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {loading ? "Opening live workspace..." : `Open ${biz.label} Live Demo →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
