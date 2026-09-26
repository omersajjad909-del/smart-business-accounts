"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatFromUSD } from "@/lib/currency-client";

interface BizType {
  id: string; label: string; icon: string;
  phase: 1|2|3|4; category: string; description: string; isLive: boolean;
}

/* ─── Industry-specific content ─── */

const PAIN_POINTS: Record<string, { icon:string; text:string }[]> = {
  trading: [
    { icon:"📦", text:"Register stock and godown stock never match — shortages only surface at the annual stock-take" },
    { icon:"💰", text:"Purchase rates change every few weeks, so margins get calculated on stale cost prices" },
    { icon:"📒", text:"Part payments land against three or four invoices at once — nobody knows which bill is still open" },
    { icon:"🧾", text:"Delivery challans, POs, and invoices live in separate books, so disputes take days to settle" },
  ],
  distribution: [
    { icon:"🚚", text:"Van stock loaded in the morning is never reconciled against cash and invoices at night" },
    { icon:"🏬", text:"Depot-to-depot transfers recorded on paper — head office sees the shortage weeks later" },
    { icon:"🚦", text:"Retailers keep buying past their credit limit because the limit isn't enforced at billing" },
    { icon:"📉", text:"Slow-moving and near-expiry stock sits at branches with no ageing report to catch it" },
  ],
  wholesale: [
    { icon:"🏷️", text:"Every dealer has a different rate slab, and the correct rate lives in one person's memory" },
    { icon:"💸", text:"Credit limits agreed verbally — exposure to a single dealer is discovered only after a default" },
    { icon:"↩️", text:"Damaged-goods returns and scheme claims adjusted informally, so ledgers never tie out" },
    { icon:"📊", text:"Ageing is a manual exercise, so recovery calls go to the wrong dealers in the wrong order" },
  ],
  retail: [
    { icon:"🧾", text:"Counter sales written by hand — daily cash, card, and digital collections never reconcile" },
    { icon:"📦", text:"Shelf stock and system stock drift apart because purchases and sales aren't linked live" },
    { icon:"🏪", text:"Each outlet keeps its own book, so group-level sales and margin take days to consolidate" },
    { icon:"👥", text:"Cashier shifts close without a shift report — shortages can't be traced to a person or hour" },
  ],
  import_company: [
    { icon:"🚢", text:"Freight, duty, insurance, port charges, and clearing fees sit in separate emails and files" },
    { icon:"💱", text:"Payments made in USD/EUR but booked at one fixed rate — exchange gain and loss is invisible" },
    { icon:"📦", text:"Goods in transit aren't on the books, so stock and payables look wrong for weeks" },
    { icon:"📉", text:"Landed cost is estimated, so the real margin on a consignment is known only after it is sold" },
  ],
  clearing_forwarding: [
    { icon:"🗂️", text:"Costs from four vendors land against one consignment with no single job file to hold them" },
    { icon:"💵", text:"Duty paid on the client's behalf gets mixed with your agency fee — the real income is unclear" },
    { icon:"📄", text:"BL, GD, packing list, and delivery order tracked in WhatsApp — a missing document stalls clearance" },
    { icon:"⏱️", text:"Demurrage and detention charges get absorbed because nobody billed them back in time" },
  ],
  manufacturing: [
    { icon:"⚙️", text:"Raw material issued to the floor without a BOM — consumption is estimated, not recorded" },
    { icon:"🏭", text:"Work-in-progress isn't valued, so the balance sheet misses everything sitting on the shop floor" },
    { icon:"💰", text:"Labour and overhead never reach the product cost, so quoted prices are guesswork" },
    { icon:"🗑️", text:"Scrap and rework are absorbed silently — the true wastage rate per batch is unknown" },
  ],
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
  trading:             ["Supplier Quotation", "Purchase Order", "GRN & Stock In", "Sales Invoice", "Payment Collection", "Bank Reconciliation"],
  distribution:        ["Supplier PO", "Warehouse GRN", "Route & Van Load-Out", "Delivery + Invoice", "Daily Route Settlement", "Depot P&L"],
  wholesale:           ["Bulk Purchase", "Warehouse Stock In", "Dealer Order", "Slab-Priced Invoice", "Credit & Ageing Watch", "Recovery & Receipt"],
  retail:              ["Purchase Order", "Stock In & Barcode", "POS Counter Sale", "Shift Cash Close", "Store Reconciliation", "Store-Wise P&L"],
  import_company:      ["Proforma / Order", "LC or TT Opening", "Shipment & Transit", "Customs Clearance", "Landed Cost Costing", "Local or Export Sale"],
  clearing_forwarding: ["Client Instruction", "Job File Opened", "Document Set Check", "Customs Clearance", "Cost & Duty Logged", "Agency Invoice & Job P&L"],
  manufacturing:       ["Raw Material PO", "GRN & Store In", "Production Order", "BOM Issue & WIP", "Finished Goods In", "Costing & Customer Invoice"],
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
  trading:             [{ val:"Per SKU", label:"Real margin visibility" }, { val:"87%", label:"Less reconciliation time" }, { val:"3×", label:"Faster month-end close" }],
  distribution:        [{ val:"Per route", label:"Profit & settlement view" }, { val:"99%", label:"Van stock reconciliation" }, { val:"2 hrs", label:"Daily depot settlement" }],
  wholesale:           [{ val:"Per dealer", label:"Rate & credit control" }, { val:"Zero", label:"Rate-slab billing errors" }, { val:"Instant", label:"Outstanding ageing view" }],
  retail:              [{ val:"12 min", label:"Daily store close" }, { val:"100%", label:"Counter-to-stock accuracy" }, { val:"Live", label:"Multi-store stock view" }],
  import_company:      [{ val:"Accurate", label:"Landed cost per shipment" }, { val:"Live", label:"Goods-in-transit visibility" }, { val:"Auto", label:"FX gain / loss posting" }],
  clearing_forwarding: [{ val:"Per job", label:"Consignment profitability" }, { val:"Zero", label:"Unbilled reimbursables" }, { val:"100%", label:"Document set traceability" }],
  manufacturing:       [{ val:"Per batch", label:"True cost per unit" }, { val:"18%", label:"Average margin improvement" }, { val:"Live", label:"WIP & scrap visibility" }],
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
  trading: [
    { icon:"🧾", title:"Purchase Orders & GRN",       desc:"Raise POs, receive goods against them, and let stock and payables update in the same step." },
    { icon:"📦", title:"Real-Time Stock Ledger",      desc:"Every issue, receipt, and adjustment is dated and traceable — item-wise and godown-wise." },
    { icon:"💰", title:"Cost Price & Margin per SKU", desc:"Weighted-average or FIFO costing so the margin on each item reflects what you actually paid." },
    { icon:"📒", title:"Party Ledger with Ageing",    desc:"Customer and supplier balances with 30/60/90-day buckets and full transaction history." },
    { icon:"🔁", title:"Advance & Part Payments",     desc:"Allocate one receipt across several invoices — open balances stay correct automatically." },
    { icon:"↩️", title:"Purchase & Sales Returns",    desc:"Debit and credit notes that reverse both the stock and the ledger in one entry." },
    { icon:"🏦", title:"Bank Reconciliation",         desc:"Import the statement, auto-match entries, and review only what genuinely differs." },
    { icon:"📊", title:"Profit by Item, Party & Month",desc:"See which SKUs, suppliers, and customers actually carry the business — not just turnover." },
  ],
  distribution: [
    { icon:"🏬", title:"Multi-Depot Inventory",       desc:"Separate stock per depot with inter-depot transfer notes and a full transfer audit trail." },
    { icon:"🚚", title:"Route & Van Load-Out",        desc:"Issue stock to a route or vehicle in the morning and track exactly what went out." },
    { icon:"🧾", title:"Van Sales & Daily Settlement",desc:"Reconcile loaded stock against invoices, returns, and cash collected at day close." },
    { icon:"🚦", title:"Retailer Credit Limits",      desc:"Set a limit per retailer and warn or block at billing before exposure grows." },
    { icon:"🎁", title:"Schemes & Trade Discounts",   desc:"Apply free-goods schemes, slabs, and trade discounts consistently across every route." },
    { icon:"📉", title:"Stock Ageing & Expiry",       desc:"Flag slow-moving and near-expiry stock at each depot before it becomes a write-off." },
    { icon:"👥", title:"Salesman-Wise Performance",   desc:"Sales, recovery, and returns per salesman — commission calculated on real collections." },
    { icon:"📊", title:"Route & Depot P&L",           desc:"Consolidated group view plus profitability for every individual route and branch." },
  ],
  wholesale: [
    { icon:"🏷️", title:"Slab & Tier Pricing",        desc:"Rates by quantity slab, dealer category, or region — applied automatically at billing time." },
    { icon:"👥", title:"Dealer Ledger & Statements",  desc:"A complete ledger per dealer, exportable as a statement to send on WhatsApp or email." },
    { icon:"🧾", title:"Bulk Order to Invoice",       desc:"Convert large sales orders into invoices and delivery challans without re-keying a line." },
    { icon:"🚦", title:"Credit Limit Enforcement",    desc:"Block or warn on orders that push a dealer past their approved limit or overdue days." },
    { icon:"↩️", title:"Returns, Claims & Notes",     desc:"Record damaged goods, scheme claims, and adjustments against the correct dealer account." },
    { icon:"📊", title:"Ageing & Recovery Priority",  desc:"30/60/90-day buckets so recovery effort goes to the accounts that actually matter." },
    { icon:"🏬", title:"Warehouse Stock Control",     desc:"Bin-level stock, reorder alerts, and transfers between warehouses in one dashboard." },
    { icon:"💹", title:"Dealer-Wise Profitability",   desc:"Net margin per dealer after discounts, schemes, and returns — not just gross sales." },
  ],
  retail: [
    { icon:"🖥️", title:"POS Billing & Barcode",      desc:"Fast counter billing with barcode scanning, held bills, and multiple payment modes." },
    { icon:"💵", title:"Shift & Cash Close",          desc:"Open and close cashier shifts with a report of cash, card, and digital collections." },
    { icon:"📦", title:"Live Shelf & Store Stock",    desc:"Purchases and sales move stock instantly, so shelf and system counts stay together." },
    { icon:"🏪", title:"Multi-Store Transfers",       desc:"Move stock between outlets with request, approval, and receipt — nothing goes untracked." },
    { icon:"🎯", title:"Loyalty & Customer History",  desc:"Recognise repeat customers, track their purchase history, and run point-based loyalty." },
    { icon:"🔔", title:"Reorder Level Alerts",        desc:"Automatic low-stock alerts per store so best-sellers never go empty on the shelf." },
    { icon:"👥", title:"Staff Shifts & Commission",   desc:"Sales per cashier and per salesperson with commission calculated from actual bills." },
    { icon:"📊", title:"Store-Wise P&L",              desc:"Compare revenue, cost, and margin across outlets side by side from one dashboard." },
  ],
  import_company: [
    { icon:"🚢", title:"Shipment / Consignment File", desc:"One file per shipment — supplier, BL, container, ETA, and every related cost line." },
    { icon:"🏦", title:"LC & TT Tracking",            desc:"Track letters of credit and telegraphic transfers, their margins, maturity, and retirement." },
    { icon:"🛃", title:"Landed Cost Build-Up",        desc:"Apportion freight, duty, insurance, clearing, and port charges across items by value or weight." },
    { icon:"📦", title:"Goods in Transit",            desc:"Keep in-transit consignments on the books, then convert to stock via GRN on clearance." },
    { icon:"💱", title:"Multi-Currency & FX",         desc:"Buy in USD/EUR and sell locally, with exchange gain and loss posted automatically." },
    { icon:"📤", title:"Export Invoice & Packing List",desc:"Generate export invoices, packing lists, and shipment documents from the same order." },
    { icon:"📄", title:"Supplier & Bank Documents",   desc:"Keep proforma invoices, BLs, insurance covers, and bank advices attached to the shipment." },
    { icon:"📊", title:"Shipment-Wise Profit",        desc:"Landed cost against realised sale value — margin per consignment, not just per month." },
  ],
  clearing_forwarding: [
    { icon:"🗂️", title:"Job File per Consignment",   desc:"Open a job for every consignment — client, BL, container, mode, and all costs attached." },
    { icon:"💵", title:"Reimbursable vs Agency Fee",  desc:"Money spent on behalf of a client stays separate from your service income and margin." },
    { icon:"🛃", title:"Duty & Port Charge Log",      desc:"Duty, terminal handling, port dues, and examination charges recorded against the exact job." },
    { icon:"📄", title:"Document Set Checklist",      desc:"BL, invoice, packing list, GD, and delivery order tracked per file so clearance never stalls." },
    { icon:"🚚", title:"Transporter & Vendor Bills",  desc:"Capture haulier, labour, and warehouse bills and recover them on the client invoice." },
    { icon:"⏱️", title:"Demurrage & Detention",      desc:"Log free-time expiry and charges as they accrue so nothing is absorbed unbilled." },
    { icon:"📒", title:"Client Statements",           desc:"A running statement per client covering advances, disbursements, and agency invoices." },
    { icon:"📊", title:"Job-Wise & Client P&L",       desc:"Profit on a file the day it clears, and profitability per client over any period." },
  ],
  manufacturing: [
    { icon:"⚙️", title:"Bill of Materials (BOM)",    desc:"Define components, quantities, and wastage allowance per finished product and revision." },
    { icon:"🏭", title:"Production Orders",           desc:"Plan a run, issue material against it, and record output — all linked to one order." },
    { icon:"📦", title:"Raw Material & Store Control",desc:"Store-wise raw material stock with issue slips, returns to store, and reorder alerts." },
    { icon:"🔄", title:"Work-in-Progress Valuation",  desc:"Value what is on the shop floor so your stock and balance sheet reflect reality." },
    { icon:"💰", title:"Labour & Overhead Costing",   desc:"Add labour, machine, and overhead rates to material cost for a true cost per unit." },
    { icon:"🗑️", title:"Scrap, Rework & Wastage",    desc:"Record scrap and rework per batch and see the real wastage percentage over time." },
    { icon:"🔍", title:"Batch & Lot Traceability",    desc:"Trace a finished batch back to the exact raw material lots that went into it." },
    { icon:"📊", title:"Product Profitability",       desc:"Compare cost per unit against selling price by product, batch, and period." },
  ],
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
  trading: [
    { q:"Can I import my existing items, parties, and opening balances?", a:"Yes. Items, customers, suppliers, and opening balances all import from Excel or CSV, so you can start from your current position instead of entering history again." },
    { q:"How is cost price calculated on each sale?", a:"You choose weighted average or FIFO per company. Every purchase updates the cost automatically, so the margin shown on a sales invoice reflects what you actually paid for that stock." },
    { q:"One customer pays a lump sum against five invoices — how is that handled?", a:"A receipt can be allocated across multiple invoices, fully or partly. Anything unallocated stays as an advance on the party account and can be applied to a later invoice." },
    { q:"Can I track stock across more than one godown?", a:"Yes. Stock is maintained per location with transfer entries between them, and every movement carries a date, reference, and user in the audit trail." },
    { q:"Does it handle purchase and sales returns properly?", a:"Yes. A debit or credit note reverses both the stock movement and the party ledger in a single entry, so inventory and receivables stay in agreement." },
    { q:"How long does setup take for a trading business?", a:"Most trading companies are posting live invoices the same day. Chart of accounts, tax settings, and invoice templates come pre-configured and can be adjusted as you go." },
  ],
  distribution: [
    { q:"How does daily van or route settlement work?", a:"Stock issued to a route in the morning is settled at day close against invoices raised, goods returned, and cash collected. Any difference is shown before the settlement is confirmed." },
    { q:"Can each depot run independently while head office sees everything?", a:"Yes. Depot staff see only their own location, while head office gets a consolidated view plus depot-wise and route-wise profitability." },
    { q:"Are retailer credit limits actually enforced?", a:"Yes. You set a credit limit and overdue-days rule per retailer, and billing either warns or blocks when an order crosses it — the choice is yours per company." },
    { q:"Can we handle free-goods schemes and trade discounts?", a:"Yes. Schemes and slab discounts are configured centrally and applied automatically at billing, so every route bills the same customer on the same terms." },
    { q:"Is salesman commission calculated on sales or on recovery?", a:"Either. Commission can be based on invoiced sales or on amounts actually collected, with returns deducted before the payout is calculated." },
    { q:"Can we track near-expiry and slow-moving stock at branches?", a:"Yes. Stock ageing and expiry reports run per depot, so short-dated inventory is pushed out to routes before it turns into a write-off." },
  ],
  wholesale: [
    { q:"Can different dealers have different rates for the same item?", a:"Yes. You define rate slabs by quantity, dealer category, or region, and the correct rate is applied automatically at billing — no manual override needed." },
    { q:"How are credit limits controlled for large dealers?", a:"Each dealer has an approved limit and overdue-days rule. Orders crossing either trigger a warning or a block, and total exposure per dealer is always visible on the dashboard." },
    { q:"Can I send dealers their ledger statement?", a:"Yes. A dealer statement covering invoices, returns, discounts, and payments can be generated for any period and shared as a PDF over email or WhatsApp." },
    { q:"How are damaged-goods returns and scheme claims recorded?", a:"As credit notes against the dealer account. Stock, ledger, and dealer profitability all update together, so claims stop being informal adjustments." },
    { q:"Does it show profit per dealer, not just total sales?", a:"Yes. Dealer profitability is calculated after discounts, schemes, and returns, so you can see which high-turnover accounts are actually low margin." },
    { q:"Can I run bulk price revisions?", a:"Yes. Rates can be revised in bulk by item group, dealer category, or slab, with the effective date recorded so older invoices keep their original pricing." },
  ],
  retail: [
    { q:"Does FinovaOS include its own POS, or do I need separate software?", a:"A full POS is included — barcode scanning, held bills, discounts, returns, and multiple payment modes. Daily sales from an existing POS can also be imported via CSV." },
    { q:"How does end-of-day cash reconciliation work?", a:"Each cashier opens and closes a shift. At close, the system shows expected cash, card, and digital collections against what was actually counted, and records the difference." },
    { q:"Can I manage several outlets from one account?", a:"Yes. Each outlet keeps its own stock, sales, and staff, while the owner sees a consolidated dashboard and store-by-store comparison of revenue and margin." },
    { q:"How are transfers between stores handled?", a:"Through a request, approval, and receipt flow. Stock leaves the sending store only when dispatched and enters the receiving store only when accepted, so in-transit stock is never lost." },
    { q:"Does it support a loyalty or repeat-customer programme?", a:"Yes. Customers can be identified at the counter by phone number, with purchase history and point-based loyalty tracked against the same profile." },
    { q:"Can salespeople be paid commission on counter sales?", a:"Yes. Bills can be tagged to a salesperson, and commission is calculated from actual invoiced or collected amounts with returns deducted." },
  ],
  import_company: [
    { q:"How is landed cost calculated for a consignment?", a:"Freight, duty, insurance, clearing, port charges, and inland transport are attached to the shipment file and apportioned across items by value, quantity, or weight — so each item carries its true cost." },
    { q:"Can I track goods that are shipped but not yet cleared?", a:"Yes. In-transit consignments stay visible as goods in transit and convert into stock through a GRN once customs clearance is done." },
    { q:"How are LC and TT payments recorded?", a:"Each LC or TT is linked to its shipment with margin, maturity, and retirement tracked, so bank exposure per supplier and per consignment is always clear." },
    { q:"Does it handle exchange rate differences?", a:"Yes. Purchases in foreign currency are revalued on payment, and the exchange gain or loss is posted automatically instead of being buried in cost." },
    { q:"Can I do exports from the same account?", a:"Yes. Export invoices, packing lists, and shipping documents are generated from the same order flow, with the customer billed in their currency." },
    { q:"Can I compare landed cost against my actual selling price?", a:"Yes. Shipment-wise profit reports put realised sale value against landed cost, so margin is known per consignment rather than only at month end." },
  ],
  clearing_forwarding: [
    { q:"How does job-wise costing work for a clearing agent?", a:"Every consignment gets a job file. Duty, port charges, transport, labour, and your agency fee are all posted to that job, so profit per file is available the day it closes." },
    { q:"Can I separate money spent on a client's behalf from my own income?", a:"Yes. Reimbursable disbursements and agency income are recorded separately, so your service margin is never inflated by duty paid on someone else's account." },
    { q:"Can I track document sets per consignment?", a:"Yes. BL, commercial invoice, packing list, GD, and delivery order are tracked as a checklist on the job file, so a missing document is caught before it delays clearance." },
    { q:"How are demurrage and detention charges handled?", a:"They are logged against the job as they accrue and flagged for recovery, so charges are billed back to the client instead of quietly absorbed." },
    { q:"Can I give each client a running statement?", a:"Yes. Client statements show advances received, disbursements made on their behalf, and agency invoices raised, with the closing balance at any date." },
    { q:"Does it work for both sea and air consignments?", a:"Yes. Mode, port, terminal, and carrier are recorded per job, so sea, air, and land movements are tracked in the same system with their own cost heads." },
  ],
  manufacturing: [
    { q:"How does BOM-based production work?", a:"Define the bill of materials for each product. When a production order is created, raw material is issued against the BOM, consumption is recorded, and finished goods are added to stock at calculated cost." },
    { q:"Can I include labour and overheads in product cost?", a:"Yes. Labour, machine, and overhead rates can be applied per production order or per unit, giving a cost per unit that reflects more than just material." },
    { q:"Is work-in-progress valued?", a:"Yes. Material issued to an open production order sits in WIP until output is recorded, so stock on the shop floor is reflected in your books instead of disappearing." },
    { q:"How is scrap and rework recorded?", a:"Scrap and rework quantities are recorded against the production order, so actual wastage per batch can be compared against the allowance defined in the BOM." },
    { q:"Can I trace a finished batch back to its raw materials?", a:"Yes. Batch and lot tracking links every finished batch to the raw material lots consumed, which matters for recalls and quality investigations." },
    { q:"Does it work for job-order manufacturing as well as batch production?", a:"Yes. Production orders can be raised against a customer order or for stock, and costing works the same way in both cases." },
  ],
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
    { q:"Can it handle insurance and TPA billing?", a:"Yes — insurance claims, TPA approvals, and settlement tracking are built in, alongside standard patient billing." },
    { q:"Does it track pharmacy stock by batch and expiry?", a:"Yes — batch-wise and expiry-wise drug tracking with automatic reorder alerts before stock runs out." },
    { q:"Can multiple doctors and departments use it together?", a:"Yes — each doctor and department has isolated scheduling and billing that rolls up into one consolidated report." },
  ],
  Education: [
    { q:"Can I set different fee structures per class or campus?", a:"Yes — fee structures are configured independently per class, session, and campus." },
    { q:"Does it flag overdue fee accounts automatically?", a:"Yes — defaulter alerts are generated automatically so follow-ups never get missed." },
    { q:"Can I run payroll for teaching and non-teaching staff together?", a:"Yes — payroll covers both with separate deduction and advance rules where needed." },
  ],
  Hospitality: [
    { q:"Does it work with a kitchen display system?", a:"Yes — orders route directly to a kitchen display, removing paper tickets entirely." },
    { q:"Can I track food cost per recipe?", a:"Yes — recipe costing ties ingredient stock to each dish so true food cost is always visible." },
    { q:"How is end-of-day cash reconciled?", a:"Every shift closes with a report comparing expected vs counted cash, card, and digital payments." },
  ],
  Production: [
    { q:"Can I compare standard cost against actual cost per batch?", a:"Yes — variance analysis shows standard vs actual cost per production run so inefficiencies are visible immediately." },
    { q:"Is work-in-progress tracked separately from finished goods?", a:"Yes — raw material, WIP, and finished goods are tracked as separate stock states." },
  ],
  Logistics: [
    { q:"Can I see profit per vehicle, not just per trip?", a:"Yes — route profitability reports net revenue against all costs for each vehicle." },
    { q:"How is COD cash reconciled with drivers?", a:"Cash-on-delivery collections are logged per trip and settled against each driver at day close." },
  ],
  "Food & Beverage": [
    { q:"Does it support delivery-app payment reconciliation?", a:"Yes — cash, card, and delivery-platform payouts are tracked and reconciled separately at shift close." },
    { q:"Can I cost each menu item accurately?", a:"Yes — recipe-based costing calculates true cost per dish from ingredient stock." },
  ],
  Construction: [
    { q:"Can I track budgeted vs actual cost per project?", a:"Yes — BOQ-based estimation is compared against live site expenses throughout the project." },
    { q:"How are subcontractor payments handled?", a:"Work orders, progress tracking, and subcontractor bill settlement are all recorded against the project." },
  ],
  "Real Estate": [
    { q:"Does it auto-generate monthly rent invoices?", a:"Yes — recurring rent invoices are generated automatically per lease schedule." },
    { q:"Can I see income and expenses per property?", a:"Yes — owner reports break down rental income vs expenses property by property." },
  ],
  Technology: [
    { q:"Can it handle recurring subscription billing?", a:"Yes — any billing cycle is supported with automatic invoice generation and renewal alerts." },
    { q:"Does it track MRR and churn?", a:"Yes — a live MRR/ARR dashboard tracks growth, expansion, contraction, and churn automatically." },
  ],
  Transport: [
    { q:"Can I see profit per vehicle, not just per trip?", a:"Yes — route profitability reports net revenue against all costs for each vehicle." },
    { q:"How is COD cash reconciled with drivers?", a:"Cash-on-delivery collections are logged per trip and settled against each driver at day close." },
  ],
  "Non-Profit": [
    { q:"Can I track restricted vs unrestricted funds separately?", a:"Yes — fund accounting keeps restricted and unrestricted balances fully separate." },
    { q:"Can I generate donor-ready grant reports?", a:"Yes — expense reports per grant, fund, or programme are generated in one click." },
  ],
  Agriculture: [
    { q:"Can I track profitability per crop season?", a:"Yes — input costs and harvest income are tracked per crop and season for a true seasonal P&L." },
  ],
  Automotive: [
    { q:"Can I track full service history per vehicle?", a:"Yes — job cards, parts used, and warranty are tied to each vehicle's history." },
    { q:"Are salesperson commissions calculated automatically?", a:"Yes — commissions are auto-calculated per vehicle sale by rep and month." },
  ],
  "Media & Advertising": [
    { q:"Can I see campaign profit per client?", a:"Yes — campaign P&L nets all vendor and media costs against client billing." },
    { q:"Does it track unbilled creative hours?", a:"Yes — timesheets flag hours that haven't yet been billed to a client." },
  ],
  "Beauty & Wellness": [
    { q:"Can I calculate staff commissions automatically?", a:"Yes — stylist and therapist commissions are calculated per service automatically." },
    { q:"Does it support prepaid packages and memberships?", a:"Yes — package cards and memberships track remaining balance per client." },
  ],
  Repair: [
    { q:"Can customers see live repair status?", a:"Yes — job cards move through statuses that customers can be updated on in real time." },
    { q:"Does it track parts inventory for repairs?", a:"Yes — real-time parts stock with reorder alerts so jobs are never turned away." },
  ],
  Energy: [
    { q:"Can I bill AMC contracts automatically?", a:"Yes — annual maintenance contracts auto-invoice on renewal dates." },
    { q:"Does it track equipment installed per customer?", a:"Yes — a customer asset register keeps installed panels, inverters, and meters on file." },
  ],
  default: [
    { q:"Can I import my existing data?", a:"Yes — items, parties, and opening balances import from Excel or CSV." },
    { q:"How long does setup take?", a:"Most businesses are posting live transactions the same day." },
  ],
};

const PLAN_ROWS: Record<string, { feature:string; starter:string|boolean; pro:string|boolean; enterprise:string|boolean }[]> = {
  default: [
    { feature:"Users",                    starter:"3",      pro:"10",     enterprise:"25" },
    { feature:"Sales & purchase invoicing",starter:true,     pro:true,     enterprise:true },
    { feature:"Inventory management",     starter:false,     pro:true,     enterprise:true },
    { feature:"Bank reconciliation",      starter:false,     pro:true,     enterprise:true },
    { feature:"HR & payroll",             starter:false,     pro:true,     enterprise:true },
    { feature:"Multi-branch",             starter:false,     pro:"Up to 3", enterprise:"Up to 10" },
    { feature:"API & webhooks",           starter:false,     pro:false,    enterprise:true },
    { feature:"Priority support 24/7",    starter:false,     pro:false,    enterprise:true },
  ],
};

const PHASE_COLORS: Record<number,string> = { 1:"var(--tx-34d399, #34d399)", 2:"var(--tx-818cf8, #818cf8)", 3:"var(--tx-fbbf24, #fbbf24)", 4:"var(--tx-94a3b8, #94a3b8)" };

function key<T>(id: string, category: string, table: Record<string, T>): T {
  return table[id] ?? table[category] ?? table.default;
}

function Cell({ val }: { val: string|boolean }) {
  if (val===true)  return <span style={{ color:"var(--tx-34d399, #34d399)", fontSize:16, fontWeight:700 }}>✓</span>;
  if (val===false) return <span style={{ color:"rgba(var(--ink),var(--ta-15, .15))", fontSize:16 }}>—</span>;
  return <span style={{ fontSize:12, fontWeight:700, color:"rgba(var(--ink),.75)" }}>{val as string}</span>;
}

export default function IndustryPageClient({
  type,
  industry,
  initialPrices,
}: {
  type: BizType;
  industry: string;
  initialPrices: { starter: number; pro: number; enterprise: number };
}) {
  const router = useRouter();
  const [notified, setNotified] = useState(false);
  const [email,    setEmail]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [openFaq,  setOpenFaq]  = useState<number|null>(null);
  const prices = initialPrices;

  // Currency is genuinely visitor-specific (geo-IP based), so it's the one
  // thing that still needs a client-side round trip after the real content
  // has already been server-rendered in USD.
  useEffect(() => {
    fetch("/api/public/geo",{cache:"no-store"}).then(r=>r.json()).then(d=>{ if(d?.currency) setCurrency(d.currency); }).catch(()=>{});
  }, []);

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
    return formatFromUSD(usd, currency);
  }

  const ff = "'Outfit','DM Sans',sans-serif";

  const phaseColor = PHASE_COLORS[type.phase];
  const features  = key(type.id, type.category, FEATURES);
  const painPts   = key(type.id, type.category, PAIN_POINTS);
  const workflow  = key(type.id, type.category, WORKFLOWS);
  const stats     = key(type.id, type.category, STATS);
  const faqs      = key(type.id, type.category, FAQS);
  const planRows  = key(type.id, type.category, PLAN_ROWS);

  const PLANS = [
    { key:"starter",    name:"Starter",      price:prices.starter,    color:"var(--tx-818cf8, #818cf8)", gradient:"linear-gradient(135deg,#6366f1,#4f46e5)" },
    { key:"pro",        name:"Professional", price:prices.pro,        color:"var(--tx-a5b4fc, #a5b4fc)", gradient:"linear-gradient(135deg,#818cf8,#6366f1)", featured:true },
    { key:"enterprise", name:"Enterprise",   price:prices.enterprise, color:"var(--tx-34d399, #34d399)", gradient:"linear-gradient(135deg,#059669,#34d399)" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,var(--dk-060918, #060918) 0%,var(--dk-080c22, #080c22) 60%,var(--dk-0a0f2a, #0a0f2a) 100%)", fontFamily:ff, color:"var(--ink-solid, white)" }}>
      <style>{`

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
          display:"flex", alignItems:"center", gap:8, background:"none", border:"1px solid rgba(var(--ink),.1)",
          borderRadius:10, padding:"7px 16px", color:"rgba(var(--ink),var(--ta-50, .5))", fontSize:12,
          fontWeight:600, cursor:"pointer", fontFamily:ff, transition:"all .2s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(var(--ink),.25)";e.currentTarget.style.color="rgba(var(--ink),.8)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(var(--ink),.1)";e.currentTarget.style.color="rgba(var(--ink),var(--ta-50, .5))";}}
        >← Back</button>
        <Link href="/solutions" style={{ fontSize:12, color:"rgba(var(--ink),var(--ta-35, .35))", textDecoration:"none", fontWeight:600 }}>All Industries →</Link>
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
            color: type.isLive ? "var(--tx-34d399, #34d399)" : "var(--tx-fbbf24, #fbbf24)",
          }}>
            {type.isLive ? "🟢 Live Now" : `⏳ Phase ${type.phase} — Coming Soon`}
          </span>
        </div>

        <h1 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(34px,5.5vw,62px)", fontWeight:700, letterSpacing:"-2px", lineHeight:1.08, margin:"0 0 16px" }}>
          FinovaOS for{" "}
          <span style={{ fontStyle:"italic", background:`linear-gradient(135deg,${phaseColor},var(--tx-6366f1, #6366f1))`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            {type.label}
          </span>
        </h1>
        <p style={{ fontSize:18, color:"rgba(var(--ink),var(--ta-45, .45))", maxWidth:580, margin:"0 auto 40px", lineHeight:1.75 }}>
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
              padding:"14px 32px", borderRadius:14, background:"rgba(var(--ink),.06)",
              border:"1px solid rgba(var(--ink),.14)", color:"rgba(var(--ink),.75)",
              fontWeight:700, fontSize:15, textDecoration:"none", transition:"all .25s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(var(--ink),.1)";e.currentTarget.style.color="var(--ink-solid, white)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(var(--ink),.06)";e.currentTarget.style.color="rgba(var(--ink),.75)";}}
            >View Pricing</Link>
          </div>
        ) : (
          <div style={{ maxWidth:460, margin:"0 auto" }}>
            {notified ? (
              <div style={{ padding:"20px 28px", borderRadius:16, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.3)", color:"var(--tx-34d399, #34d399)", fontWeight:700, fontSize:15 }}>
                ✅ You&apos;re on the list! We&apos;ll email you when {type.label} goes live.
              </div>
            ) : (
              <div style={{ padding:"28px 32px", borderRadius:20, background:"rgba(var(--ink),.04)", border:"1px solid rgba(var(--ink),.1)" }}>
                <p style={{ fontSize:14, color:"rgba(var(--ink),var(--ta-50, .5))", marginBottom:16, fontWeight:600 }}>🔔 Get notified when {type.label} launches</p>
                <div style={{ display:"flex", gap:10 }}>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
                    onKeyDown={e=>e.key==="Enter"&&joinWaitlist()}
                    style={{ flex:1, padding:"12px 16px", borderRadius:10, background:"rgba(var(--ink),.07)", border:"1px solid rgba(var(--ink),.12)", color:"var(--ink-solid, white)", fontSize:14, outline:"none", fontFamily:ff }}
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
      <div style={{ borderTop:"1px solid rgba(var(--ink),.06)", borderBottom:"1px solid rgba(var(--ink),.06)", background:"rgba(var(--ink),.02)", padding:"36px 24px" }}>
        <div className="stat-grid" style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:0 }}>
          {(stats as {val:string;label:string}[]).map((s,i) => (
            <div key={i} style={{ textAlign:"center", padding:"0 24px", borderRight: i<2?"1px solid rgba(var(--ink),.06)":undefined }}>
              <div style={{ fontFamily:"'Lora',serif", fontSize:"clamp(28px,4vw,42px)", fontWeight:700, color:phaseColor, letterSpacing:"-1px" }}>{s.val}</div>
              <div style={{ fontSize:13, color:"rgba(var(--ink),var(--ta-40, .4))", fontWeight:500, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── THE PROBLEM ── */}
      <div style={{ maxWidth:1000, margin:"0 auto", padding:"80px 24px 0" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"5px 14px", borderRadius:20, background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.25)", fontSize:11, fontWeight:700, color:"var(--tx-f87171, #f87171)", letterSpacing:".08em", marginBottom:18 }}>
            ⚠️ THE PROBLEM
          </div>
          <h2 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(22px,3vw,34px)", fontWeight:700, letterSpacing:"-1px", margin:"0 0 10px" }}>
            What breaks without a proper system
          </h2>
          <p style={{ fontSize:15, color:"rgba(var(--ink),var(--ta-38, .38))", maxWidth:480, margin:"0 auto" }}>
            These are the exact pain points {type.label} businesses face before switching to FinovaOS.
          </p>
        </div>
        <div className="pain-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {(painPts as {icon:string;text:string}[]).map((p,i) => (
            <div key={i} style={{ padding:"22px 20px", borderRadius:16, background:"rgba(239,68,68,.04)", border:"1px solid rgba(239,68,68,.14)", display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ fontSize:28 }}>{p.icon}</div>
              <p style={{ fontSize:13.5, color:"rgba(var(--ink),var(--ta-55, .55))", lineHeight:1.7, margin:0 }}>{p.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── WORKFLOW ── */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"80px 24px 0" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"5px 14px", borderRadius:20, background:`color-mix(in srgb, ${phaseColor} 7.8%, transparent)`, border:`1px solid color-mix(in srgb, ${phaseColor} 20.8%, transparent)`, fontSize:11, fontWeight:700, color:phaseColor, letterSpacing:".08em", marginBottom:18 }}>
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
                background:`color-mix(in srgb, ${phaseColor} 6.3%, transparent)`, border:`1px solid color-mix(in srgb, ${phaseColor} 18.8%, transparent)`,
                minWidth:120, textAlign:"center",
              }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:phaseColor, color:"#0f172a", fontWeight:900, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>{i+1}</div>
                <div style={{ fontSize:12, fontWeight:700, color:"rgba(var(--ink),.8)", lineHeight:1.35 }}>{step}</div>
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
            Everything your {type.label} business needs
          </h2>
          <p style={{ fontSize:15, color:"rgba(var(--ink),var(--ta-40, .4))", maxWidth:480, margin:"0 auto" }}>
            Pre-configured for your industry — get started in minutes, not days.
          </p>
        </div>
        <div className="feat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
          {(features as {icon:string;title:string;desc:string}[]).map((f,i) => (
            <div key={i} style={{ padding:"22px 20px", borderRadius:18, background:"rgba(var(--ink),.03)", border:"1px solid rgba(var(--ink),.08)", transition:"all .25s" }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(var(--ink),.06)";e.currentTarget.style.borderColor=`color-mix(in srgb, ${phaseColor} 25.1%, transparent)`;e.currentTarget.style.transform="translateY(-3px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(var(--ink),.03)";e.currentTarget.style.borderColor="rgba(var(--ink),.08)";e.currentTarget.style.transform="translateY(0)";}}
            >
              <div style={{ fontSize:26, marginBottom:12 }}>{f.icon}</div>
              <div style={{ fontSize:14, fontWeight:800, color:"var(--ink-solid, white)", marginBottom:7, lineHeight:1.3 }}>{f.title}</div>
              <div style={{ fontSize:12.5, color:"rgba(var(--ink),var(--ta-42, .42))", lineHeight:1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PLAN COMPARISON ── */}
      <div style={{ maxWidth:1000, margin:"80px auto 0", padding:"0 24px" }}>
        <h2 style={{ textAlign:"center", fontFamily:"'Lora',serif", fontSize:"clamp(22px,3vw,34px)", fontWeight:700, letterSpacing:"-1px", marginBottom:10 }}>
          Which plan suits your {type.label} business?
        </h2>
        <p style={{ textAlign:"center", color:"rgba(var(--ink),var(--ta-40, .4))", fontSize:15, marginBottom:40 }}>
          All plans include core accounting. Higher plans unlock more {type.label.toLowerCase()} features.
        </p>

        <div style={{ borderRadius:20, overflow:"hidden", border:"1px solid rgba(var(--ink),.08)", background:"rgba(var(--ink),.02)" }}>
          {/* Headers */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", borderBottom:"1px solid rgba(var(--ink),.08)", background:"rgba(var(--ink),.02)" }}>
            <div style={{ padding:"20px 24px", fontSize:11, fontWeight:700, color:"rgba(var(--ink),var(--ta-30, .3))", textTransform:"uppercase", letterSpacing:".06em" }}>Feature</div>
            {PLANS.map(p => (
              <div key={p.key} style={{ padding:"20px 16px", textAlign:"center", borderLeft:"1px solid rgba(var(--ink),.06)", background:p.featured?"rgba(99,102,241,.06)":"transparent" }}>
                {p.featured && <div style={{ fontSize:9, fontWeight:800, color:"var(--tx-fbbf24, #fbbf24)", letterSpacing:".08em", marginBottom:4 }}>POPULAR</div>}
                <div style={{ fontSize:12, fontWeight:900, color:p.color, marginBottom:4 }}>{p.name}</div>
                <div style={{ fontSize:16, fontWeight:800, color:"var(--ink-solid, white)" }}>{fmtPrice(p.price)}<span style={{ fontSize:10, color:"rgba(var(--ink),var(--ta-40, .4))", fontWeight:500 }}>/mo</span></div>
              </div>
            ))}
          </div>
          {/* Rows */}
          {(planRows as any[]).map((row:any,i:number) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", borderBottom:"1px solid rgba(var(--ink),.04)", background:i%2?"rgba(var(--ink),.01)":"transparent" }}>
              <div style={{ padding:"13px 24px", fontSize:13, color:"rgba(var(--ink),var(--ta-60, .6))" }}>{row.feature}</div>
              {(["starter","pro","enterprise"] as const).map(k => (
                <div key={k} style={{ padding:"13px 16px", textAlign:"center", borderLeft:"1px solid rgba(var(--ink),.04)", background:k==="pro"?"rgba(99,102,241,.03)":"transparent" }}>
                  <Cell val={row[k]} />
                </div>
              ))}
            </div>
          ))}
          {/* CTA row */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", background:"rgba(var(--ink),.02)", borderTop:"1px solid rgba(var(--ink),.08)" }}>
            <div style={{ padding:"20px 24px", fontSize:12, color:"rgba(var(--ink),var(--ta-28, .28))" }}>
              {type.isLive ? "🔥 50% off — first 3 months" : "⏳ Launching soon — join the waitlist"}
            </div>
            {PLANS.map(p => (
              <div key={p.key} style={{ padding:"14px", textAlign:"center", borderLeft:"1px solid rgba(var(--ink),.06)", background:p.featured?"rgba(99,102,241,.06)":"transparent" }}>
                {type.isLive ? (
                  <Link href={`/onboarding/signup/${p.key==="pro"?"professional":p.key}?businessType=${type.id}`} style={{
                    display:"block", padding:"10px 0", borderRadius:10,
                    background:p.featured?p.gradient:"rgba(var(--ink),.07)",
                    border:p.featured?"none":`1px solid color-mix(in srgb, ${p.color} 18.8%, transparent)`,
                    color:"white", fontWeight:700, fontSize:12, textDecoration:"none",
                  }}>Get {p.name}</Link>
                ) : (
                  <div style={{
                    padding:"10px 0", borderRadius:10, fontSize:12, fontWeight:600,
                    color:"rgba(var(--ink),var(--ta-25, .25))", border:"1px solid rgba(var(--ink),.08)",
                    textAlign:"center",
                  }}>Coming Soon</div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:14 }}>
          <Link href="/pricing" style={{ fontSize:13, color:"var(--tx-818cf8, #818cf8)", textDecoration:"none", fontWeight:600 }}>View full pricing details →</Link>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ maxWidth:760, margin:"80px auto 0", padding:"0 24px" }}>
        <h2 style={{ textAlign:"center", fontFamily:"'Lora',serif", fontSize:"clamp(22px,3vw,32px)", fontWeight:700, letterSpacing:"-1px", marginBottom:10 }}>
          Common questions
        </h2>
        <p style={{ textAlign:"center", color:"rgba(var(--ink),var(--ta-38, .38))", fontSize:14, marginBottom:40 }}>
          Everything {type.label} owners ask before switching.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {(faqs as {q:string;a:string}[]).map((faq,i) => (
            <div key={i} style={{ borderRadius:14, border:"1px solid rgba(var(--ink),.08)", background:"rgba(var(--ink),.02)", overflow:"hidden" }}>
              <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{
                width:"100%", padding:"18px 20px", background:"none", border:"none",
                color:"var(--ink-solid, white)", fontFamily:ff, fontSize:14, fontWeight:700, textAlign:"left",
                cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12,
              }}>
                <span>{faq.q}</span>
                <span style={{ color:phaseColor, fontSize:18, flexShrink:0, transition:"transform .2s", transform:openFaq===i?"rotate(45deg)":"rotate(0)" }}>+</span>
              </button>
              {openFaq===i && (
                <div style={{ padding:"0 20px 18px", fontSize:13.5, color:"rgba(var(--ink),var(--ta-52, .52))", lineHeight:1.75, borderTop:"1px solid rgba(var(--ink),.06)" }}>
                  <div style={{ paddingTop:14 }}>{faq.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{ maxWidth:800, margin:"80px auto", padding:"0 24px" }}>
        <div style={{ borderRadius:24, padding:"60px 40px", textAlign:"center", background:`linear-gradient(135deg,color-mix(in srgb, ${phaseColor} 7.1%, transparent),rgba(99,102,241,.06))`, border:`1px solid color-mix(in srgb, ${phaseColor} 14.5%, transparent)`, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle,color-mix(in srgb, ${phaseColor} 9.4%, transparent),transparent 70%)`, top:-100, right:-80, pointerEvents:"none" }}/>
          <div style={{ position:"relative" }}>
            <div style={{ fontSize:52, marginBottom:18 }}>{type.icon}</div>
            <h3 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(22px,3.5vw,36px)", fontWeight:700, letterSpacing:"-1px", marginBottom:12 }}>
              Ready to transform your {type.label} business?
            </h3>
            <p style={{ color:"rgba(var(--ink),var(--ta-45, .45))", fontSize:15, marginBottom:36, lineHeight:1.75, maxWidth:500, margin:"0 auto 36px" }}>
              Join businesses already running on FinovaOS. Set up in under 30 minutes and start managing your operations from day one.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:24 }}>
              {type.isLive ? (
                <>
                  <Link href={`/onboarding/choose-plan?businessType=${type.id}`} style={{ padding:"14px 36px", borderRadius:13, background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"white", fontWeight:800, fontSize:15, textDecoration:"none", boxShadow:"0 6px 24px rgba(99,102,241,.4)" }}>
                    Get Started →
                  </Link>
                  <Link href="/contact" style={{ padding:"14px 28px", borderRadius:13, background:"rgba(var(--ink),.07)", border:"1px solid rgba(var(--ink),.14)", color:"rgba(var(--ink),.75)", fontWeight:700, fontSize:15, textDecoration:"none" }}>
                    Talk to Sales
                  </Link>
                </>
              ) : (
                <Link href="/solutions" style={{ padding:"14px 36px", borderRadius:13, background:`color-mix(in srgb, ${phaseColor} 9.4%, transparent)`, border:`1px solid color-mix(in srgb, ${phaseColor} 25.1%, transparent)`, color:phaseColor, fontWeight:700, fontSize:15, textDecoration:"none" }}>
                  Browse live industries →
                </Link>
              )}
            </div>
            {/* Trust signals */}
            <div style={{ display:"flex", justifyContent:"center", gap:24, flexWrap:"wrap" }}>
              {["✓ 10-min setup","✓ 14-day money-back","✓ Cancel anytime","✓ Dedicated support"].map(t => (
                <span key={t} style={{ fontSize:12, color:"rgba(var(--ink),var(--ta-30, .3))", fontWeight:600 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer nav ── */}
      <div style={{ borderTop:"1px solid rgba(var(--ink),.05)", padding:"28px 24px", textAlign:"center" }}>
        <div style={{ display:"flex", gap:24, justifyContent:"center", flexWrap:"wrap" }}>
          {[{href:"/",label:"Home"},{href:"/solutions",label:"All Industries"},{href:"/features",label:"Features"},{href:"/pricing",label:"Pricing"},{href:"/contact",label:"Contact"}].map(l => (
            <Link key={l.href} href={l.href} style={{ color:"rgba(var(--ink),var(--ta-30, .3))", fontSize:12, fontWeight:600, textDecoration:"none", transition:"color .2s" }}
              onMouseEnter={e=>{e.currentTarget.style.color="rgba(var(--ink),var(--ta-70, .7))";}}
              onMouseLeave={e=>{e.currentTarget.style.color="rgba(var(--ink),var(--ta-30, .3))";}}
            >{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
