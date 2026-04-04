"use client";
import Link from "next/link";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";

/* ─── Data ─── */
const INDUSTRIES = [
  {
    id: "trading",
    phase: 1,
    emoji: "🏪",
    label: "Trading",
    title: "Built for Trading Companies",
    subtitle: "From procurement to delivery — every dollar tracked.",
    color: "#818cf8",
    glow: "rgba(129,140,248,.22)",
    dim:  "rgba(129,140,248,.08)",
    border:"rgba(129,140,248,.3)",
    pain: "Spreadsheets can't keep up with daily purchase, sale, and payment volumes.",
    stats: [{ val:"87%", label:"Less reconciliation time" },{ val:"3×", label:"Faster month-end close" },{ val:"Zero", label:"Data entry errors" }],
    features:[
      { icon:"📦", title:"Purchase & Sales Ledger",   desc:"Real-time tracking of every invoice — supplier or customer." },
      { icon:"💳", title:"Payment Vouchers",           desc:"Record payments in seconds. Full audit trail." },
      { icon:"📊", title:"Profit by Product/Supplier", desc:"Know exactly which SKUs and vendors make you money." },
      { icon:"🏦", title:"Bank Reconciliation",        desc:"Import statements, review differences, and reconcile with confidence." },
      { icon:"🔁", title:"Recurring Transactions",     desc:"Set up monthly rent, utility, and salary entries once." },
      { icon:"📋", title:"Tax Summary Reports",        desc:"Compliance-ready output for your accountant or consultant." },
    ],
    quote: "We process 200+ invoices a day. FinovaOS handles it without breaking a sweat.",
    quoteName: "Thomas Miller", quoteTitle: "CEO, Miller Trading Co. — New York",
  },
  {
    id: "distribution",
    phase: 1,
    emoji: "🚚",
    label: "Distribution",
    title: "Distribution & Wholesale",
    subtitle: "Multi-route, multi-warehouse — one dashboard.",
    color: "#34d399",
    glow: "rgba(52,211,153,.22)",
    dim:  "rgba(52,211,153,.08)",
    border:"rgba(52,211,153,.3)",
    pain: "Managing depots, routes, and credit limits across dozens of customers is chaos without the right system.",
    stats: [{ val:"5×", label:"More branches, no extra staff" },{ val:"99%", label:"Delivery reconciliation accuracy" },{ val:"2 hrs", label:"Daily route settlement" }],
    features:[
      { icon:"🏭", title:"Multi-Warehouse Inventory",  desc:"Track stock across depots. Transfer between locations seamlessly." },
      { icon:"🚚", title:"Route-Based Sales Orders",   desc:"Assign orders to routes and vehicles. Settle daily at close." },
      { icon:"👤", title:"Customer Credit Limits",     desc:"Set and enforce credit limits. Stop over-exposure automatically." },
      { icon:"📉", title:"Stock Ageing Reports",       desc:"Identify slow-moving inventory before it becomes a write-off." },
      { icon:"🔗", title:"Multi-Branch Consolidation", desc:"Consolidate P&L across all depots with one click." },
      { icon:"📱", title:"Real-Time Stock Alerts",     desc:"Low stock notifications so you never run short mid-route." },
    ],
    quote: "Our 8 depot managers all work in the same system. Zero confusion, full visibility.",
    quoteName: "Ryan Kennedy", quoteTitle: "MD, Apex Distribution — Toronto",
  },
  {
    id: "manufacturing",
    phase: 2,
    emoji: "🏭",
    label: "Manufacturing",
    title: "Manufacturing & Production",
    subtitle: "Raw material to finished goods — costs under control.",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.22)",
    dim:  "rgba(251,191,36,.08)",
    border:"rgba(251,191,36,.3)",
    pain: "Without accurate costing, you don't know if each production run is actually profitable.",
    stats: [{ val:"18%", label:"Average margin improvement" },{ val:"40%", label:"Less waste via stock tracking" },{ val:"Daily", label:"Production cost visibility" }],
    features:[
      { icon:"⚙️", title:"Bill of Materials (BOM)",    desc:"Define raw material requirements per product. Auto-deduct on production." },
      { icon:"💰", title:"Production Cost Tracking",   desc:"Labour, overhead, and raw material costs per batch." },
      { icon:"📦", title:"Finished Goods Inventory",   desc:"Automatically add completed units to stock. Maintain valuation." },
      { icon:"📋", title:"Purchase Order Management",  desc:"Raise POs, track deliveries, match with GRN and invoice." },
      { icon:"🔍", title:"Variance Analysis",          desc:"Compare standard vs actual cost. Spot inefficiencies immediately." },
      { icon:"📊", title:"Profitability by Product",   desc:"Know your margin on every SKU before setting the sale price." },
    ],
    quote: "We finally know our real cost per unit. The margin improvement paid for the software in week one.",
    quoteName: "Benjamin Harper", quoteTitle: "CFO, Harper Group — Sydney",
  },
  {
    id: "services",
    phase: 1,
    emoji: "💼",
    label: "Services",
    title: "Service Businesses & Agencies",
    subtitle: "Project billing, expenses, and payroll — simplified.",
    color: "#f87171",
    glow: "rgba(248,113,113,.22)",
    dim:  "rgba(248,113,113,.08)",
    border:"rgba(248,113,113,.3)",
    pain: "Chasing clients for payments and manually tracking project expenses kills productivity.",
    stats: [{ val:"65%", label:"Faster invoice collection" },{ val:"Zero", label:"Missed billable expenses" },{ val:"1 day", label:"Monthly close (was 2 weeks)" }],
    features:[
      { icon:"🧾", title:"Professional Invoicing",     desc:"Branded invoices with WhatsApp delivery and clear payment tracking." },
      { icon:"🕐", title:"Flexible Billing Workflow",  desc:"Create quotations and invoices that fit recurring or project-based work." },
      { icon:"📊", title:"Expense Management",         desc:"Capture and categorise all project expenses. Attach receipts." },
      { icon:"👥", title:"Client Ledger",              desc:"Full receivables aging. Know exactly who owes what and for how long." },
      { icon:"💸", title:"Payroll Integration",        desc:"Record salaries, advances, and deductions in the ledger directly." },
      { icon:"📈", title:"Revenue Visibility",         desc:"Track billed work, receivables, and service performance over time." },
    ],
    quote: "Collections used to take 45 days on average. Now it's 18. The automated reminders changed everything.",
    quoteName: "Sarah Quinn", quoteTitle: "COO, Quinn Consultants — Singapore",
  },
  {
    id: "retail",
    phase: 2,
    emoji: "🛍️",
    label: "Retail",
    title: "Retail & Multi-Store",
    subtitle: "One system for every counter, every shift.",
    color: "#a78bfa",
    glow: "rgba(167,139,250,.22)",
    dim:  "rgba(167,139,250,.08)",
    border:"rgba(167,139,250,.3)",
    pain: "Separate systems for each store means no consolidated view and constant manual reconciliation.",
    stats: [{ val:"12 min", label:"Daily store reconciliation" },{ val:"100%", label:"Inventory accuracy" },{ val:"Real-time", label:"Cross-store stock visibility" }],
    features:[
      { icon:"🏪", title:"Multi-Store Management",     desc:"Run all stores from one login. Separate P&L per location." },
      { icon:"📱", title:"POS Integration",            desc:"Daily sales posting from any POS system. Shift-wise reconciliation." },
      { icon:"🔄", title:"Inter-Store Transfers",      desc:"Move stock between branches. Track in-transit inventory." },
      { icon:"💰", title:"Cash & Card Reconciliation", desc:"Match daily cash counts with system totals. Flag gaps instantly." },
      { icon:"📦", title:"Reorder Point Alerts",       desc:"Never stockout on fast-moving items. Auto-generate POs." },
      { icon:"📊", title:"Category-wise Profitability",desc:"Identify which product categories drive margin. Cut the rest." },
    ],
    quote: "I manage 6 stores from my phone now. Each store manager sees only their own data — exactly how I wanted it.",
    quoteName: "Fatima Malik", quoteTitle: "Director, Meridian Retail — Melbourne",
  },
  {
    id: "enterprise",
    phase: 1,
    emoji: "🏢",
    label: "Enterprise",
    title: "Group Companies & Holding Structures",
    subtitle: "Consolidate multiple entities without losing entity-level detail.",
    color: "#06b6d4",
    glow: "rgba(6,182,212,.22)",
    dim:  "rgba(6,182,212,.08)",
    border:"rgba(6,182,212,.3)",
    pain: "Running 3+ companies in separate spreadsheets makes consolidated reporting a month-long exercise.",
    stats: [{ val:"Unlimited", label:"Companies in one login" },{ val:"1 click", label:"Group consolidation" },{ val:"100%", label:"Entity data isolation" }],
    features:[
      { icon:"🏢", title:"Multi-Company Support",      desc:"Full data isolation between entities. One login, zero confusion." },
      { icon:"📊", title:"Consolidated Reporting",     desc:"Group P&L, Balance Sheet, and Cash Flow with one click." },
      { icon:"🔒", title:"Role-Based Access Control",  desc:"Define who sees what across companies, branches, and reports." },
      { icon:"🔗", title:"Multi-Company Visibility",    desc:"Keep entities separate while reviewing performance across the group." },
      { icon:"🛡️", title:"Audit Trails & Compliance",  desc:"Every transaction logged with user, timestamp, and IP address." },
      { icon:"🔌", title:"Enterprise Setup Support",   desc:"Plan custom rollouts, integrations, and controls for larger teams." },
    ],
    quote: "Three companies, one dashboard. Our leadership team finally has a cleaner consolidated view each month.",
    quoteName: "Sophie Laurent", quoteTitle: "Group CFO, Meridian Holdings — Paris",
  },
  {
    id: "restaurant",
    phase: 2,
    emoji: "🍽️",
    label: "Restaurant",
    title: "Restaurant & Food Business",
    subtitle: "Tables, kitchen, and cash — all in sync.",
    color: "#f97316",
    glow: "rgba(249,115,22,.22)",
    dim:  "rgba(249,115,22,.08)",
    border:"rgba(249,115,22,.3)",
    pain: "Lost orders, kitchen miscommunication, and end-of-day cash discrepancies drain profit every shift.",
    stats: [{ val:"30%", label:"Less food wastage" },{ val:"2×", label:"Faster table turnover" },{ val:"Zero", label:"Cash shortage at close" }],
    features:[
      { icon:"🍽️", title:"Table & Order Management",  desc:"Live floor plan. Open orders per table. Split bills instantly." },
      { icon:"👨‍🍳", title:"Kitchen Display System",     desc:"Orders flow directly to kitchen. No lost tickets, no delays." },
      { icon:"📋", title:"Menu Management",             desc:"Update prices, availability, and categories in real time." },
      { icon:"💰", title:"Daily Cash Register",         desc:"Cash, card, and digital payments reconciled at shift close." },
      { icon:"📦", title:"Ingredient Inventory",        desc:"Track raw materials. Know when to reorder before you run out." },
      { icon:"📊", title:"Sales & Revenue Reports",     desc:"Best-selling items, peak hours, and daily covers at a glance." },
    ],
    quote: "We cut our end-of-day reconciliation from 45 minutes to 5. The kitchen never misses an order now.",
    quoteName: "Ahmad Raza", quoteTitle: "Owner, Spice Route Restaurant — Dubai",
  },
  {
    id: "hospital",
    phase: 4,
    emoji: "🏥",
    label: "Hospital / Clinic",
    title: "Healthcare & Clinic Management",
    subtitle: "Patient care backed by airtight financials.",
    color: "#ef4444",
    glow: "rgba(239,68,68,.22)",
    dim:  "rgba(239,68,68,.08)",
    border:"rgba(239,68,68,.3)",
    pain: "Billing errors, pharmacy stock-outs, and manual patient records cost you revenue and reputation.",
    stats: [{ val:"95%", label:"Billing accuracy" },{ val:"60%", label:"Less stock wastage" },{ val:"Instant", label:"Patient ledger lookup" }],
    features:[
      { icon:"🏥", title:"Patient Management",          desc:"Full patient records, visit history, and billing in one place." },
      { icon:"💊", title:"Pharmacy & Drug Inventory",   desc:"Track medicines by batch, expiry, and usage. Auto-reorder alerts." },
      { icon:"🧾", title:"OPD & IPD Billing",           desc:"Itemised bills with insurance support and payment tracking." },
      { icon:"👨‍⚕️", title:"Doctor & Staff Scheduling",  desc:"Appointments, duty rosters, and OPD slots managed effortlessly." },
      { icon:"🔬", title:"Lab & Diagnostic Records",    desc:"Attach lab results to patient files. No lost reports." },
      { icon:"📊", title:"Revenue & Expense Reports",   desc:"Department-wise profitability and daily collections summary." },
    ],
    quote: "Our pharmacy stock-outs dropped to zero. The expiry tracking alone saved us thousands each month.",
    quoteName: "Dr. Sana Khalid", quoteTitle: "Medical Director, CareFirst Clinic — Lahore",
  },
  {
    id: "hotel",
    phase: 3,
    emoji: "🏨",
    label: "Hotel",
    title: "Hotel & Hospitality",
    subtitle: "Rooms, reservations, and revenue — fully managed.",
    color: "#06b6d4",
    glow: "rgba(6,182,212,.22)",
    dim:  "rgba(6,182,212,.08)",
    border:"rgba(6,182,212,.3)",
    pain: "Manual reservation logs, disconnected billing, and invisible room occupancy hurt both guests and profits.",
    stats: [{ val:"98%", label:"Reservation accuracy" },{ val:"3×", label:"Faster check-in/check-out" },{ val:"Live", label:"Occupancy dashboard" }],
    features:[
      { icon:"🛏️", title:"Room Management",            desc:"Live occupancy status per room. Color-coded floor view." },
      { icon:"📅", title:"Reservations & Bookings",     desc:"Track walk-ins and advance bookings. Avoid double-booking." },
      { icon:"🏨", title:"Front Desk Operations",       desc:"Fast check-in, check-out, and guest billing from one screen." },
      { icon:"🍽️", title:"Room Service & F&B",          desc:"Room service orders linked to guest bills. Auto-charge on checkout." },
      { icon:"🧹", title:"Housekeeping Management",     desc:"Assign and track cleaning tasks. Know which rooms are ready." },
      { icon:"📊", title:"Revenue Per Room Reports",    desc:"RevPAR, ADR, and occupancy trends to maximize pricing strategy." },
    ],
    quote: "Front desk is now paperless. Guests check in faster and we bill accurately every single time.",
    quoteName: "Hassan Mirza", quoteTitle: "GM, The Grand Hospitality — Islamabad",
  },
  {
    id: "pharmacy",
    phase: 3,
    emoji: "💊",
    label: "Pharmacy",
    title: "Pharmacy & Medical Store",
    subtitle: "Stock, prescriptions, and compliance — simplified.",
    color: "#34d399",
    glow: "rgba(52,211,153,.22)",
    dim:  "rgba(52,211,153,.08)",
    border:"rgba(52,211,153,.3)",
    pain: "Expired medicines on shelves, out-of-stock essentials, and manual prescription records are daily risks.",
    stats: [{ val:"100%", label:"Expiry compliance" },{ val:"40%", label:"Lower dead stock" },{ val:"Instant", label:"Drug lookup & billing" }],
    features:[
      { icon:"💊", title:"Drug Inventory Management",   desc:"Track each medicine by batch, expiry date, and reorder level." },
      { icon:"⚠️", title:"Expiry & Low-Stock Alerts",  desc:"Automatic warnings before medicines expire or run out." },
      { icon:"📋", title:"Prescription Management",     desc:"Record prescriptions digitally. Track dispensing history per patient." },
      { icon:"🧾", title:"Fast Point-of-Sale Billing",  desc:"Search, dispense, and bill in seconds. Cash and credit supported." },
      { icon:"🏭", title:"Supplier & Purchase Orders",  desc:"Raise POs to distributors. Match deliveries and invoices." },
      { icon:"📊", title:"Sales & Margin Reports",      desc:"Best-selling drugs, category-wise margin, and daily revenue." },
    ],
    quote: "We cleared Rs. 80,000 in near-expiry stock we didn't even know we had. The alerts paid for everything.",
    quoteName: "Zubair Ahmed", quoteTitle: "Owner, CityMed Pharmacy — Karachi",
  },
  {
    id: "construction",
    phase: 2,
    emoji: "🏗️",
    label: "Construction",
    title: "Construction & Contracting",
    subtitle: "Sites, budgets, and subcontractors — under control.",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.22)",
    dim:  "rgba(251,191,36,.08)",
    border:"rgba(251,191,36,.3)",
    pain: "Projects go over budget because material costs, labour, and subcontractor payments are tracked in silos.",
    stats: [{ val:"22%", label:"Average cost overrun reduction" },{ val:"Real-time", label:"Budget vs actual tracking" },{ val:"Zero", label:"Duplicate subcontractor payments" }],
    features:[
      { icon:"🏗️", title:"Project Management",          desc:"Track progress, budget, and timeline for every active site." },
      { icon:"📦", title:"Material Requisition",        desc:"Issue materials from central store to each site with full audit." },
      { icon:"👷", title:"Subcontractor Billing",        desc:"Record contract values, milestone payments, and balances due." },
      { icon:"📍", title:"Site Management",              desc:"Monitor workers, supervisors, and equipment across all sites." },
      { icon:"💰", title:"Budget vs Actual Reports",    desc:"Compare planned spend to real cost per project at any time." },
      { icon:"📋", title:"Purchase Orders & GRN",       desc:"Raise POs, receive materials, and match supplier invoices easily." },
    ],
    quote: "We caught a Rs. 2 million budget overrun at 60% completion — early enough to recover. That's priceless.",
    quoteName: "Tariq Mahmood", quoteTitle: "Director, BuildRight Contractors — Rawalpindi",
  },
  {
    id: "ecommerce",
    phase: 2,
    emoji: "🛒",
    label: "E-Commerce",
    title: "E-Commerce & Online Retail",
    subtitle: "Daraz, Amazon, website — one dashboard for all.",
    color: "#a78bfa",
    glow: "rgba(167,139,250,.22)",
    dim:  "rgba(167,139,250,.08)",
    border:"rgba(167,139,250,.3)",
    pain: "Selling on multiple platforms means fragmented orders, inventory discrepancies, and profit blind spots.",
    stats: [{ val:"All platforms", label:"In one dashboard" },{ val:"Real-time", label:"Order & inventory sync" },{ val:"4×", label:"Faster seller reporting" }],
    features:[
      { icon:"🛒", title:"Multi-Platform Orders",       desc:"Manage Daraz, Amazon, website, and WhatsApp orders in one place." },
      { icon:"📦", title:"Product Listings",            desc:"Track SKUs, prices, and stock across every sales channel." },
      { icon:"🔄", title:"Order Status Workflow",       desc:"Pending → Processing → Shipped → Delivered with one click." },
      { icon:"📊", title:"Platform Revenue Analytics", desc:"Compare which channel drives the most revenue and profit." },
      { icon:"📦", title:"Stock Sync Alerts",           desc:"Low-stock notifications before you oversell and disappoint buyers." },
      { icon:"💰", title:"Seller Profit Reports",       desc:"Deduct platform fees and shipping costs. See real net profit." },
    ],
    quote: "We were selling on 4 platforms with 4 spreadsheets. Now everything is in one place and we actually know our margin.",
    quoteName: "Nadia Farooq", quoteTitle: "Founder, StyleBox — Lahore",
  },
  {
    id: "agriculture",
    phase: 3,
    emoji: "🌾",
    label: "Agriculture",
    title: "Agriculture & Farming",
    subtitle: "Crops, livestock, and harvest — all tracked.",
    color: "#84cc16",
    glow: "rgba(132,204,22,.22)",
    dim:  "rgba(132,204,22,.08)",
    border:"rgba(132,204,22,.3)",
    pain: "Crop expenses, fertilizer costs, and harvest revenue are never consolidated — so profitability is guesswork.",
    stats: [{ val:"Full", label:"Season cost tracking" },{ val:"Real-time", label:"Field & livestock records" },{ val:"Clear", label:"Profit per crop" }],
    features:[
      { icon:"🌱", title:"Crop Management",             desc:"Track planting dates, field locations, and expected harvest yield." },
      { icon:"🐄", title:"Livestock Records",           desc:"Maintain head counts, breeds, weights, and health records." },
      { icon:"🌾", title:"Harvest Tracking",            desc:"Record quantity harvested, sale price, and buyer per crop cycle." },
      { icon:"🏞️", title:"Field Management",            desc:"Manage field areas, soil types, and irrigation per plot." },
      { icon:"💰", title:"Season Expense Tracking",    desc:"Fertilizer, labour, water, and seed costs tracked per field." },
      { icon:"📊", title:"Profit per Crop Reports",    desc:"Compare revenue against all direct costs. Know what to grow more." },
    ],
    quote: "First time in 10 years I know exactly how much each crop made me — not just what I sold.",
    quoteName: "Muhammad Arif", quoteTitle: "Farm Owner — Faisalabad",
  },
  {
    id: "transport",
    phase: 3,
    emoji: "🚛",
    label: "Transport & Logistics",
    title: "Transport & Fleet Management",
    subtitle: "Trips, drivers, and fuel — one ledger.",
    color: "#64748b",
    glow: "rgba(100,116,139,.22)",
    dim:  "rgba(100,116,139,.08)",
    border:"rgba(100,116,139,.3)",
    pain: "Without structured trip and expense records, you can't tell if each vehicle is actually profitable.",
    stats: [{ val:"Per-vehicle", label:"Profit & loss tracking" },{ val:"100%", label:"Trip expense coverage" },{ val:"Live", label:"Fleet utilization view" }],
    features:[
      { icon:"🚛", title:"Vehicle Management",          desc:"Full records per vehicle — trips, fuel, maintenance, and cost." },
      { icon:"🗺️", title:"Trip & Freight Tracking",    desc:"Log trips with origin, destination, cargo, and revenue." },
      { icon:"⛽", title:"Fuel & Expense Log",          desc:"Daily fuel receipts, toll, and driver allowances tracked per trip." },
      { icon:"🔧", title:"Maintenance Scheduling",      desc:"Service reminders and repair history per vehicle." },
      { icon:"👤", title:"Driver Management",           desc:"Driver records, advance payments, and settlement tracking." },
      { icon:"📊", title:"Fleet Profitability Reports", desc:"Revenue minus all costs per vehicle. Know which trucks earn." },
    ],
    quote: "I run 14 trucks. For the first time I know which 3 are losing money — and why.",
    quoteName: "Saleem Baig", quoteTitle: "Director, FastMove Logistics — Multan",
  },
  {
    id: "salon",
    phase: 3,
    emoji: "💇",
    label: "Salon & Spa",
    title: "Salon, Spa & Beauty Business",
    subtitle: "Appointments, staff, and daily cash — sorted.",
    color: "#ec4899",
    glow: "rgba(236,72,153,.22)",
    dim:  "rgba(236,72,153,.08)",
    border:"rgba(236,72,153,.3)",
    pain: "No-shows, cash shortages, and untracked staff commissions eat into beauty business profits every week.",
    stats: [{ val:"50%", label:"Fewer no-shows with reminders" },{ val:"Accurate", label:"Staff commission tracking" },{ val:"Daily", label:"Revenue per service report" }],
    features:[
      { icon:"📅", title:"Appointment Booking",         desc:"Book, reschedule, and track appointments per stylist or chair." },
      { icon:"💇", title:"Service & Package Management",desc:"Define services, packages, and duration. Upsell with ease." },
      { icon:"💰", title:"Daily Cash Register",         desc:"End-of-day cash and card totals. Commission auto-calculated." },
      { icon:"👤", title:"Staff Performance Tracking",  desc:"Revenue per staff, tips, and attendance in one report." },
      { icon:"📦", title:"Product Inventory",           desc:"Track shampoos, dyes, and retail products. Reorder alerts." },
      { icon:"📊", title:"Revenue by Service Reports",  desc:"Know your most profitable treatments and peak hours." },
    ],
    quote: "My front desk used to lose cash every week. Now the daily report catches every rupee.",
    quoteName: "Aisha Siddiqui", quoteTitle: "Owner, Glow Beauty Salon — Karachi",
  },
  {
    id: "school",
    phase: 4,
    emoji: "🏫",
    label: "School & Education",
    title: "Schools, Academies & Institutes",
    subtitle: "Students, fees, and results — all in one system.",
    color: "#818cf8",
    glow: "rgba(129,140,248,.22)",
    dim:  "rgba(129,140,248,.08)",
    border:"rgba(129,140,248,.3)",
    pain: "Fee defaulters go unnoticed, exam records are scattered, and staff payroll takes days to reconcile.",
    stats: [{ val:"90%", label:"Fee collection on time" },{ val:"Zero", label:"Lost exam records" },{ val:"1 hr", label:"Monthly payroll closure" }],
    features:[
      { icon:"🎓", title:"Student Management",          desc:"Complete student profiles, class assignments, and academic history." },
      { icon:"💰", title:"Fee Collection & Ledger",     desc:"Fee schedules, collection tracking, and defaulter alerts." },
      { icon:"📝", title:"Exam & Result Management",    desc:"Enter marks, auto-calculate grades, and generate report cards." },
      { icon:"📅", title:"Timetable & Scheduling",      desc:"Manage class periods, teacher assignments, and room allocation." },
      { icon:"👨‍🏫", title:"Staff & Payroll Records",    desc:"Staff salaries, attendance, advances, and deductions." },
      { icon:"📊", title:"Academic Performance Reports",desc:"Class-wise and student-wise performance analysis." },
    ],
    quote: "Fee collection improved by 35% after we switched. Parents get reminders automatically now.",
    quoteName: "Principal Nasreen", quoteTitle: "Bright Futures Academy — Lahore",
  },
  {
    id: "ngo",
    phase: 4,
    emoji: "🤝",
    label: "NGO & Non-Profit",
    title: "NGOs & Non-Profit Organizations",
    subtitle: "Donor funds, projects, and compliance — transparent.",
    color: "#34d399",
    glow: "rgba(52,211,153,.22)",
    dim:  "rgba(52,211,153,.08)",
    border:"rgba(52,211,153,.3)",
    pain: "Donor reporting takes weeks because grant funds, project expenses, and overheads are mixed together.",
    stats: [{ val:"Fund-wise", label:"Expense tracking" },{ val:"Instant", label:"Donor reports" },{ val:"100%", label:"Audit readiness" }],
    features:[
      { icon:"🤝", title:"Donor Management",            desc:"Track donors, pledge amounts, and receipt history." },
      { icon:"🏦", title:"Grant & Fund Accounting",     desc:"Separate ledgers per grant or project. No fund mixing." },
      { icon:"📋", title:"Project Expense Tracking",    desc:"Assign every expense to a project and cost center." },
      { icon:"📊", title:"Donor Impact Reports",        desc:"Generate clear, transparent reports for each donor or funder." },
      { icon:"✅", title:"Compliance & Audit Trails",   desc:"Every transaction logged with user, time, and purpose." },
      { icon:"💰", title:"Budget Utilization Reports",  desc:"Track how much of each grant has been spent vs. remaining." },
    ],
    quote: "Our annual donor report used to take 3 weeks. Now it takes an afternoon. Our auditors are impressed.",
    quoteName: "Amara Singh", quoteTitle: "CFO, HopeForward Foundation — Nairobi",
  },
  {
    id: "real_estate",
    phase: 3,
    emoji: "🏠",
    label: "Real Estate",
    title: "Real Estate & Property Management",
    subtitle: "Properties, tenants, and rent — effortlessly managed.",
    color: "#f59e0b",
    glow: "rgba(245,158,11,.22)",
    dim:  "rgba(245,158,11,.08)",
    border:"rgba(245,158,11,.3)",
    pain: "Scattered rent records, missed maintenance, and manual payment follow-ups waste hours every month.",
    stats: [{ val:"Zero", label:"Missed rent payments" },{ val:"Live", label:"Occupancy & vacancy view" },{ val:"Full", label:"Property-wise P&L" }],
    features:[
      { icon:"🏠", title:"Property Management",         desc:"Full records per unit — type, size, value, and location." },
      { icon:"👤", title:"Tenant Management",           desc:"Lease terms, contact info, deposit, and rent history per tenant." },
      { icon:"💰", title:"Rent Collection Tracking",    desc:"Monthly rent dues, receipts, and defaulter alerts automatically." },
      { icon:"🔧", title:"Maintenance Requests",        desc:"Log and track repairs per property. Assign to vendors." },
      { icon:"📊", title:"Property Revenue Reports",    desc:"Income vs expenses per property. Know your best-performing assets." },
      { icon:"📋", title:"Lease Renewal Alerts",        desc:"Never miss a lease expiry. Get reminded before it's too late." },
    ],
    quote: "I manage 40 rental units. Before this, I had 40 WhatsApp chats for rent. Now it's all in one place.",
    quoteName: "Imran Sheikh", quoteTitle: "Property Investor — Islamabad",
  },

  // ── AUTOMOTIVE ──────────────────────────────────────────────
  {
    id: "automotive",
    phase: 3,
    emoji: "🚗",
    label: "Automotive",
    title: "Car Showroom, Workshop & Rental",
    subtitle: "Vehicle sales, service jobs, spare parts — all in one platform.",
    color: "#0ea5e9",
    glow: "rgba(14,165,233,.22)",
    dim:  "rgba(14,165,233,.08)",
    border:"rgba(14,165,233,.3)",
    pain: "Tracking vehicle stock, workshop job cards, spare parts, and customer payments across separate systems is costing you sales.",
    stats: [{ val:"100%", label:"Job card accuracy" },{ val:"Live", label:"Vehicle stock view" },{ val:"Zero", label:"Parts shrinkage" }],
    features:[
      { icon:"🚗", title:"Vehicle Stock Management",   desc:"Full records per vehicle — make, model, year, cost, and status." },
      { icon:"🔧", title:"Workshop Job Cards",         desc:"Create jobs, assign mechanics, track parts used and labour time." },
      { icon:"⚙️", title:"Spare Parts Inventory",     desc:"Barcode-tracked parts stock with low-stock alerts and reorder." },
      { icon:"💳", title:"Integrated Billing",         desc:"Invoice vehicle sales, service jobs, and parts in one place." },
      { icon:"🚙", title:"Car Rental Management",      desc:"Booking calendar, agreements, mileage tracking, and fuel log." },
      { icon:"📊", title:"Profit by Job / Vehicle",   desc:"Know your margin on every sale and every repair job." },
    ],
    quote: "We run a showroom and workshop together. FinovaOS ties everything — from test drive to final invoice.",
    quoteName: "Khalid Motors", quoteTitle: "Lahore, Pakistan",
  },

  // ── MEDIA & ADVERTISING ─────────────────────────────────────
  {
    id: "advertising",
    phase: 3,
    emoji: "📢",
    label: "Media & Advertising",
    title: "Advertising & Digital Marketing Agencies",
    subtitle: "Client billing, campaign budgets, and media costs — simplified.",
    color: "#f43f5e",
    glow: "rgba(244,63,94,.22)",
    dim:  "rgba(244,63,94,.08)",
    border:"rgba(244,63,94,.3)",
    pain: "Agency finances are complex — retainers, project billing, media spend recovery, and client-wise P&L all in separate spreadsheets.",
    stats: [{ val:"3×", label:"Faster client invoicing" },{ val:"100%", label:"Media cost recovery" },{ val:"Live", label:"Client profitability" }],
    features:[
      { icon:"📢", title:"Campaign & Client Billing",  desc:"Bill per campaign, retainer, or milestone. Full audit trail." },
      { icon:"💰", title:"Media Cost Tracking",        desc:"Track TV, digital, print, and outdoor spend per client." },
      { icon:"📄", title:"Quotation & Proposals",      desc:"Send branded quotes. Convert to invoice with one click." },
      { icon:"👥", title:"Client-wise P&L",            desc:"See revenue, costs, and margin per client or campaign." },
      { icon:"🖨️", title:"Print Job Management",       desc:"Paper stock, ink, print orders, delivery — fully tracked." },
      { icon:"📊", title:"Agency Revenue Reports",     desc:"Retainer vs project vs commission — broken down clearly." },
    ],
    quote: "We handle 30+ clients. FinovaOS gives us real-time visibility on which accounts are actually profitable.",
    quoteName: "Sana Digital", quoteTitle: "Digital Marketing Agency — Karachi",
  },

  // ── SaaS / ISP ──────────────────────────────────────────────
  {
    id: "saas",
    phase: 3,
    emoji: "☁️",
    label: "SaaS & ISP",
    title: "SaaS Companies & Internet Service Providers",
    subtitle: "Recurring billing, MRR tracking, and subscriber management.",
    color: "#6366f1",
    glow: "rgba(99,102,241,.22)",
    dim:  "rgba(99,102,241,.08)",
    border:"rgba(99,102,241,.3)",
    pain: "Manual subscription tracking, missed renewals, and no visibility into MRR growth.",
    stats: [{ val:"Zero", label:"Missed renewals" },{ val:"Live", label:"MRR & ARR dashboard" },{ val:"Auto", label:"Recurring billing" }],
    features:[
      { icon:"☁️", title:"Subscription Management",   desc:"Plans, subscribers, renewal dates, and upgrade tracking." },
      { icon:"📈", title:"MRR / ARR Dashboard",        desc:"Monthly and annual recurring revenue at a glance." },
      { icon:"🧾", title:"Automated Recurring Bills",  desc:"Auto-generate invoices on renewal. Send via email." },
      { icon:"🌐", title:"ISP Connection Tracking",    desc:"Customer connections, packages, and bandwidth allocation." },
      { icon:"💳", title:"Payment Collections",        desc:"Track paid, unpaid, and overdue subscribers instantly." },
      { icon:"📊", title:"Churn & Growth Reports",     desc:"Understand where you're gaining and losing customers." },
    ],
    quote: "Running an ISP with 2,000 customers — FinovaOS handles all monthly billing automatically.",
    quoteName: "NetSpeed ISP", quoteTitle: "Faisalabad, Pakistan",
  },

  // ── SOLAR & ENERGY ──────────────────────────────────────────
  {
    id: "solar",
    phase: 4,
    emoji: "☀️",
    label: "Solar & Energy",
    title: "Solar Companies & Energy Businesses",
    subtitle: "Projects, equipment stock, AMC contracts — fully managed.",
    color: "#f59e0b",
    glow: "rgba(245,158,11,.22)",
    dim:  "rgba(245,158,11,.08)",
    border:"rgba(245,158,11,.3)",
    pain: "Project costing is guesswork — panels, inverters, labour, and freight costs tracked in separate sheets.",
    stats: [{ val:"Accurate", label:"Project cost tracking" },{ val:"Live", label:"Equipment stock levels" },{ val:"Zero", label:"Missed AMC renewals" }],
    features:[
      { icon:"☀️", title:"Solar Project Management",  desc:"Track each installation — equipment, labour, and milestones." },
      { icon:"📦", title:"Equipment Stock Control",   desc:"Panels, inverters, batteries — barcode tracked with reorder alerts." },
      { icon:"📄", title:"Quotation to Invoice",       desc:"Site survey → quote → project → invoice in one workflow." },
      { icon:"📅", title:"AMC Contract Tracking",     desc:"Maintenance contracts, service schedules, and renewal alerts." },
      { icon:"💰", title:"Project Profitability",      desc:"Know your margin on every project before and after completion." },
      { icon:"🛒", title:"Purchase Orders",            desc:"Raise POs for panels and equipment. Match with GRN on delivery." },
    ],
    quote: "We do 50 installations a month. FinovaOS tracks every panel, every wire, and every rupee.",
    quoteName: "SunTech Solar", quoteTitle: "Islamabad, Pakistan",
  },

  // ── IMPORT / EXPORT ─────────────────────────────────────────
  {
    id: "import",
    phase: 1,
    emoji: "🚢",
    label: "Import / Export",
    title: "Import, Export & Clearing Agents",
    subtitle: "Shipments, LC/TT, customs costs, and local sales — all in one ledger.",
    color: "#0891b2",
    glow: "rgba(8,145,178,.22)",
    dim:  "rgba(8,145,178,.08)",
    border:"rgba(8,145,178,.3)",
    pain: "Import costing is scattered across emails — freight, customs duty, clearing charges, and port fees all end up in one wrong number.",
    stats: [{ val:"Accurate", label:"Landed cost per shipment" },{ val:"Live", label:"Goods in transit visibility" },{ val:"Full", label:"Duty & levy tracking" }],
    features:[
      { icon:"🚢", title:"Shipment Tracking",          desc:"Log each shipment — origin, ETA, contents, and status." },
      { icon:"🏦", title:"LC / TT Management",         desc:"Track letters of credit and telegraphic transfers per order." },
      { icon:"🛃", title:"Customs & Duty Costing",     desc:"Add duty, freight, insurance, and clearing to landed cost." },
      { icon:"📦", title:"Inventory on Arrival",       desc:"GRN-based stock update when goods clear customs." },
      { icon:"💱", title:"Multi-Currency Invoicing",   desc:"Invoice in USD, EUR, GBP — convert at real-time rates." },
      { icon:"📊", title:"Import Cost Reports",        desc:"Landed cost vs selling price — instant margin view." },
    ],
    quote: "Every container has 20+ cost lines. FinovaOS captures every one — our landed cost is finally accurate.",
    quoteName: "ZamZam Imports", quoteTitle: "Karachi, Pakistan",
  },

  // ── EVENT MANAGEMENT ────────────────────────────────────────
  {
    id: "events",
    phase: 3,
    emoji: "🎪",
    label: "Event Management",
    title: "Event Planners & Wedding Organizers",
    subtitle: "Bookings, vendor payments, budgets, and client billing — organized.",
    color: "#c026d3",
    glow: "rgba(192,38,211,.22)",
    dim:  "rgba(192,38,211,.08)",
    border:"rgba(192,38,211,.3)",
    pain: "Every event has 15 vendors, a client advance, and 50 expense lines — impossible to track profit without a proper system.",
    stats: [{ val:"Live", label:"Event budget vs actual" },{ val:"Zero", label:"Missed vendor payments" },{ val:"Full", label:"Client billing history" }],
    features:[
      { icon:"🎪", title:"Event Booking Management",  desc:"Client details, event date, venue, and package — all recorded." },
      { icon:"🤝", title:"Vendor Management",         desc:"Caterers, decorators, photographers — payments and contracts tracked." },
      { icon:"💰", title:"Event Budget vs Actual",    desc:"Set a budget per event. Track every cost in real time." },
      { icon:"💳", title:"Client Advance Tracking",   desc:"Record advance payments. Issue final invoice on event completion." },
      { icon:"📄", title:"Quotation & Proposals",     desc:"Send detailed quotes. Convert to booking with client signature." },
      { icon:"📊", title:"Event Profitability",       desc:"Revenue vs cost per event — know which events make money." },
    ],
    quote: "We planned 120 weddings last year. FinovaOS kept every vendor, every budget, and every client in order.",
    quoteName: "Royal Events", quoteTitle: "Lahore, Pakistan",
  },

  // ── REPAIR & MAINTENANCE ─────────────────────────────────────
  {
    id: "repair",
    phase: 3,
    emoji: "🔧",
    label: "Repair & Maintenance",
    title: "Mobile Repair, Computer Repair & Equipment Maintenance",
    subtitle: "Job cards, spare parts, warranties, and AMC contracts — all managed.",
    color: "#7c3aed",
    glow: "rgba(124,58,237,.22)",
    dim:  "rgba(124,58,237,.08)",
    border:"rgba(124,58,237,.3)",
    pain: "Paper job cards get lost, parts go missing, and customers dispute warranties without a proper tracking system.",
    stats: [{ val:"100%", label:"Job card traceability" },{ val:"Zero", label:"Parts shrinkage" },{ val:"Live", label:"Revenue per technician" }],
    features:[
      { icon:"📲", title:"Job Card Management",        desc:"Log every repair — device, fault, technician, parts, and status." },
      { icon:"⚙️", title:"Spare Parts Inventory",      desc:"Track parts in stock. Deduct on use. Alert on low levels." },
      { icon:"✅", title:"Warranty Tracking",           desc:"Record warranty period. Flag warranty jobs vs chargeable." },
      { icon:"📅", title:"AMC Contracts",              desc:"Annual maintenance contracts — scheduled visits and billing." },
      { icon:"💳", title:"Customer Billing",           desc:"Invoice service charge + parts. Accept advance on delivery." },
      { icon:"📊", title:"Technician Performance",     desc:"Jobs completed, revenue generated, and parts used per tech." },
    ],
    quote: "50 phones a day through my shop. FinovaOS tracks every job, every part, every payment automatically.",
    quoteName: "TechFix Mobile", quoteTitle: "Lahore, Pakistan",
  },

  // ── FRANCHISE ───────────────────────────────────────────────
  {
    id: "franchise",
    phase: 4,
    emoji: "🏪",
    label: "Franchise",
    title: "Franchise & Chain Business",
    subtitle: "Multi-outlet management — consolidated view, royalty tracking, branch reports.",
    color: "#7c3aed",
    glow: "rgba(124,58,237,.22)",
    dim:  "rgba(124,58,237,.08)",
    border:"rgba(124,58,237,.3)",
    pain: "Running 5+ outlets without consolidated reports means guessing which branches are performing.",
    stats: [{ val:"Live", label:"All outlet performance" },{ val:"Auto", label:"Royalty calculation" },{ val:"One", label:"Dashboard for all branches" }],
    features:[
      { icon:"🏪", title:"Multi-Outlet Management",   desc:"Each outlet runs independently — consolidated at HQ level." },
      { icon:"🏅", title:"Royalty Tracking",           desc:"Calculate royalty per outlet by revenue. Bill automatically." },
      { icon:"📊", title:"Branch Comparison Reports", desc:"Side-by-side revenue, cost, and margin across all outlets." },
      { icon:"🔄", title:"Inter-Branch Stock Transfer",desc:"Move inventory between outlets. Full transfer audit trail." },
      { icon:"💳", title:"Centralized Billing",        desc:"Raise invoices from HQ or outlet level. Both tracked together." },
      { icon:"🔒", title:"Role-Based Access",          desc:"Outlet managers see only their data. HQ sees everything." },
    ],
    quote: "12 franchise outlets — I check one dashboard every morning and know exactly how each one is doing.",
    quoteName: "Spice Chain Foods", quoteTitle: "Multi-City, Pakistan",
  },
];

const TAB_GROUPS = [
  { label: "Commerce",     ids: ["trading","distribution","import","ecommerce"] },
  { label: "Production",   ids: ["manufacturing","agriculture"] },
  { label: "F&B",          ids: ["restaurant","hotel"] },
  { label: "Healthcare",   ids: ["hospital","pharmacy"] },
  { label: "Retail",       ids: ["retail","services","enterprise"] },
  { label: "Build",        ids: ["construction","real_estate"] },
  { label: "Tech & Media", ids: ["saas","advertising"] },
  { label: "Lifestyle",    ids: ["salon","school","ngo"] },
  { label: "Transport",    ids: ["transport","automotive","repair"] },
  { label: "Specialty",    ids: ["solar","events","franchise"] },
];

const CROSS_FEATURES = [
  { icon:"🌍", title:"Global-Ready",             desc:"VAT/GST-friendly reports, multi-region formats, and localized settings." },
  { icon:"🌐", title:"Multi-Currency",           desc:"Transact in USD, EUR, AED, GBP and more — real-time FX support." },
  { icon:"⚡", title:"10-Minute Setup",          desc:"Create your company, add users, and start posting — today." },
  { icon:"📱", title:"Mobile Friendly",          desc:"Full functionality on any device. No app download required." },
  { icon:"🔒", title:"Enterprise Security",      desc:"TLS 1.3, data isolation, role-based access, audit logs." },
  { icon:"📞", title:"Global Support Team",      desc:"Responsive support across time zones for your business context." },
];

/* ─── Hooks ─── */
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

/* ─── Small components ─── */
function Check({ color }: { color: string }) {
  return (
    <div style={{ width:20, height:20, borderRadius:"50%", background:`${color}18`, border:`1px solid ${color}35`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width="10" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}

/* ─── Industry card ─── */
function IndustrySection({ ind, index, isLive }: { ind: typeof INDUSTRIES[0]; index: number; isLive: boolean }) {
  const [ref, visible] = useVisible(0.08);
  const [hoveredFeat, setHoveredFeat] = useState<number | null>(null);
  const isEven = index % 2 === 0;
  const comingSoon = !isLive;

  return (
    <section ref={ref} id={ind.id} style={{
      padding:"100px 24px",
      background: index % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)",
      borderTop:"1px solid rgba(255,255,255,.05)",
      position:"relative", overflow:"hidden",
    }}>
      {/* Ambient orb */}
      <div style={{
        position:"absolute", width:500, height:500, borderRadius:"50%",
        background:`radial-gradient(circle,${ind.glow},transparent 65%)`,
        top:isEven?-100:"auto", bottom:isEven?"auto":-100,
        right:isEven?-80:"auto", left:isEven?"auto":-80,
        pointerEvents:"none",
      }}/>

      <div style={{ maxWidth:1160, margin:"0 auto", position:"relative" }}>
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 1fr", gap:72, alignItems:"start",
          direction: isEven ? "ltr" : "rtl",
        }}>

          {/* ── Left: copy ── */}
          <div style={{ direction:"ltr" }}>
            {/* Industry tag */}
            <div style={{
              opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(20px)",
              transition:"all .5s ease",
            }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:20, flexWrap:"wrap" }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", borderRadius:24,
                  background:ind.dim, border:`1px solid ${ind.border}`,
                  fontSize:11, fontWeight:700, color:ind.color, letterSpacing:".09em", textTransform:"uppercase" }}>
                  <span style={{ fontSize:16 }}>{ind.emoji}</span>
                  {ind.label}
                </div>
                {comingSoon && (
                  <div style={{
                    display:"inline-flex", alignItems:"center", gap:5,
                    padding:"4px 10px", borderRadius:20,
                    background:"rgba(251,191,36,.1)", border:"1px solid rgba(251,191,36,.35)",
                    fontSize:10, fontWeight:700, color:"#fbbf24", letterSpacing:".07em", textTransform:"uppercase",
                    animation:"floatBadge 3s ease-in-out infinite",
                  }}>
                    ⏳ Coming Soon
                  </div>
                )}
                {!comingSoon && (
                  <div style={{
                    display:"inline-flex", alignItems:"center", gap:5,
                    padding:"4px 10px", borderRadius:20,
                    background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.35)",
                    fontSize:10, fontWeight:700, color:"#34d399", letterSpacing:".07em", textTransform:"uppercase",
                  }}>
                    🟢 Live Now
                  </div>
                )}
              </div>
            </div>

            <h2 style={{
              fontFamily:"'Lora',serif", fontSize:"clamp(26px,3vw,40px)",
              fontWeight:700, color:"white", letterSpacing:"-1px", lineHeight:1.15, marginBottom:12,
              opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(20px)",
              transition:"all .55s ease .06s",
            }}>
              {ind.title}
            </h2>

            <p style={{
              fontSize:15.5, color:ind.color, fontWeight:600, marginBottom:14,
              opacity:visible?1:0, transition:"opacity .5s ease .1s",
            }}>
              {ind.subtitle}
            </p>

            {/* Pain point */}
            <div style={{
              padding:"14px 18px", borderRadius:12,
              background:"rgba(239,68,68,.06)", border:"1px solid rgba(239,68,68,.18)",
              fontSize:13, color:"rgba(255,255,255,.5)", lineHeight:1.7,
              marginBottom:28, display:"flex", alignItems:"flex-start", gap:10,
              opacity:visible?1:0, transition:"opacity .5s ease .15s",
            }}>
              <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
              <span><strong style={{ color:"rgba(255,255,255,.7)" }}>The problem: </strong>{ind.pain}</span>
            </div>

            {/* Stats */}
            <div style={{
              display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:32,
              opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(16px)",
              transition:"all .55s ease .2s",
            }}>
              {ind.stats.map(({ val, label }) => (
                <div key={label} style={{
                  borderRadius:14, padding:"16px 12px", textAlign:"center",
                  background:ind.dim, border:`1px solid ${ind.border}`,
                }}>
                  <div style={{ fontFamily:"'Lora',serif", fontSize:22, fontWeight:700, color:ind.color, letterSpacing:"-.5px" }}>{val}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", fontWeight:500, marginTop:3, lineHeight:1.4 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div style={{
              padding:"18px 20px", borderRadius:16,
              background:"rgba(255,255,255,.03)", border:`1.5px solid ${ind.border}`,
              opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(14px)",
              transition:"all .55s ease .28s",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", top:10, right:16, fontSize:42, color:ind.color, opacity:.08, fontFamily:"Georgia,serif", userSelect:"none" }}>&quot;</div>
              <p style={{ fontSize:13.5, color:"rgba(255,255,255,.65)", lineHeight:1.75, fontStyle:"italic", marginBottom:12 }}>
                &quot;{ind.quote}&quot;
              </p>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:"50%",
                  background:`linear-gradient(135deg,${ind.color}66,${ind.color}33)`,
                  border:`1.5px solid ${ind.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:13, fontWeight:800, color:ind.color }}>
                  {ind.quoteName[0]}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.85)" }}>{ind.quoteName}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:1 }}>{ind.quoteTitle}</div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop:28,
              opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(14px)",
              transition:"all .5s ease .35s",
            }}>
              {comingSoon ? (
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <Link href={`/contact?subject=notify-${ind.id}`} style={{
                    display:"inline-flex", alignItems:"center", gap:8,
                    padding:"13px 28px", borderRadius:13,
                    background:"rgba(251,191,36,.12)", border:"1.5px solid rgba(251,191,36,.4)",
                    color:"#fbbf24", fontWeight:800, fontSize:14,
                    textDecoration:"none", fontFamily:"inherit", transition:"all .25s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background="rgba(251,191,36,.2)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="rgba(251,191,36,.12)"; e.currentTarget.style.transform="translateY(0)"; }}
                  >
                    🔔 Notify me when live
                  </Link>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>Phase {ind.phase} — Coming Soon</span>
                </div>
              ) : (
                <Link href={`/onboarding/signup/starter?businessType=${ind.id}`} style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  padding:"13px 28px", borderRadius:13,
                  background:`linear-gradient(135deg,${ind.color},${ind.color}cc)`,
                  color:"#0f172a", fontWeight:800, fontSize:14,
                  textDecoration:"none", fontFamily:"inherit",
                  boxShadow:`0 6px 24px ${ind.glow}`, transition:"all .25s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 10px 32px ${ind.glow}`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=`0 6px 24px ${ind.glow}`; }}
                >
                  Get Started — {ind.label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              )}
            </div>
          </div>

          {/* ── Right: feature cards ── */}
          <div style={{ direction:"ltr" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {ind.features.map((f, fi) => (
                <div
                  key={f.title}
                  onMouseEnter={() => setHoveredFeat(fi)}
                  onMouseLeave={() => setHoveredFeat(null)}
                  style={{
                    borderRadius:16, padding:"18px",
                    background: hoveredFeat===fi ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.03)",
                    border:`1.5px solid ${hoveredFeat===fi ? ind.border : "rgba(255,255,255,.07)"}`,
                    backdropFilter:"blur(16px)",
                    transition:"all .3s ease",
                    opacity:visible?1:0,
                    transform:visible ? hoveredFeat===fi?"translateY(-4px)":"translateY(0)" : "translateY(24px)",
                    transitionDelay:visible?`${fi*60}ms`:"0ms",
                    boxShadow:hoveredFeat===fi?`0 12px 32px rgba(0,0,0,.25), 0 0 0 1px ${ind.color}20`:"none",
                    position:"relative", overflow:"hidden",
                    cursor:"default",
                  }}
                >
                  {hoveredFeat===fi && (
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
                      background:`linear-gradient(90deg,transparent,${ind.color},transparent)`,
                      borderRadius:"16px 16px 0 0" }}/>
                  )}
                  <div style={{ fontSize:22, marginBottom:10 }}>{f.icon}</div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:"rgba(255,255,255,.88)", marginBottom:6, lineHeight:1.3 }}>{f.title}</div>
                  <div style={{ fontSize:12.5, color:"rgba(255,255,255,.38)", lineHeight:1.65 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─── Page ─── */
export default function SolutionsPage() {
  const [activeTab, setActiveTab] = useState("trading");
  const [heroRef, heroVisible] = useVisible(0.2);
  const [crossRef, crossVisible] = useVisible(0.1);
  const [ctaRef, ctaVisible] = useVisible(0.1);
  const [crossHover, setCrossHover] = useState<number | null>(null);
  const [liveTypes, setLiveTypes] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetch("/api/public/business-module-status")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.enabledTypes) setLiveTypes(new Set(d.enabledTypes)); })
      .catch(() => {});
  }, []);

  // Determine if an industry is live (fallback: phase 1 is live, others are coming soon)
  const isLive = (ind: typeof INDUSTRIES[0]) => {
    if (liveTypes) return liveTypes.has(ind.id);
    return ind.phase === 1; // default before API responds
  };

  const scrollTo = (id: string) => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  return (
    <>
      <Head>
        <title>Solutions – FinovaOS</title>
        <meta name="description" content="Industry-specific business solutions for trading, distribution, manufacturing, retail, restaurant, hospital, hotel, pharmacy, construction, e-commerce, agriculture, transport, salon, school, NGO, and real estate."/>
      </Head>

      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#080c1e 0%,#0c0f2e 30%,#080c1e 100%)", color:"white", fontFamily:"'Outfit','DM Sans',sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:ital,wght@0,700;1,700&display=swap');
          *,*::before,*::after{box-sizing:border-box;}
          @keyframes orbDrift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-16px) scale(1.05)}}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
          @keyframes floatBadge{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
          @keyframes rotateSlow{to{transform:rotate(360deg)}}
          @keyframes scrollTick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
          .tab-pill{
            display:inline-flex; align-items:center; gap:6px;
            padding:7px 14px; border-radius:20px; cursor:pointer;
            font-size:12.5px; font-weight:600; font-family:'Outfit',sans-serif;
            border:1.5px solid rgba(255,255,255,.08);
            background:rgba(255,255,255,.03);
            color:rgba(255,255,255,.4);
            transition:all .2s; white-space:nowrap;
          }
          .tab-pill:hover{color:rgba(255,255,255,.85);border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.06);}
          .tab-pill.active{color:white;border-color:var(--tab-color,#818cf8);background:color-mix(in srgb,var(--tab-color,#818cf8) 12%,transparent);box-shadow:0 0 12px color-mix(in srgb,var(--tab-color,#818cf8) 20%,transparent);}
          @media(max-width:900px){
            .industry-grid{grid-template-columns:1fr!important;}
            .cross-grid{grid-template-columns:repeat(2,1fr)!important;}
          }
          @media(max-width:600px){
            .cross-grid{grid-template-columns:1fr!important;}
          }
        `}</style>

        {/* ── HERO ── */}
        <section style={{ padding:"100px 24px 60px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
            <div style={{ position:"absolute", inset:0,
              backgroundImage:"linear-gradient(rgba(99,102,241,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.05) 1px,transparent 1px)",
              backgroundSize:"48px 48px" }}/>
            <div style={{ position:"absolute", width:580, height:580, borderRadius:"50%",
              background:"radial-gradient(circle,rgba(99,102,241,.13),transparent 65%)",
              top:-130, right:-100, animation:"orbDrift 14s ease-in-out infinite" }}/>
            <div style={{ position:"absolute", width:380, height:380, borderRadius:"50%",
              background:"radial-gradient(circle,rgba(124,58,237,.08),transparent 65%)",
              bottom:-60, left:60, animation:"orbDrift 18s ease-in-out infinite reverse" }}/>
            {/* Rotating ring */}
            <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%",
              border:"1px solid rgba(99,102,241,.05)",
              top:"50%", left:"50%", transform:"translate(-50%,-50%)",
              animation:"rotateSlow 40s linear infinite", pointerEvents:"none" }}>
              <div style={{ position:"absolute", top:-4, left:"50%", width:8, height:8, borderRadius:"50%",
                background:"#6366f1", marginLeft:-4, boxShadow:"0 0 14px rgba(99,102,241,.9)" }}/>
            </div>
            <div style={{ position:"absolute", top:0, left:"12%", right:"12%", height:1,
              background:"linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }}/>
          </div>

          <div ref={heroRef} style={{ maxWidth:820, margin:"0 auto", textAlign:"center", position:"relative" }}>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"6px 16px", borderRadius:24,
              background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.28)",
              fontSize:11, fontWeight:700, color:"#a5b4fc",
              letterSpacing:".09em", textTransform:"uppercase", marginBottom:24,
              opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)",
              transition:"all .5s ease",
            }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#6366f1", animation:"blink 2s ease infinite" }}/>
              Industry Solutions
            </div>

            <h1 style={{
              fontFamily:"'Lora',serif",
              fontSize:"clamp(36px,5.5vw,64px)",
              fontWeight:700, color:"white",
              letterSpacing:"-2px", lineHeight:1.08, marginBottom:18,
              opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(20px)",
              transition:"all .6s ease .08s",
            }}>
              One platform.
              <span style={{ display:"block", fontStyle:"italic",
                background:"linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Every industry.
              </span>
            </h1>

            <p style={{
              fontSize:17, color:"rgba(255,255,255,.45)", lineHeight:1.8,
              maxWidth:560, margin:"0 auto 48px",
              opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(16px)",
              transition:"all .6s ease .16s",
            }}>
              FinovaOS adapts to how your business actually works — whether you&apos;re a trader in Dubai, a distributor in London, or a group company spanning multiple cities.
            </p>

            {/* CTA pair */}
            <div style={{
              display:"flex", justifyContent:"center", gap:14, flexWrap:"wrap", marginBottom:60,
              opacity:heroVisible?1:0, transform:heroVisible?"translateY(0)":"translateY(14px)",
              transition:"all .6s ease .22s",
            }}>
              <Link href="/pricing" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"13px 28px", borderRadius:13,
                background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                color:"white", fontWeight:700, fontSize:14,
                textDecoration:"none", fontFamily:"inherit",
                boxShadow:"0 6px 24px rgba(99,102,241,.4)", transition:"all .25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 32px rgba(99,102,241,.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(99,102,241,.4)"; }}
              >
                Get Started Now →
              </Link>
              <Link href="/contact?subject=custom-industry" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"12px 24px", borderRadius:13,
                border:"1.5px solid rgba(255,255,255,.12)",
                background:"rgba(255,255,255,.04)",
                color:"rgba(255,255,255,.65)", fontWeight:600, fontSize:14,
                textDecoration:"none", fontFamily:"inherit", transition:"all .25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,.28)"; e.currentTarget.style.color="white"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,.12)"; e.currentTarget.style.color="rgba(255,255,255,.65)"; }}
              >
                🏗️ Don&apos;t see your industry?
              </Link>
            </div>

            {/* Industry tab strip — grouped by category */}
            <div style={{
              display:"flex", flexDirection:"column", alignItems:"center", gap:6,
              opacity:heroVisible?1:0, transition:"opacity .6s ease .3s",
            }}>
              {TAB_GROUPS.map(group => (
                <div key={group.label} style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
                  <span style={{
                    fontSize:9, fontWeight:800, color:"rgba(255,255,255,.2)",
                    letterSpacing:".1em", textTransform:"uppercase",
                    minWidth:68, textAlign:"right", flexShrink:0,
                  }}>{group.label}</span>
                  <div style={{ width:1, height:20, background:"rgba(255,255,255,.1)", flexShrink:0 }} />
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {group.ids.map(id => {
                      const ind = INDUSTRIES.find(i => i.id === id);
                      if (!ind) return null;
                      return (
                        <button
                          key={id}
                          onClick={() => scrollTo(ind.id)}
                          className={`tab-pill${activeTab===ind.id?" active":""}`}
                          style={{ "--tab-color":ind.color } as React.CSSProperties}
                        >
                          <span>{ind.emoji}</span>{ind.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SCROLLING TICKER ── */}
        <div style={{ overflow:"hidden", borderTop:"1px solid rgba(255,255,255,.05)", borderBottom:"1px solid rgba(255,255,255,.05)", padding:"14px 0", background:"rgba(255,255,255,.02)", position:"relative" }}>
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:80, background:"linear-gradient(90deg,#080c1e,transparent)", zIndex:2, pointerEvents:"none" }}/>
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:80, background:"linear-gradient(270deg,#080c1e,transparent)", zIndex:2, pointerEvents:"none" }}/>
          <div style={{ display:"flex", animation:"scrollTick 24s linear infinite", width:"max-content" }}>
            {[...Array(2)].map((_,ri) =>
              ["Trading Companies","Distributors","Manufacturers","Service Firms","Retail Chains","Restaurants","Hospitals & Clinics","Hotels","Pharmacies","Construction Firms","E-Commerce Sellers","Agriculture","Transport & Logistics","Salons & Spas","Schools & Academies","NGOs","Real Estate","Car Showrooms","Car Workshops","Spare Parts Stores","Car Rentals","Advertising Agencies","Digital Marketing","Printing Press","SaaS Companies","ISPs","Accounting Firms","Consultancies","Mobile Repair","Equipment Maintenance","Solar Companies","Import Companies","Export Companies","Clearing Agents","Event Planners","Wedding Planners","Equipment Rental","Franchise Chains"].map(name => (
                <div key={`${ri}-${name}`} style={{
                  padding:"0 28px", borderRight:"1px solid rgba(255,255,255,.06)",
                  fontSize:12.5, fontWeight:700, color:"rgba(255,255,255,.22)",
                  letterSpacing:".06em", textTransform:"uppercase", whiteSpace:"nowrap",
                }}>
                  {name}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── INDUSTRY SECTIONS ── */}
        {INDUSTRIES.map((ind, i) => (
          <IndustrySection key={ind.id} ind={ind} index={i} isLive={isLive(ind)} />
        ))}

        {/* ── CROSS-PLATFORM FEATURES ── */}
        <section style={{ padding:"100px 24px", background:"rgba(255,255,255,.02)", borderTop:"1px solid rgba(255,255,255,.06)" }}>
          <div ref={crossRef} style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{
              textAlign:"center", marginBottom:60,
              opacity:crossVisible?1:0, transform:crossVisible?"translateY(0)":"translateY(20px)",
              transition:"all .6s ease",
            }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"5px 14px", borderRadius:20,
                background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.28)",
                fontSize:11, fontWeight:700, color:"#a5b4fc", letterSpacing:".09em", textTransform:"uppercase", marginBottom:18 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#6366f1", animation:"blink 2s ease infinite" }}/>
                Every Plan Includes
              </div>
              <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(28px,4vw,46px)", fontWeight:700, color:"white", letterSpacing:"-1px", lineHeight:1.15, marginBottom:14 }}>
                Built for global businesses.{" "}
                <span style={{ fontStyle:"italic", background:"linear-gradient(135deg,#818cf8,#6366f1)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  Ready for everywhere.
                </span>
              </h2>
              <p style={{ fontSize:15.5, color:"rgba(255,255,255,.4)", maxWidth:480, margin:"0 auto", lineHeight:1.8 }}>
                No matter your industry, every plan ships with these fundamentals.
              </p>
            </div>

            <div className="cross-grid" style={{
              display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16,
              opacity:crossVisible?1:0, transform:crossVisible?"translateY(0)":"translateY(20px)",
              transition:"all .6s ease .15s",
            }}>
              {CROSS_FEATURES.map((f, i) => {
                const hov = crossHover === i;
                return (
                  <div
                    key={f.title}
                    onMouseEnter={() => setCrossHover(i)}
                    onMouseLeave={() => setCrossHover(null)}
                    style={{
                      borderRadius:18, padding:"24px",
                      background:hov?"rgba(255,255,255,.07)":"rgba(255,255,255,.03)",
                      border:`1.5px solid ${hov?"rgba(99,102,241,.4)":"rgba(255,255,255,.07)"}`,
                      backdropFilter:"blur(16px)", transition:"all .3s",
                      transform:hov?"translateY(-4px)":"translateY(0)",
                      boxShadow:hov?"0 16px 40px rgba(0,0,0,.25)":"none",
                      transitionDelay:`${i*40}ms`,
                    }}
                  >
                    <div style={{ fontSize:28, marginBottom:14 }}>{f.icon}</div>
                    <div style={{ fontSize:14.5, fontWeight:700, color:"rgba(255,255,255,.9)", marginBottom:7 }}>{f.title}</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.38)", lineHeight:1.7 }}>{f.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ padding:"80px 24px", maxWidth:1100, margin:"0 auto" }}>
          <div ref={ctaRef} style={{
            borderRadius:28, overflow:"hidden", position:"relative",
            background:"linear-gradient(135deg,#2d2b6b 0%,#1e1b55 35%,#1a1848 70%,#231548 100%)",
            padding:"72px 48px", textAlign:"center",
            boxShadow:"0 32px 80px rgba(99,102,241,.35)",
            border:"1px solid rgba(165,180,252,.2)",
            opacity:ctaVisible?1:0, transform:ctaVisible?"translateY(0)":"translateY(20px)",
            transition:"all .7s ease",
          }}>
            {/* Rings */}
            <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
              border:"1px solid rgba(165,180,252,.07)", top:"50%", left:"50%",
              transform:"translate(-50%,-50%)", animation:"rotateSlow 30s linear infinite", pointerEvents:"none" }}>
              <div style={{ position:"absolute", top:-4, left:"50%", width:8, height:8, borderRadius:"50%",
                background:"#818cf8", marginLeft:-4, boxShadow:"0 0 12px rgba(129,140,248,.8)" }}/>
            </div>
            <div style={{ position:"absolute", width:720, height:720, borderRadius:"50%",
              border:"1px solid rgba(165,180,252,.03)", top:"50%", left:"50%",
              transform:"translate(-50%,-50%)", animation:"rotateSlow 48s linear infinite reverse", pointerEvents:"none" }}/>
            <div style={{ position:"absolute", width:360, height:360, borderRadius:"50%",
              background:"radial-gradient(circle,rgba(99,102,241,.12),transparent 70%)",
              top:-80, right:-60, pointerEvents:"none" }}/>

            <div style={{ position:"relative" }}>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"6px 16px", borderRadius:24,
                background:"rgba(251,191,36,.12)", border:"1.5px solid rgba(251,191,36,.3)",
                fontSize:11, fontWeight:800, color:"#fbbf24",
                letterSpacing:".09em", textTransform:"uppercase", marginBottom:22,
                animation:"floatBadge 3s ease-in-out infinite",
              }}>
                🔥 75% OFF — First 3 Months
              </div>

              <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(30px,4.5vw,50px)", fontWeight:700, color:"white", letterSpacing:"-1.2px", lineHeight:1.12, marginBottom:14 }}>
                Find the perfect solution
                <span style={{ display:"block", fontStyle:"italic",
                  background:"linear-gradient(135deg,#a5b4fc,#818cf8)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  for your industry.
                </span>
              </h2>

              <p style={{ fontSize:16, color:"rgba(255,255,255,.5)", marginBottom:40, maxWidth:480, margin:"0 auto 40px", lineHeight:1.8 }}>
                Discount applies automatically. Secure hosted checkout. Cancel anytime.
              </p>

              <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
                <Link href="/pricing" style={{
                  padding:"14px 36px", borderRadius:14,
                  background:"linear-gradient(135deg,#fbbf24,#f59e0b)",
                  color:"#0f172a", fontWeight:800, fontSize:15,
                  textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8,
                  boxShadow:"0 6px 24px rgba(251,191,36,.4)", transition:"all .25s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 32px rgba(251,191,36,.55)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(251,191,36,.4)"; }}
                >
                  Get Started Now →
                </Link>
                <Link href="/support" style={{
                  padding:"13px 32px", borderRadius:14,
                  border:"1.5px solid rgba(255,255,255,.2)",
                  background:"rgba(255,255,255,.06)", backdropFilter:"blur(8px)",
                  color:"rgba(255,255,255,.75)", fontWeight:700, fontSize:15,
                  textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8, transition:"all .25s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,.4)"; e.currentTarget.style.color="white"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,.2)"; e.currentTarget.style.color="rgba(255,255,255,.75)"; }}
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CUSTOM INDUSTRY REQUEST ── */}
        <section style={{ padding:"60px 24px", textAlign:"center", fontFamily:"'Outfit',sans-serif" }}>
          <div style={{ maxWidth:640, margin:"0 auto" }}>
            <div style={{
              padding:"40px 36px", borderRadius:20,
              background:"linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.08))",
              border:"1px solid rgba(99,102,241,.25)",
              boxShadow:"0 0 60px rgba(99,102,241,.08)",
            }}>
              <div style={{ fontSize:36, marginBottom:14 }}>🏗️</div>
              <h2 style={{ fontSize:22, fontWeight:800, color:"white", margin:"0 0 10px" }}>
                Don&apos;t see your industry?
              </h2>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", margin:"0 0 24px", lineHeight:1.7 }}>
                We build custom industry configurations on request. Tell us your business type,
                the modules you need, and we&apos;ll set it up for you — usually within 48 hours.
              </p>
              <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                <Link href="/contact?subject=custom-industry" style={{
                  padding:"12px 28px", borderRadius:12,
                  background:"linear-gradient(135deg,#6366f1,#4f46e5)",
                  color:"white", fontWeight:700, fontSize:14,
                  textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8,
                  boxShadow:"0 6px 20px rgba(99,102,241,.4)", transition:"all .2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; }}
                >
                  📩 Request Custom Industry Setup
                </Link>
                <Link href="/contact" style={{
                  padding:"12px 24px", borderRadius:12,
                  border:"1.5px solid rgba(255,255,255,.12)",
                  background:"transparent",
                  color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:14,
                  textDecoration:"none", display:"inline-flex", alignItems:"center", gap:8, transition:"all .2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.color="white"; e.currentTarget.style.borderColor="rgba(255,255,255,.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color="rgba(255,255,255,.55)"; e.currentTarget.style.borderColor="rgba(255,255,255,.12)"; }}
                >
                  💬 Talk to Us
                </Link>
              </div>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.2)", marginTop:16 }}>
                Already supporting 43+ industries · Free setup on all plans
              </p>
            </div>
          </div>
        </section>

        {/* Footer links */}
        <div style={{ paddingBottom:48, display:"flex", justifyContent:"center", gap:28, flexWrap:"wrap" }}>
          {["Privacy Policy","Terms of Use","Security","Help Center","Contact Sales"].map(t => (
            <a key={t} href="#" style={{ fontSize:12, color:"rgba(255,255,255,.22)", textDecoration:"none", fontWeight:500, transition:"color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color="rgba(255,255,255,.65)")}
              onMouseLeave={e => (e.currentTarget.style.color="rgba(255,255,255,.22)")}>
              {t}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
