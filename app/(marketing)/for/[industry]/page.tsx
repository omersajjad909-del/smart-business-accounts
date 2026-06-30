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
  "Food & Beverage": [
    { icon:"📝", text:"Orders taken on paper — items missed, kitchen confusion, and customer complaints pile up" },
    { icon:"💸", text:"End-of-day cash doesn't match — cash, card, and delivery payments not tracked separately" },
    { icon:"🗑️", text:"Food waste is high because ingredient stock isn't tracked against recipes and actual orders" },
  ],
  Construction: [
    { icon:"🏗️", text:"Material costs logged in notebooks — no way to compare budgeted vs actual per project" },
    { icon:"💰", text:"Client bills raised without reconciling site expenses — margins only known at project end" },
    { icon:"🔧", text:"Subcontractor payments unrecorded and unreconciled until disputes arise" },
  ],
  "Real Estate": [
    { icon:"🏠", text:"Rent due dates tracked in WhatsApp — follow-ups missed, collection rates drop" },
    { icon:"📋", text:"Tenant agreements and maintenance requests scattered across emails and paper" },
    { icon:"💸", text:"Property-wise income and expenses never consolidated — P&L reporting is impossible" },
  ],
  Technology: [
    { icon:"💳", text:"Subscription billing done manually every month — renewals missed, revenue leaks unnoticed" },
    { icon:"📉", text:"MRR and churn tracked in spreadsheets — impossible to spot growth or retention problems" },
    { icon:"🔗", text:"Client contracts, licenses, and renewal dates in different tools — alerts non-existent" },
  ],
  Transport: [
    { icon:"🚛", text:"Trip expenses logged in notebooks — fuel, toll, and driver costs not consolidated per trip" },
    { icon:"💸", text:"COD collections not reconciled — cash goes missing between driver and office daily" },
    { icon:"📊", text:"No visibility into which routes or vehicles are profitable and which are running at a loss" },
  ],
  "Non-Profit": [
    { icon:"💰", text:"Donor contributions in Excel — data gets lost, duplicates exist, no proper receipts issued" },
    { icon:"📋", text:"Grant spending not tracked per project — compliance reports take days to prepare" },
    { icon:"📊", text:"Board reporting takes weeks — there's no consolidated view of funds and field activities" },
  ],
  Agriculture: [
    { icon:"🌱", text:"Seed, fertilizer, and labour costs not tracked per crop — seasonal profitability is unknown" },
    { icon:"📦", text:"Harvest and sale quantities logged separately — income reconciliation done manually" },
    { icon:"🚜", text:"Equipment maintenance unrecorded — costly repairs come as surprises, downtime unplanned" },
  ],
  Automotive: [
    { icon:"🚗", text:"Vehicle stock and parts inventory managed in separate notebooks — mismatches are frequent" },
    { icon:"🔧", text:"Workshop job cards on paper — service history lost, follow-up reminders never sent" },
    { icon:"💸", text:"Salesperson commissions calculated manually at month-end — disputes happen every cycle" },
  ],
  "Media & Advertising": [
    { icon:"📊", text:"Campaign costs logged per vendor but never consolidated per client — margins stay unclear" },
    { icon:"🕐", text:"Creative hours and deliverables tracked separately — unbilled work is a constant problem" },
    { icon:"💰", text:"Retainer invoices vary month to month without a record — clients question every bill" },
  ],
  "Beauty & Wellness": [
    { icon:"📅", text:"Appointments tracked on paper or WhatsApp — double bookings and no-shows are routine" },
    { icon:"💈", text:"Product retail sales and service fees not separated — daily cash reconciliation always fails" },
    { icon:"💸", text:"Staff commissions calculated manually — disputes every payday, errors every single month" },
  ],
  Repair: [
    { icon:"📋", text:"Job cards on paper — devices get lost, repair status unknown, and customers keep calling" },
    { icon:"🔩", text:"Parts ordered without inventory tracking — can't check availability before committing to repairs" },
    { icon:"💸", text:"Pending repairs with no follow-up system — overdue jobs forgotten, revenue uncollected" },
  ],
  Energy: [
    { icon:"🏗️", text:"Installation projects tracked in Excel — billing gets delayed weeks after completion" },
    { icon:"📋", text:"AMC and service contracts not tracked — renewals missed, services done without billing" },
    { icon:"📦", text:"Equipment and material stock for projects managed in notebooks — shortages delay work" },
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
  "Food & Beverage": ["Order Entry (Table/App)", "Kitchen Display", "Bill Generation", "Payment Collection", "Daily Cash Close", "Ingredient Stock Update"],
  Construction: ["Project / Site Setup", "Material Estimation (BOQ)", "Purchase Orders", "Site Expense Log", "Subcontractor Invoice", "Client Billing"],
  "Real Estate": ["Property Setup", "Tenant Lease Agreement", "Monthly Rent Invoice", "Rent Collection", "Maintenance Log", "Owner P&L Report"],
  Technology:   ["Client Onboarding", "Subscription / Plan Setup", "Monthly Auto-Invoice", "Payment Collection", "Renewal Alert", "MRR / ARR Dashboard"],
  Transport:    ["Trip Assignment", "Fuel & Expense Log", "Delivery Confirmation", "COD Collection", "Driver Settlement", "Route P&L"],
  "Non-Profit": ["Donor Registration", "Donation / Pledge Entry", "Fund Allocation", "Project Expense Log", "Grant Report", "Board Presentation"],
  Agriculture:  ["Season / Crop Planning", "Input Purchases (Seed/Fert)", "Crop Management", "Harvest Recording", "Sales Invoice", "Season P&L"],
  Automotive:   ["Lead / Vehicle Enquiry", "Stock Entry / Job Card", "Service & Parts Invoice", "Payment & Commission", "Stock Update", "Sales & Workshop Report"],
  "Media & Advertising": ["Client Brief", "Campaign Plan & Budget", "Media Buying / Vendor POs", "Execution Cost Log", "Client Invoice", "Campaign P&L"],
  "Beauty & Wellness": ["Appointment Booking", "Service Delivery", "Product Add-ons", "Bill Generation", "Staff Commission", "Daily Close Report"],
  Repair:      ["Device Intake", "Job Card & Diagnosis", "Parts Order", "Repair & Testing", "Invoice", "Delivery & Warranty"],
  Energy:      ["Customer Enquiry", "Site Survey & Quotation", "Material PO", "Installation / Meter Reading", "Invoice", "AMC Setup"],
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
  "Food & Beverage": [{ val:"30%", label:"Less food wastage" }, { val:"2×", label:"Faster table turnover" }, { val:"Zero", label:"Cash shortage at close" }],
  Construction: [{ val:"Per project", label:"Real-time cost visibility" }, { val:"Zero", label:"Unbilled site work" }, { val:"40%", label:"Less budget overrun" }],
  "Real Estate": [{ val:"95%", label:"On-time rent collection" }, { val:"Zero", label:"Missed lease renewals" }, { val:"Instant", label:"Tenant ledger lookup" }],
  Technology:   [{ val:"100%", label:"Automated subscription billing" }, { val:"Real-time", label:"MRR / ARR tracking" }, { val:"Zero", label:"Missed renewal alerts" }],
  Transport:    [{ val:"Per vehicle", label:"Profit & loss visibility" }, { val:"100%", label:"COD reconciliation rate" }, { val:"2 hrs", label:"Daily route settlement" }],
  "Non-Profit": [{ val:"100%", label:"Fund accountability" }, { val:"1-click", label:"Grant compliance reports" }, { val:"Zero", label:"Donor data lost" }],
  Agriculture:  [{ val:"Per crop", label:"Profitability visibility" }, { val:"100%", label:"Input cost tracking" }, { val:"Zero", label:"Calculation errors" }],
  Automotive:   [{ val:"Live", label:"Vehicle stock visibility" }, { val:"Zero", label:"Lost job cards" }, { val:"2×", label:"Faster invoicing" }],
  "Media & Advertising": [{ val:"Per client", label:"Campaign P&L" }, { val:"Zero", label:"Unbilled creative hours" }, { val:"100%", label:"Cost tracking coverage" }],
  "Beauty & Wellness": [{ val:"30%", label:"Faster checkout" }, { val:"100%", label:"Appointment tracking" }, { val:"Zero", label:"Commission disputes" }],
  Repair:      [{ val:"Zero", label:"Lost job cards" }, { val:"2×", label:"Faster job completion" }, { val:"100%", label:"Parts tracking accuracy" }],
  Energy:      [{ val:"100%", label:"Installation billing coverage" }, { val:"Zero", label:"Missed AMC renewals" }, { val:"Real-time", label:"Project cost visibility" }],
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
  "Food & Beverage": [
    { icon:"🍽️", title:"Table & Order Management",  desc:"Live floor plan. Open orders per table. Split bills instantly." },
    { icon:"👨‍🍳", title:"Kitchen Display System",    desc:"Orders flow directly to kitchen — no lost tickets, no delays." },
    { icon:"📋", title:"Menu Management",            desc:"Update prices, availability, and categories in real time." },
    { icon:"💰", title:"Daily Cash Register",        desc:"Cash, card, and delivery app payments reconciled at shift close." },
    { icon:"📦", title:"Ingredient Inventory",       desc:"Track raw materials. Know when to reorder before you run out." },
    { icon:"🧮", title:"Recipe & Food Costing",      desc:"Know the exact cost of each dish — price your menu profitably." },
    { icon:"👨‍💼", title:"Staff Shift & Payroll",     desc:"Assign shifts, track attendance, and calculate staff commissions." },
    { icon:"📊", title:"Daily Sales Reports",        desc:"Best-selling items, peak hours, and per-outlet revenue summaries." },
  ],
  Construction: [
    { icon:"🏗️", title:"Project & Site Management", desc:"Track multiple sites with budgets, timelines, and milestone billing." },
    { icon:"📋", title:"BOQ & Cost Estimation",      desc:"Bill of Quantities per project — budgeted vs actual cost tracked live." },
    { icon:"📦", title:"Material Requests & GRN",   desc:"Material requests from site, POs to suppliers, and GRN on delivery." },
    { icon:"🔧", title:"Subcontractor Management",  desc:"Raise work orders, track progress, and settle subcontractor bills." },
    { icon:"💰", title:"Labour Cost Tracking",       desc:"Daily labour attendance, rate cards, and total payroll per site." },
    { icon:"📄", title:"Client Invoicing",           desc:"Progress-based or milestone invoices with retention tracking." },
    { icon:"📊", title:"Project P&L Report",         desc:"Revenue vs cost per project — know your margin at any stage." },
    { icon:"💸", title:"Cash Flow Forecast",         desc:"Upcoming material payments vs client collections — plan your cash." },
  ],
  "Real Estate": [
    { icon:"🏢", title:"Property Management",        desc:"Register properties, units, and floors with full detail records." },
    { icon:"📄", title:"Tenant Lease Management",    desc:"Lease agreements, start/end dates, rent amount, and escalation clauses." },
    { icon:"💰", title:"Rent Invoicing & Collection",desc:"Auto-generate monthly rent invoices and track collection per unit." },
    { icon:"⚠️", title:"Overdue Rent Alerts",        desc:"Automatic flags for tenants with unpaid rent — never miss a follow-up." },
    { icon:"🔧", title:"Maintenance Requests",       desc:"Log and track repair requests by unit — assign to vendors with costs." },
    { icon:"📊", title:"Owner Reports",              desc:"Rental income vs expenses per property — full owner dashboard." },
    { icon:"🏠", title:"Multi-Property Dashboard",   desc:"Manage dozens of properties from one centralized view." },
    { icon:"📋", title:"Document Management",        desc:"Store lease copies, NOCs, utility bills, and inspection reports." },
  ],
  Technology: [
    { icon:"🔄", title:"Subscription Billing",       desc:"Auto-generate and collect recurring invoices on any billing cycle." },
    { icon:"📈", title:"MRR / ARR Dashboard",         desc:"Track Monthly and Annual Recurring Revenue with churn analysis." },
    { icon:"👥", title:"Client Account Management",  desc:"Plans, seat counts, usage, and renewal dates per client account." },
    { icon:"🎫", title:"Support Ticket Tracking",    desc:"Log and resolve customer issues — linked to client billing history." },
    { icon:"📄", title:"Contract Management",        desc:"Service agreements, renewal dates, and auto-alert before expiry." },
    { icon:"💰", title:"Revenue Recognition",        desc:"Deferred and recognized revenue split per accounting period." },
    { icon:"📊", title:"Churn & Growth Reports",     desc:"New MRR, expansion, contraction, and churn tracked automatically." },
    { icon:"🔌", title:"API Access",                 desc:"Connect FinovaOS billing to your own platform via REST API." },
  ],
  Transport: [
    { icon:"🚛", title:"Fleet Management",           desc:"Vehicle assignments, fuel tracking, and maintenance logs per vehicle." },
    { icon:"🗺️", title:"Trip & Freight Tracking",   desc:"Log trips with origin, destination, cargo, and freight revenue." },
    { icon:"⛽", title:"Fuel & Expense Log",         desc:"Daily fuel receipts, toll, and driver allowances tracked per trip." },
    { icon:"🔧", title:"Vehicle Maintenance",        desc:"Service reminders and full repair history per vehicle." },
    { icon:"👤", title:"Driver Management",          desc:"Driver records, advance payments, and daily settlement tracking." },
    { icon:"💸", title:"COD Reconciliation",         desc:"Track cash-on-delivery collections across riders and routes." },
    { icon:"📊", title:"Route Profitability",        desc:"Revenue minus all costs per vehicle — know which trucks earn." },
    { icon:"👨‍💼", title:"Driver Payroll",            desc:"Commission-based or fixed salary with advance deductions." },
  ],
  "Non-Profit": [
    { icon:"💝", title:"Donor Management",           desc:"Register donors, track pledge history, and issue tax receipts." },
    { icon:"💰", title:"Donation & Fund Tracking",   desc:"Record cash, bank, and in-kind donations per fund or campaign." },
    { icon:"📋", title:"Fund Accounting",            desc:"Separate funds with restricted and unrestricted balance tracking." },
    { icon:"🎯", title:"Project / Programme Budget", desc:"Allocate funds to projects and track spending vs budget in real time." },
    { icon:"📊", title:"Grant Compliance Reports",   desc:"Donor-ready expense reports per grant, fund, or programme." },
    { icon:"👥", title:"Volunteer Records",          desc:"Log volunteer hours and contributions alongside paid staff." },
    { icon:"📈", title:"Board & Donor Reports",      desc:"One-click dashboards for board meetings and donor impact reports." },
    { icon:"🧾", title:"Expense Vouchers & Audit",   desc:"Full audit trail for every expenditure — compliant with donor requirements." },
  ],
  Agriculture: [
    { icon:"🌱", title:"Crop / Season Management",   desc:"Set up crop seasons, land areas, and expected yield per batch." },
    { icon:"🧪", title:"Input Cost Tracking",        desc:"Log seed, fertilizer, pesticide, and labour costs per crop cycle." },
    { icon:"📦", title:"Harvest Recording",          desc:"Record harvest quantities by crop, batch, and storage location." },
    { icon:"🧾", title:"Sales & Purchase Invoicing", desc:"Invoice buyers and purchase inputs with proper ledger entries." },
    { icon:"🚜", title:"Equipment & Maintenance",    desc:"Track machinery, maintenance schedules, and repair costs." },
    { icon:"📊", title:"Seasonal P&L Report",        desc:"Income vs all input costs per crop season — know your net margin." },
    { icon:"👨‍🌾", title:"Farmer / Partner Ledger",   desc:"Track payments to and from farming partners and input suppliers." },
    { icon:"💰", title:"Cash Flow Planner",          desc:"Plan seasonal cash needs vs expected harvest income in advance." },
  ],
  Automotive: [
    { icon:"🚗", title:"Vehicle Inventory",          desc:"Stock register for new and used vehicles with all specs and costs." },
    { icon:"🔧", title:"Workshop Job Cards",         desc:"Create, assign, and track workshop jobs with parts and labour." },
    { icon:"🔩", title:"Parts & Accessories Stock",  desc:"Real-time parts inventory with reorder alerts and supplier ledgers." },
    { icon:"👤", title:"Customer Ledger & History",  desc:"Full service and purchase history per customer — never lose a record." },
    { icon:"📄", title:"Insurance & Finance Billing",desc:"Track insurance claims, leasing, and financing per vehicle sold." },
    { icon:"💰", title:"Salesperson Commission",     desc:"Auto-calculate commissions on vehicle sales by rep and month." },
    { icon:"🔔", title:"Service Reminders",          desc:"Auto-send service due reminders to customers by SMS or email." },
    { icon:"📊", title:"Showroom & Workshop Reports",desc:"Vehicles sold, revenue per unit, workshop efficiency, and parts usage." },
  ],
  "Media & Advertising": [
    { icon:"📣", title:"Client Campaign Management", desc:"Create campaigns with budgets, timelines, and deliverable tracking." },
    { icon:"💰", title:"Retainer & Project Billing", desc:"Invoice clients on retainer, per campaign, or by deliverable." },
    { icon:"📺", title:"Media Buying Cost Tracking", desc:"Log vendor payments (print, digital, OOH) per campaign and client." },
    { icon:"🕐", title:"Timesheet & Hourly Billing", desc:"Track creative and strategy hours per client — bill accurately." },
    { icon:"📋", title:"Vendor & Supplier Ledger",   desc:"Agency vendor payments, media house invoices, and PO tracking." },
    { icon:"📊", title:"Campaign P&L per Client",    desc:"Revenue vs all costs per campaign — know your agency margin." },
    { icon:"🔄", title:"Recurring Retainer Invoices",desc:"Auto-generate monthly retainer invoices for long-term clients." },
    { icon:"📈", title:"Monthly Performance Reports",desc:"Billable hours, campaign spend, revenue per client — all in one." },
  ],
  "Beauty & Wellness": [
    { icon:"📅", title:"Appointment Scheduling",     desc:"Book, reschedule, and track client appointments by staff and room." },
    { icon:"💇", title:"Service Menu & Pricing",     desc:"Define services, durations, and prices — update in real time." },
    { icon:"🛍️", title:"Product Retail Inventory",  desc:"Track shampoos, skincare, and salon products with reorder alerts." },
    { icon:"💰", title:"Daily Cash Register",        desc:"Services, products, and tips — all payment types reconciled daily." },
    { icon:"💸", title:"Staff Commission Tracking",  desc:"Auto-calculate stylist and therapist commissions per service." },
    { icon:"📋", title:"Client History & Notes",     desc:"Service history, preferences, and notes per client — build loyalty." },
    { icon:"🎁", title:"Membership & Package Cards", desc:"Sell prepaid packages and loyalty memberships with balance tracking." },
    { icon:"🏢", title:"Multi-Branch Management",    desc:"Each salon runs independently with consolidated owner reports." },
  ],
  Repair: [
    { icon:"📋", title:"Repair Job Cards",           desc:"Create job cards for every device — technician, fault, and status tracked." },
    { icon:"📱", title:"Customer & Device History",  desc:"Full service history per device — previous repairs, parts used, warranty." },
    { icon:"🔩", title:"Parts Inventory & Reorder",  desc:"Real-time parts stock with reorder alerts — never turn away a job." },
    { icon:"📊", title:"Job Status Tracking",        desc:"Pending, in-repair, ready, delivered — customer sees status in real time." },
    { icon:"📄", title:"AMC / Service Contracts",    desc:"Annual maintenance contracts with auto-billing on renewal dates." },
    { icon:"🧾", title:"Repair Invoice & Receipt",   desc:"Professional invoices with warranty period, parts, and labour breakdown." },
    { icon:"👨‍🔧", title:"Technician Performance",   desc:"Jobs completed, revenue generated, and turnaround time per technician." },
    { icon:"📈", title:"Workshop Revenue Reports",   desc:"Daily income, pending jobs, parts usage, and monthly profitability." },
  ],
  Energy: [
    { icon:"🏗️", title:"Project / Installation Mgmt",desc:"Track solar and energy projects from survey to commissioning." },
    { icon:"👤", title:"Customer Asset Register",    desc:"Installed equipment per customer — panels, inverters, meters, and specs." },
    { icon:"📦", title:"Material & Equipment Stock", desc:"Panels, cables, inverters, and parts — live stock per project and warehouse." },
    { icon:"📋", title:"AMC / Contract Billing",     desc:"Annual maintenance contracts with auto-invoice and renewal alerts." },
    { icon:"📊", title:"Meter Reading & Usage Bill", desc:"Record meter readings and generate usage-based invoices per customer." },
    { icon:"🚗", title:"Technician Dispatch",        desc:"Assign technicians to sites, track travel, and log completion reports." },
    { icon:"🧾", title:"Quotation to Invoice",       desc:"Convert approved site survey quotes to invoices with one click." },
    { icon:"📈", title:"Project P&L Reports",        desc:"Revenue vs material and labour cost per project — know your margin." },
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
  "Food & Beverage": [
    { q:"Does it work with an existing POS system?", a:"FinovaOS includes its own POS for table and counter billing. Daily sales from an existing POS can be imported via CSV for accounting." },
    { q:"Can I manage multiple restaurant branches?", a:"Yes — each outlet runs independently with its own sales, stock, and staff. The owner sees consolidated reports across all branches." },
    { q:"How does food costing work?", a:"Define a recipe for each menu item with ingredients and quantities. When an order is placed, the system deducts ingredients from stock and calculates food cost." },
    { q:"Does the kitchen display system work on a tablet?", a:"Yes — the KDS is web-based and works on any screen. No dedicated hardware required, any tablet or monitor will work." },
  ],
  Construction: [
    { q:"Can I track costs across multiple sites simultaneously?", a:"Yes — each project or site is managed separately with its own budget, material log, and billing. You see a consolidated view across all projects." },
    { q:"How does subcontractor billing work?", a:"Raise work orders against subcontractors, receive completion confirmations, and process payments — all linked to the specific project cost." },
    { q:"Can I generate progress-based client invoices?", a:"Yes — invoice clients by percentage completion, milestone, or fixed amount. Retention tracking is also supported." },
    { q:"Does it handle material purchase orders and GRN?", a:"Yes — raise POs to suppliers, receive materials on site with GRN, and match against supplier invoices to catch discrepancies." },
  ],
  "Real Estate": [
    { q:"Can I manage both residential and commercial properties?", a:"Yes — properties can be categorized by type (residential, commercial, industrial) with different lease structures and billing cycles." },
    { q:"How does the automatic rent reminder work?", a:"Rent invoices are generated on your configured due date each month. Overdue accounts are flagged automatically for follow-up." },
    { q:"Can I track maintenance requests per unit?", a:"Yes — each maintenance request is logged against the property and unit, assigned to a vendor, and tracked with cost and completion status." },
    { q:"Can property owners see their own reports?", a:"The Enterprise plan supports multi-owner setups where each property owner can be given limited access to see only their own portfolio reports." },
  ],
  Technology: [
    { q:"How does automated subscription billing work?", a:"Set a billing cycle (monthly, quarterly, annual) per client plan. FinovaOS generates invoices automatically and tracks payment status." },
    { q:"Can I handle plan upgrades and downgrades mid-cycle?", a:"Yes — plan changes are prorated automatically. The system calculates the credit or additional charge for the remaining billing period." },
    { q:"How is MRR calculated?", a:"MRR is calculated from all active subscription invoices — new, expansion, contraction, and churn are tracked separately for accurate growth metrics." },
    { q:"Does it support usage-based billing?", a:"Yes — you can define usage tiers and bill clients based on their actual consumption (seats, API calls, storage) each billing cycle." },
  ],
  Transport: [
    { q:"How does trip-wise expense tracking work?", a:"Each trip has its own expense log — fuel, toll, driver allowance, and loading charges. Net profit per trip is calculated after all deductions." },
    { q:"Can I track COD collections from multiple drivers?", a:"Yes — each driver's COD collections are tracked separately and reconciled against their delivery list at day close." },
    { q:"Does it handle fuel cards or only cash expenses?", a:"Both — fuel expenses can be entered as cash, bank transfer, or fuel card transactions, each linked to the specific trip and vehicle." },
    { q:"Can I manage a fleet of 50+ vehicles?", a:"Yes — there's no limit on vehicles in any plan. Each vehicle has its own P&L, maintenance history, and complete trip log." },
  ],
  "Non-Profit": [
    { q:"Can I separate restricted and unrestricted funds?", a:"Yes — fund accounting in FinovaOS lets you create separate funds with their own budgets. Restricted funds can only be used for their designated purpose." },
    { q:"Does it generate donor tax receipts automatically?", a:"Yes — donation receipts with the registered NGO name and tax details are generated automatically for every contribution." },
    { q:"How does grant reporting work?", a:"Every expense can be tagged to a grant or project. Compliance reports show exactly how grant funds were used — ready for donor submission." },
    { q:"Can volunteers be tracked separately from paid staff?", a:"Yes — volunteer hours and contributions can be logged and reported separately from your paid staff payroll." },
  ],
  Agriculture: [
    { q:"Can I track multiple crops or livestock simultaneously?", a:"Yes — each crop season or livestock batch is managed separately with its own input costs, yield targets, and income tracking." },
    { q:"How does input cost tracking work?", a:"Log every purchase (seeds, fertilizer, pesticide, labour) against a specific crop. The system calculates total cost per acre and per unit at harvest." },
    { q:"Can I manage land leased from multiple owners?", a:"Yes — land parcels can be registered with owner names. If revenue is shared, the system tracks payments to landowners automatically." },
    { q:"How long does setup take for a farming operation?", a:"Most setups are complete in under an hour. Start with your current season's crops and add historical data as needed." },
  ],
  Automotive: [
    { q:"Can I manage both new and used vehicle inventory?", a:"Yes — new and pre-owned vehicles are tracked separately with purchase cost, refurbishment expenses, and target selling price per unit." },
    { q:"Does the workshop module work for mechanical repairs and body work?", a:"Yes — job cards support all service types. You can define service categories (mechanical, bodywork, electrical) and assign staff accordingly." },
    { q:"How does salesperson commission calculation work?", a:"Set a commission structure per vehicle type or value range. The system auto-calculates and adds each rep's commission to their monthly payroll." },
    { q:"Can I manage parts inventory separately from vehicles?", a:"Yes — parts and accessories have their own stock register with supplier ledgers, reorder alerts, and usage tracked against workshop jobs." },
  ],
  "Media & Advertising": [
    { q:"Can I handle both retainer and project-based billing?", a:"Yes — each client can have a mix of monthly retainers and project invoices. All billing history is consolidated under the client account." },
    { q:"How does media buying cost tracking work?", a:"Log each media purchase (print, digital, OOH, broadcast) as a vendor expense against the campaign. Client invoices include the agreed markup automatically." },
    { q:"Can teams track billable hours per client?", a:"Yes — team members log hours against clients and campaigns. Approved hours convert to invoice line items with one click." },
    { q:"Does it generate campaign performance summaries?", a:"FinovaOS tracks financial performance per campaign (budget vs spend vs billed). Creative deliverables are tracked separately but linked." },
  ],
  "Beauty & Wellness": [
    { q:"Can I manage multiple salon or spa branches?", a:"Yes — each branch runs independently with its own bookings, staff, and inventory. The owner sees consolidated revenue across all branches." },
    { q:"How do staff commissions work?", a:"Define commission rates per service type or per staff member. Commissions are auto-calculated from bookings and added to the monthly payroll." },
    { q:"Does it handle membership and prepaid package cards?", a:"Yes — sell packages and memberships, track the remaining balance per client, and deduct services automatically when redeemed." },
    { q:"Can I track inventory for retail products sold at the salon?", a:"Yes — retail products have their own stock register. Sales are deducted automatically at checkout and reorder alerts prevent stock-outs." },
  ],
  Repair: [
    { q:"How do job cards work for device repairs?", a:"Each repair job gets a card with the customer name, device details, reported fault, and assigned technician. Status updates from intake to delivery are tracked in real time." },
    { q:"Can I manage warranty claims on repairs done previously?", a:"Yes — each job card records the warranty period. Claims within warranty are flagged automatically and the technician is notified." },
    { q:"Does it handle AMC (Annual Maintenance Contracts)?", a:"Yes — set up service contracts per customer or equipment with renewal dates. The system auto-generates invoices at each renewal cycle." },
    { q:"Can I track spare parts inventory and reorder automatically?", a:"Yes — parts are deducted from stock when used in a repair. When stock falls below the reorder level, an alert is triggered to purchase more." },
  ],
  Energy: [
    { q:"Can I manage both installation projects and ongoing AMC separately?", a:"Yes — one-time installation work is tracked as a project with its own cost and invoice. AMC contracts are recurring with auto-billing on the contract cycle." },
    { q:"Does it work for solar companies and utility distributors both?", a:"Yes — solar projects use the installation and project billing workflow. Utility distributors use the meter reading and usage-based billing workflow." },
    { q:"How does meter reading and billing work?", a:"Record current and previous readings per customer. The system calculates units consumed, applies your rate slab, and generates the bill automatically." },
    { q:"Can I track which technician did which installation?", a:"Yes — each project and service visit is assigned to a technician. Their history, travel log, and completed work are tracked in the system." },
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
  "Food & Beverage": [
    { feature:"Table & order billing",       starter:true,      pro:true,          enterprise:true },
    { feature:"Kitchen display system",      starter:true,      pro:true,          enterprise:true },
    { feature:"F&B inventory",               starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Recipe / food costing",       starter:false,     pro:true,          enterprise:true },
    { feature:"Staff shift & payroll",       starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-outlet / branch",       starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Daily sales reports",         starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
    { feature:"Delivery app integration",    starter:false,     pro:false,         enterprise:true },
  ],
  Construction: [
    { feature:"Project & site management",   starter:true,      pro:true,          enterprise:true },
    { feature:"BOQ & cost estimation",       starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Purchase orders & GRN",       starter:true,      pro:true,          enterprise:true },
    { feature:"Subcontractor management",    starter:false,     pro:true,          enterprise:true },
    { feature:"Labour cost tracking",        starter:false,     pro:true,          enterprise:true },
    { feature:"Progress billing",            starter:true,      pro:true,          enterprise:true },
    { feature:"Multi-site operations",       starter:false,     pro:"Up to 5",     enterprise:"Unlimited" },
    { feature:"Project P&L reports",         starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
  ],
  "Real Estate": [
    { feature:"Property management",         starter:true,      pro:true,          enterprise:true },
    { feature:"Tenant lease management",     starter:true,      pro:true,          enterprise:true },
    { feature:"Rent invoicing & collection", starter:true,      pro:true,          enterprise:true },
    { feature:"Overdue rent alerts",         starter:true,      pro:true,          enterprise:true },
    { feature:"Maintenance tracking",        starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-property portfolio",    starter:false,     pro:"Up to 10",    enterprise:"Unlimited" },
    { feature:"Owner & property reports",    starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
    { feature:"Multi-owner access",          starter:false,     pro:false,         enterprise:true },
  ],
  Technology: [
    { feature:"Subscription billing",        starter:true,      pro:true,          enterprise:true },
    { feature:"MRR / ARR dashboard",         starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Client account management",   starter:true,      pro:true,          enterprise:true },
    { feature:"Support ticket tracking",     starter:false,     pro:true,          enterprise:true },
    { feature:"Contract & renewal alerts",   starter:false,     pro:true,          enterprise:true },
    { feature:"Revenue recognition",         starter:false,     pro:true,          enterprise:true },
    { feature:"Churn & growth reports",      starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
    { feature:"API access",                  starter:false,     pro:false,         enterprise:true },
  ],
  Transport: [
    { feature:"Fleet management",            starter:true,      pro:true,          enterprise:true },
    { feature:"Trip & freight tracking",     starter:true,      pro:true,          enterprise:true },
    { feature:"Fuel & expense log",          starter:true,      pro:true,          enterprise:true },
    { feature:"COD reconciliation",          starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Driver payroll",              starter:false,     pro:true,          enterprise:true },
    { feature:"Vehicle maintenance log",     starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-depot / branch",        starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Route profitability reports", starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
  ],
  "Non-Profit": [
    { feature:"Donor management",            starter:true,      pro:true,          enterprise:true },
    { feature:"Donation & fund tracking",    starter:true,      pro:true,          enterprise:true },
    { feature:"Tax receipt generation",      starter:true,      pro:true,          enterprise:true },
    { feature:"Fund accounting",             starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Project / grant budgets",     starter:false,     pro:true,          enterprise:true },
    { feature:"Grant compliance reports",    starter:false,     pro:true,          enterprise:true },
    { feature:"Volunteer tracking",          starter:false,     pro:true,          enterprise:true },
    { feature:"Board & donor reports",       starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
  ],
  Agriculture: [
    { feature:"Crop / season management",    starter:true,      pro:true,          enterprise:true },
    { feature:"Input cost tracking",         starter:true,      pro:true,          enterprise:true },
    { feature:"Harvest recording",           starter:true,      pro:true,          enterprise:true },
    { feature:"Sales & purchase invoicing",  starter:true,      pro:true,          enterprise:true },
    { feature:"Equipment maintenance",       starter:false,     pro:true,          enterprise:true },
    { feature:"Farmer / partner ledger",     starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-farm / land parcels",   starter:false,     pro:"Up to 5",     enterprise:"Unlimited" },
    { feature:"Seasonal P&L reports",        starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
  ],
  Automotive: [
    { feature:"Vehicle inventory",           starter:true,      pro:true,          enterprise:true },
    { feature:"Workshop job cards",          starter:true,      pro:true,          enterprise:true },
    { feature:"Parts & accessories stock",   starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Customer ledger & history",   starter:true,      pro:true,          enterprise:true },
    { feature:"Insurance & finance billing", starter:false,     pro:true,          enterprise:true },
    { feature:"Commission tracking",         starter:false,     pro:true,          enterprise:true },
    { feature:"Service reminders",           starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-branch showroom",       starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
  ],
  "Media & Advertising": [
    { feature:"Client campaign management",  starter:true,      pro:true,          enterprise:true },
    { feature:"Retainer & project billing",  starter:true,      pro:true,          enterprise:true },
    { feature:"Media buying cost tracking",  starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Timesheet & hourly billing",  starter:false,     pro:true,          enterprise:true },
    { feature:"Vendor & supplier ledger",    starter:true,      pro:true,          enterprise:true },
    { feature:"Campaign P&L per client",     starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
    { feature:"Recurring retainer invoices", starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-team / department",     starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
  ],
  "Beauty & Wellness": [
    { feature:"Appointment scheduling",      starter:true,      pro:true,          enterprise:true },
    { feature:"Service menu & pricing",      starter:true,      pro:true,          enterprise:true },
    { feature:"Product retail inventory",    starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Daily cash register",         starter:true,      pro:true,          enterprise:true },
    { feature:"Staff commission tracking",   starter:false,     pro:true,          enterprise:true },
    { feature:"Client history & notes",      starter:false,     pro:true,          enterprise:true },
    { feature:"Membership & package cards",  starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-branch management",     starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
  ],
  Repair: [
    { feature:"Repair job cards",            starter:true,      pro:true,          enterprise:true },
    { feature:"Customer & device history",   starter:true,      pro:true,          enterprise:true },
    { feature:"Parts inventory & reorder",   starter:"Basic",   pro:true,          enterprise:true },
    { feature:"Job status tracking",         starter:true,      pro:true,          enterprise:true },
    { feature:"AMC / service contracts",     starter:false,     pro:true,          enterprise:true },
    { feature:"Technician performance",      starter:false,     pro:true,          enterprise:true },
    { feature:"Multi-branch workshop",       starter:false,     pro:"Up to 3",     enterprise:"Unlimited" },
    { feature:"Workshop revenue reports",    starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
  ],
  Energy: [
    { feature:"Project / installation mgmt", starter:true,      pro:true,          enterprise:true },
    { feature:"Customer asset register",     starter:true,      pro:true,          enterprise:true },
    { feature:"Material & equipment stock",  starter:"Basic",   pro:true,          enterprise:true },
    { feature:"AMC / contract billing",      starter:false,     pro:true,          enterprise:true },
    { feature:"Meter reading & usage bill",  starter:false,     pro:true,          enterprise:true },
    { feature:"Technician dispatch",         starter:false,     pro:true,          enterprise:true },
    { feature:"Quotation to invoice",        starter:true,      pro:true,          enterprise:true },
    { feature:"Project P&L reports",         starter:"Basic",   pro:"Advanced",    enterprise:"Full suite" },
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
          {/* CTA row */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", background:"rgba(255,255,255,.02)", borderTop:"1px solid rgba(255,255,255,.08)" }}>
            <div style={{ padding:"20px 24px", fontSize:12, color:"rgba(255,255,255,.28)" }}>
              {type.isLive ? "🔥 75% off — first 3 months" : "⏳ Launching soon — join the waitlist"}
            </div>
            {PLANS.map(p => (
              <div key={p.key} style={{ padding:"14px", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,.06)", background:p.featured?"rgba(99,102,241,.06)":"transparent" }}>
                {type.isLive ? (
                  <Link href={`/onboarding/signup/${p.key==="pro"?"professional":p.key}?businessType=${type.id}`} style={{
                    display:"block", padding:"10px 0", borderRadius:10,
                    background:p.featured?p.gradient:"rgba(255,255,255,.07)",
                    border:p.featured?"none":`1px solid ${p.color}30`,
                    color:"white", fontWeight:700, fontSize:12, textDecoration:"none",
                  }}>Get {p.name}</Link>
                ) : (
                  <div style={{
                    padding:"10px 0", borderRadius:10, fontSize:12, fontWeight:600,
                    color:"rgba(255,255,255,.25)", border:"1px solid rgba(255,255,255,.08)",
                    textAlign:"center",
                  }}>Coming Soon</div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:14 }}>
          <Link href="/pricing" style={{ fontSize:13, color:"#818cf8", textDecoration:"none", fontWeight:600 }}>View full pricing details →</Link>
        </div>
      </div>

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
