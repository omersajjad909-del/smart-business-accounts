"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getBusinessType, type BusinessType } from "@/lib/businessModules";

type CompanyInfo = {
  name: string;
  businessType: BusinessType;
  plan: string;
  subscriptionStatus: string;
  country?: string | null;
  baseCurrency?: string | null;
};

// â”€â”€â”€ Business Workflow Steps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FLOW_MAP: Record<string, { step: string; icon: string; desc: string; link: string }[]> = {
  trading: [
    { step: "Receive Inquiry", icon: "ðŸ“©", desc: "Customer asks for a price. Create a professional quotation and send it in seconds.", link: "/dashboard/quotation" },
    { step: "Place Purchase Order", icon: "ðŸ›’", desc: "Source goods from suppliers. Track PO status and expected delivery dates.", link: "/dashboard/purchase-order" },
    { step: "Receive & Stock Goods", icon: "ðŸ“¦", desc: "Record goods received (GRN), update inventory levels automatically.", link: "/dashboard/inventory" },
    { step: "Invoice & Dispatch", icon: "ðŸ§¾", desc: "Create sales invoice, issue delivery challan, and dispatch to customer.", link: "/dashboard/sales-invoice" },
    { step: "Collect Payment", icon: "ðŸ’°", desc: "Record payment receipts, match against invoices, and close the receivable.", link: "/dashboard/crv" },
    { step: "Review & Grow", icon: "ðŸ“Š", desc: "Check P&L, ageing report, and AI insights to make smarter decisions.", link: "/dashboard/ai" },
  ],
  distribution: [
    { step: "Load Warehouse", icon: "ðŸ­", desc: "Stock goods in warehouse and assign to vans or delivery routes.", link: "/dashboard/inventory" },
    { step: "Plan Routes", icon: "ðŸ—ºï¸", desc: "Assign deliveries to routes and drivers. Plan trips before dispatch.", link: "/dashboard/distribution/routes" },
    { step: "Execute Delivery", icon: "ðŸšš", desc: "Driver executes route. Record van sales or deliveries against customer orders.", link: "/dashboard/distribution/van-sales" },
    { step: "Collect Payments", icon: "ðŸ’µ", desc: "Field collections matched to delivered invoices. Track pending recovery.", link: "/dashboard/distribution/collections" },
    { step: "Reconcile Trip", icon: "ðŸ“‹", desc: "Close the trip â€” match loaded stock vs sold vs returned. Create trip sheet.", link: "/dashboard/distribution/trip-sheet" },
    { step: "Analyze Performance", icon: "ðŸ“ˆ", desc: "Route-wise profitability, driver performance, and stock movement insights.", link: "/dashboard/ai" },
  ],
  retail: [
    { step: "Customer Walks In", icon: "ðŸª", desc: "Open POS terminal. Scan items or search by name. Apply loyalty points.", link: "/dashboard/retail/pos" },
    { step: "Process Sale", icon: "ðŸ’³", desc: "Quick billing with multiple payment modes â€” cash, card, or credit.", link: "/dashboard/retail/pos" },
    { step: "Manage Stock", icon: "ðŸ“¦", desc: "Inventory auto-updates on every sale. Get low-stock alerts instantly.", link: "/dashboard/inventory" },
    { step: "Branch Operations", icon: "ðŸ¢", desc: "Transfer stock between branches, track branch-wise revenue and targets.", link: "/dashboard/retail/branches" },
    { step: "Customer Loyalty", icon: "ðŸŽ", desc: "Reward repeat customers with loyalty points. Track customer purchase history.", link: "/dashboard/retail/loyalty" },
    { step: "Reports & AI", icon: "ðŸ“Š", desc: "Daily sales summary, top products, margins, and AI-powered recommendations.", link: "/dashboard/ai" },
  ],
  restaurant: [
    { step: "Reservation / Walk-in", icon: "ðŸ½ï¸", desc: "Manage table bookings or walk-in seating. See live floor plan status.", link: "/dashboard/restaurant/tables" },
    { step: "Take Order", icon: "ðŸ“", desc: "Waiter captures order by table. Items go straight to kitchen display.", link: "/dashboard/restaurant/orders" },
    { step: "Kitchen Execution", icon: "ðŸ‘¨â€ðŸ³", desc: "KDS shows real-time orders. Kitchen marks items ready as they're prepared.", link: "/dashboard/restaurant/kitchen" },
    { step: "Bill & Close Table", icon: "ðŸ§¾", desc: "Print bill, split if needed, accept payment, and clear the table.", link: "/dashboard/sales-invoice" },
    { step: "Recipe Costing", icon: "ðŸ§®", desc: "Track actual food cost per dish. Compare with selling price for margin control.", link: "/dashboard/restaurant/recipe-costing" },
    { step: "Daily Closure", icon: "ðŸ“Š", desc: "End-of-day summary â€” covers, revenue, top dishes, and waste tracking.", link: "/dashboard/ai" },
  ],
  hotel: [
    { step: "Room Booking", icon: "ðŸ“…", desc: "Take reservations online or at front desk. View live room availability grid.", link: "/dashboard/hotel/rooms" },
    { step: "Check-In Guest", icon: "ðŸ”‘", desc: "Assign room, verify ID, set rate and duration. Open guest folio.", link: "/dashboard/hotel/front-desk" },
    { step: "Housekeeping", icon: "ðŸ§¹", desc: "Assign housekeeping tasks by room. Track clean, dirty, and maintenance status.", link: "/dashboard/hotel/housekeeping" },
    { step: "Room Service", icon: "ðŸ±", desc: "Guest orders food or services. Charges auto-post to their room folio.", link: "/dashboard/hotel/room-service" },
    { step: "Guest Checkout", icon: "ðŸ’³", desc: "Review all charges on folio, process payment, and release the room.", link: "/dashboard/hotel/front-desk" },
    { step: "Revenue Reports", icon: "ðŸ“ˆ", desc: "Occupancy rate, RevPAR, top revenue sources, and AI performance insights.", link: "/dashboard/ai" },
  ],
  manufacturing: [
    { step: "Bill of Materials", icon: "ðŸ“‹", desc: "Define what raw materials and quantities go into each finished product.", link: "/dashboard/manufacturing/bom" },
    { step: "Production Order", icon: "âš™ï¸", desc: "Raise a production order when sales demand is confirmed.", link: "/dashboard/manufacturing/production-orders" },
    { step: "Work Orders", icon: "ðŸ”§", desc: "Break production into work orders by machine, shift, or department.", link: "/dashboard/manufacturing/work-orders" },
    { step: "Raw Material Consumption", icon: "ðŸ“¦", desc: "Record material issuance from stores. Update raw material stock automatically.", link: "/dashboard/manufacturing/raw-materials" },
    { step: "Finished Goods Entry", icon: "âœ…", desc: "Record completed goods into finished goods inventory with quality check.", link: "/dashboard/manufacturing/finished-goods" },
    { step: "Costing & Analysis", icon: "ðŸ“Š", desc: "See production cost vs selling price. Track efficiency and wastage.", link: "/dashboard/ai" },
  ],
  hospital: [
    { step: "Patient Registration", icon: "ðŸ‘¤", desc: "Register new patient â€” name, age, contact, and medical history.", link: "/dashboard/hospital/patients" },
    { step: "Book Appointment", icon: "ðŸ“…", desc: "Schedule consultation with doctor, assign to clinic or department.", link: "/dashboard/hospital/appointments" },
    { step: "Consultation & Prescription", icon: "ðŸ’Š", desc: "Doctor records diagnosis and prescription in patient EMR.", link: "/dashboard/hospital/prescriptions" },
    { step: "Lab Tests", icon: "ðŸ”¬", desc: "Order lab tests, track sample collection, and record results.", link: "/dashboard/hospital/lab" },
    { step: "Billing", icon: "ðŸ§¾", desc: "Generate patient bill â€” consultation, lab, medicines, procedures.", link: "/dashboard/sales-invoice" },
    { step: "Reports", icon: "ðŸ“Š", desc: "Doctor-wise revenue, patient volume, test turnaround, and insurance tracking.", link: "/dashboard/ai" },
  ],
  school: [
    { step: "Admissions", icon: "ðŸ“", desc: "Register new students, assign class, collect admission fee and documents.", link: "/dashboard/school/students" },
    { step: "Class Schedule", icon: "ðŸ—“ï¸", desc: "Create timetable, assign teachers to classes and subjects.", link: "/dashboard/school/schedule" },
    { step: "Attendance", icon: "âœ…", desc: "Daily student and teacher attendance tracking by class.", link: "/dashboard/school/attendance" },
    { step: "Examinations", icon: "ðŸ“–", desc: "Schedule exams, record marks, generate result cards and report cards.", link: "/dashboard/school/exams" },
    { step: "Fee Collection", icon: "ðŸ’µ", desc: "Issue fee challan, record payments, track defaulters by class.", link: "/dashboard/school/fees" },
    { step: "Reports & Analytics", icon: "ðŸ“Š", desc: "Class performance, fee collection status, student strength reports.", link: "/dashboard/ai" },
  ],
  pharmacy: [
    { step: "Purchase Stock", icon: "ðŸ­", desc: "Record medicines from suppliers with batch number and expiry date.", link: "/dashboard/pharmacy/purchases" },
    { step: "Batch & Expiry Control", icon: "âš ï¸", desc: "Track batches, get expiry alerts 30/60/90 days in advance.", link: "/dashboard/pharmacy/batches" },
    { step: "Prescription Sale", icon: "ðŸ’Š", desc: "Sell against prescription, deduct from inventory automatically.", link: "/dashboard/pharmacy/prescriptions" },
    { step: "Counter Sale", icon: "ðŸª", desc: "Fast OTC sales without prescription. Barcode scanning supported.", link: "/dashboard/pharmacy/counter-sales" },
    { step: "Reorder & Restock", icon: "ðŸ“¦", desc: "Get alerts when stock drops below minimum. Create purchase orders.", link: "/dashboard/purchase-order" },
    { step: "Reports", icon: "ðŸ“Š", desc: "Daily sales, expiry tracking, slow-moving drugs, and margin analysis.", link: "/dashboard/ai" },
  ],
  construction: [
    { step: "Project Setup", icon: "ðŸ—ï¸", desc: "Create project, define scope, budget, and assign project manager.", link: "/dashboard/construction/projects" },
    { step: "Site Management", icon: "ðŸ“", desc: "Track multiple sites, assign workers and materials per site.", link: "/dashboard/construction/sites" },
    { step: "BOQ & Materials", icon: "ðŸ“‹", desc: "Bill of quantities planning. Request materials from store/suppliers.", link: "/dashboard/construction/boq" },
    { step: "Subcontractor Payments", icon: "ðŸ‘·", desc: "Track subcontractor work, invoices, and retention amounts.", link: "/dashboard/construction/subcontractors" },
    { step: "Client Billing", icon: "ðŸ§¾", desc: "Progressive billing based on work completion milestones.", link: "/dashboard/sales-invoice" },
    { step: "Project P&L", icon: "ðŸ“Š", desc: "Track project-wise profit, cost overruns, and completion status.", link: "/dashboard/ai" },
  ],
  transport: [
    { step: "Fleet Setup", icon: "ðŸš›", desc: "Register vehicles â€” type, capacity, registration, insurance details.", link: "/dashboard/transport/fleet" },
    { step: "Driver Management", icon: "ðŸ‘¤", desc: "Assign drivers to vehicles. Track license expiry and performance.", link: "/dashboard/transport/drivers" },
    { step: "Trip Booking", icon: "ðŸ“‹", desc: "Book a trip â€” route, vehicle, driver, customer, and estimated cost.", link: "/dashboard/transport/trips" },
    { step: "Fuel Tracking", icon: "â›½", desc: "Record fuel consumed per trip. Track fuel efficiency per vehicle.", link: "/dashboard/transport/fuel" },
    { step: "Trip Billing", icon: "ðŸ§¾", desc: "Invoice customer for completed trip. Track freight receivables.", link: "/dashboard/sales-invoice" },
    { step: "Fleet Analytics", icon: "ðŸ“Š", desc: "Per-vehicle profitability, maintenance due alerts, and efficiency reports.", link: "/dashboard/ai" },
  ],
  real_estate: [
    { step: "Property Setup", icon: "ðŸ¢", desc: "List properties â€” type, location, size, rent/sale price, amenities.", link: "/dashboard/real-estate/properties" },
    { step: "Tenant Onboarding", icon: "ðŸ‘¤", desc: "Record tenant details, lease terms, security deposit, and start date.", link: "/dashboard/real-estate/tenants" },
    { step: "Lease Management", icon: "ðŸ“„", desc: "Track lease periods, renewal dates, and rent escalation schedule.", link: "/dashboard/real-estate/leases" },
    { step: "Rent Collection", icon: "ðŸ’µ", desc: "Generate monthly rent invoices, record payments, flag defaulters.", link: "/dashboard/real-estate/rent" },
    { step: "Maintenance", icon: "ðŸ”§", desc: "Log maintenance requests, assign to contractors, track resolution.", link: "/dashboard/maintenance" },
    { step: "Portfolio Reports", icon: "ðŸ“Š", desc: "Occupancy rate, rental yield, vacancy tracking, and property P&L.", link: "/dashboard/ai" },
  ],
};

const DEFAULT_FLOW = [
  { step: "Initial Setup", icon: "âš™ï¸", desc: "Configure your company profile, chart of accounts, and opening balances.", link: "/dashboard/business-settings" },
  { step: "Add Master Data", icon: "ðŸ“‹", desc: "Set up customers, suppliers, items, and bank accounts.", link: "/dashboard/crm" },
  { step: "Record Transactions", icon: "ðŸ§¾", desc: "Create sales invoices, purchase invoices, and expense vouchers daily.", link: "/dashboard/sales-invoice" },
  { step: "Process Payments", icon: "ðŸ’µ", desc: "Record payment receipts and vouchers. Keep receivables and payables updated.", link: "/dashboard/crv" },
  { step: "Run Reports", icon: "ðŸ“Š", desc: "Generate trial balance, P&L, and balance sheet to understand your position.", link: "/dashboard/reports/trial-balance" },
  { step: "AI Analysis", icon: "ðŸ¤–", desc: "Let AI review your data and give recommendations, alerts, and forecasts.", link: "/dashboard/ai" },
];

// â”€â”€â”€ Key Modules per business â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MODULES_MAP: Record<string, { icon: string; label: string; desc: string; link: string }[]> = {
  trading: [
    { icon: "ðŸ§¾", label: "Sales Invoice", desc: "Bill customers and track receivables", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ›’", label: "Purchase Invoice", desc: "Record supplier bills and payables", link: "/dashboard/purchase-invoice" },
    { icon: "ðŸ“‹", label: "Quotation", desc: "Send professional price quotes", link: "/dashboard/quotation" },
    { icon: "ðŸ“¦", label: "Inventory", desc: "Real-time stock tracking", link: "/dashboard/inventory" },
    { icon: "ðŸšš", label: "Delivery Challan", desc: "Dispatch documentation", link: "/dashboard/delivery-challan" },
    { icon: "ðŸ’µ", label: "Payment Receipt", desc: "Record customer payments", link: "/dashboard/crv" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Match books with bank", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ“Š", label: "Ageing Report", desc: "Track overdue receivables", link: "/dashboard/ageing" },
    { icon: "ðŸ‘¥", label: "CRM", desc: "Manage customers and suppliers", link: "/dashboard/crm" },
    { icon: "ðŸ“ˆ", label: "P&L Report", desc: "Profit and loss statement", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Smart business analysis", link: "/dashboard/ai" },
    { icon: "ðŸŒ", label: "Multi-Currency", desc: "Foreign exchange support", link: "/dashboard/currencies" },
  ],
  distribution: [
    { icon: "ðŸ­", label: "Multi-Warehouse", desc: "Stock across depots with transfers", link: "/dashboard/inventory" },
    { icon: "ðŸ—ºï¸", label: "Route Management", desc: "Plan and assign delivery routes", link: "/dashboard/distribution/routes" },
    { icon: "ðŸšš", label: "Van Sales", desc: "Field sales and delivery tracking", link: "/dashboard/distribution/van-sales" },
    { icon: "ðŸ’µ", label: "Collections", desc: "Field payment collection matched to invoices", link: "/dashboard/distribution/collections" },
    { icon: "ðŸ“‹", label: "Trip Sheet", desc: "Reconcile loaded vs sold vs returned", link: "/dashboard/distribution/trip-sheet" },
    { icon: "ðŸ§¾", label: "Sales Invoice", desc: "Customer billing and dispatch", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ›’", label: "Purchase Order", desc: "Supplier procurement and GRN", link: "/dashboard/purchase-order" },
    { icon: "ðŸ‘¤", label: "Credit Limits", desc: "Set and enforce customer credit limits", link: "/dashboard/crm" },
    { icon: "ðŸ“Š", label: "Ageing Report", desc: "Outstanding receivables by age", link: "/dashboard/ageing" },
    { icon: "ðŸ”—", label: "Multi-Branch", desc: "Consolidated P&L across all depots", link: "/dashboard/companies" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Route and margin performance analysis", link: "/dashboard/ai" },
    { icon: "ðŸ‘¥", label: "HR & Payroll", desc: "Driver and staff management", link: "/dashboard/employees" },
  ],
  retail: [
    { icon: "ðŸª", label: "POS Terminal", desc: "Fast billing with barcode scanning", link: "/dashboard/retail/pos" },
    { icon: "ðŸ“¦", label: "Inventory", desc: "Real-time stock auto-updated on every sale", link: "/dashboard/inventory" },
    { icon: "ðŸŽ", label: "Customer Loyalty", desc: "Points, discounts, purchase history", link: "/dashboard/retail/loyalty" },
    { icon: "ðŸ¢", label: "Multi-Branch", desc: "Branch-wise stock and revenue tracking", link: "/dashboard/retail/branches" },
    { icon: "ðŸ·ï¸", label: "Product Catalog", desc: "Items, categories, and price lists", link: "/dashboard/retail/catalog" },
    { icon: "ðŸ›’", label: "Purchase Order", desc: "Supplier procurement and GRN", link: "/dashboard/purchase-order" },
    { icon: "ðŸ“Š", label: "Sales Reports", desc: "Daily summaries, top products, margins", link: "/dashboard/reports/sales" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Match POS cash to bank statements", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ·ï¸", label: "Discounts & Offers", desc: "Promotions, coupons, and seasonal deals", link: "/dashboard/retail/discounts" },
    { icon: "ðŸ‘¥", label: "CRM", desc: "Customer database and supplier records", link: "/dashboard/crm" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Best sellers, reorder alerts, forecasts", link: "/dashboard/ai" },
    { icon: "ðŸ‘¤", label: "HR & Payroll", desc: "Staff scheduling and payroll", link: "/dashboard/employees" },
  ],
  restaurant: [
    { icon: "ðŸ½ï¸", label: "Table Management", desc: "Floor plan and live seating status", link: "/dashboard/restaurant/tables" },
    { icon: "ðŸ“", label: "Order Management", desc: "Capture and track customer orders", link: "/dashboard/restaurant/orders" },
    { icon: "ðŸ‘¨â€ðŸ³", label: "Kitchen Display (KDS)", desc: "Real-time order display for kitchen", link: "/dashboard/restaurant/kitchen" },
    { icon: "ðŸ§®", label: "Recipe Costing", desc: "Food cost and margin per dish", link: "/dashboard/restaurant/recipe-costing" },
    { icon: "ðŸ•", label: "Menu Builder", desc: "Digital menu with categories and pricing", link: "/dashboard/restaurant/menu" },
    { icon: "ðŸ“…", label: "Reservations", desc: "Table booking and guest management", link: "/dashboard/restaurant/reservations" },
    { icon: "ðŸ§¾", label: "Sales Invoice", desc: "Billing, splits, and digital receipts", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ“¦", label: "Inventory", desc: "Ingredient stock and wastage control", link: "/dashboard/inventory" },
    { icon: "ðŸ’µ", label: "Daily Cash Closure", desc: "POS settlement and cash management", link: "/dashboard/crv" },
    { icon: "ðŸ“Š", label: "Revenue Reports", desc: "Covers, revenue, top dishes analysis", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Menu optimization and margin analysis", link: "/dashboard/ai" },
    { icon: "ðŸ‘¥", label: "HR & Payroll", desc: "Staff, shifts, and payroll management", link: "/dashboard/employees" },
  ],
  hotel: [
    { icon: "ðŸ¨", label: "Room Management", desc: "Live room availability grid and statuses", link: "/dashboard/hotel/rooms" },
    { icon: "ðŸ”‘", label: "Front Desk", desc: "Check-in, check-out, and room assignment", link: "/dashboard/hotel/front-desk" },
    { icon: "ðŸ§¹", label: "Housekeeping", desc: "Assign tasks, track room clean status", link: "/dashboard/hotel/housekeeping" },
    { icon: "ðŸ±", label: "Room Service", desc: "Orders auto-posted to guest folio", link: "/dashboard/hotel/room-service" },
    { icon: "ðŸ“…", label: "Reservations", desc: "Online and front-desk booking management", link: "/dashboard/hotel/rooms" },
    { icon: "ðŸ§¾", label: "Guest Folio", desc: "All charges consolidated per guest", link: "/dashboard/hotel/front-desk" },
    { icon: "ðŸ’µ", label: "Payment & Checkout", desc: "Process settlement with receipt", link: "/dashboard/crv" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Match hotel revenue to bank", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ“Š", label: "Revenue Reports", desc: "Occupancy rate, RevPAR, ADR tracking", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ‘¥", label: "CRM", desc: "Guest history and corporate accounts", link: "/dashboard/crm" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Demand forecasting and revenue optimization", link: "/dashboard/ai" },
    { icon: "ðŸ‘¤", label: "HR & Payroll", desc: "Hotel staff and department payroll", link: "/dashboard/employees" },
  ],
  manufacturing: [
    { icon: "ðŸ“‹", label: "Bill of Materials", desc: "Raw material requirements per product", link: "/dashboard/manufacturing/bom" },
    { icon: "âš™ï¸", label: "Production Orders", desc: "Raise and track production runs", link: "/dashboard/manufacturing/production-orders" },
    { icon: "ðŸ”§", label: "Work Orders", desc: "Machine, shift, and department tasks", link: "/dashboard/manufacturing/work-orders" },
    { icon: "ðŸ“¦", label: "Raw Materials", desc: "Material issuance and stock deduction", link: "/dashboard/manufacturing/raw-materials" },
    { icon: "âœ…", label: "Finished Goods", desc: "Completed units with quality entry", link: "/dashboard/manufacturing/finished-goods" },
    { icon: "ðŸ›’", label: "Purchase Order", desc: "Supplier procurement and GRN", link: "/dashboard/purchase-order" },
    { icon: "ðŸ’°", label: "Production Costing", desc: "Labour, overhead, material cost per batch", link: "/dashboard/manufacturing/production-orders" },
    { icon: "ðŸ“Š", label: "Variance Analysis", desc: "Standard vs actual cost comparison", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ§¾", label: "Sales Invoice", desc: "Customer billing for finished goods", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Match books with bank statements", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Efficiency tracking and margin forecasting", link: "/dashboard/ai" },
    { icon: "ðŸ‘¥", label: "HR & Payroll", desc: "Factory staff and payroll management", link: "/dashboard/employees" },
  ],
  hospital: [
    { icon: "ðŸ‘¤", label: "Patient Registration", desc: "Demographics, history, and ID management", link: "/dashboard/hospital/patients" },
    { icon: "ðŸ“…", label: "Appointments", desc: "Doctor scheduling and slot booking", link: "/dashboard/hospital/appointments" },
    { icon: "ðŸ’Š", label: "EMR & Prescriptions", desc: "Diagnosis and prescription records", link: "/dashboard/hospital/prescriptions" },
    { icon: "ðŸ”¬", label: "Lab Management", desc: "Test orders, samples, and results", link: "/dashboard/hospital/lab" },
    { icon: "ðŸ§¾", label: "Patient Billing", desc: "Consultation, lab, and procedure billing", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ’µ", label: "Payment Collection", desc: "Cash, card, insurance payment recording", link: "/dashboard/crv" },
    { icon: "ðŸ“¦", label: "Pharmacy Inventory", desc: "Medicine stock and dispensing", link: "/dashboard/inventory" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Match collections to bank account", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ“Š", label: "Clinical Reports", desc: "Doctor revenue, test volume, daily stats", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ‘¥", label: "CRM", desc: "Patient records and follow-up tracking", link: "/dashboard/crm" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Patient trends and revenue forecasting", link: "/dashboard/ai" },
    { icon: "ðŸ‘¤", label: "HR & Payroll", desc: "Doctors, nurses, and support staff", link: "/dashboard/employees" },
  ],
  school: [
    { icon: "ðŸ“", label: "Student Admissions", desc: "Enrollment, class assignment, documents", link: "/dashboard/school/students" },
    { icon: "ðŸ—“ï¸", label: "Class Schedule", desc: "Timetable and teacher assignments", link: "/dashboard/school/schedule" },
    { icon: "âœ…", label: "Attendance", desc: "Daily student and teacher attendance", link: "/dashboard/school/attendance" },
    { icon: "ðŸ“–", label: "Examinations", desc: "Exam setup, marks entry, report cards", link: "/dashboard/school/exams" },
    { icon: "ðŸ’µ", label: "Fee Collection", desc: "Fee challan, payment, defaulter tracking", link: "/dashboard/school/fees" },
    { icon: "ðŸ‘¥", label: "Teacher Management", desc: "Staff records, qualifications, payroll", link: "/dashboard/employees" },
    { icon: "ðŸ§¾", label: "Fee Invoices", desc: "Automated fee invoicing per student", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ“¦", label: "Inventory", desc: "Stationery, books, and lab supplies", link: "/dashboard/inventory" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Fee collections vs bank account", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ“Š", label: "Academic Reports", desc: "Strength, fee status, class performance", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Enrollment trends and fee recovery analysis", link: "/dashboard/ai" },
    { icon: "ðŸ”", label: "User Access", desc: "Principal, admin, and teacher logins", link: "/dashboard/roles-permissions" },
  ],
  pharmacy: [
    { icon: "ðŸ­", label: "Stock Receiving", desc: "Purchase from suppliers with batch and expiry", link: "/dashboard/pharmacy/purchases" },
    { icon: "âš ï¸", label: "Batch & Expiry Control", desc: "Expiry alerts 30/60/90 days in advance", link: "/dashboard/pharmacy/batches" },
    { icon: "ðŸ’Š", label: "Prescription Sales", desc: "Sell against prescription, auto-deduct stock", link: "/dashboard/pharmacy/prescriptions" },
    { icon: "ðŸª", label: "Counter Sales (OTC)", desc: "Fast walk-in sales with barcode scan", link: "/dashboard/pharmacy/counter-sales" },
    { icon: "ðŸ“¦", label: "Inventory Control", desc: "Real-time stock levels and reorder alerts", link: "/dashboard/pharmacy/inventory" },
    { icon: "ðŸ›’", label: "Purchase Order", desc: "Raise POs, track deliveries, match GRN", link: "/dashboard/purchase-order" },
    { icon: "ðŸ§¾", label: "Sales Invoice", desc: "Customer receipts and billing records", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ’µ", label: "Payment Collection", desc: "Cash and credit payment recording", link: "/dashboard/crv" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Daily sales vs bank settlement", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ“Š", label: "Pharmacy Reports", desc: "Top drugs, expiry, slow-movers, margins", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Demand forecasting and margin analysis", link: "/dashboard/ai" },
    { icon: "ðŸ‘¥", label: "CRM", desc: "Customer profiles and prescription history", link: "/dashboard/crm" },
  ],
  construction: [
    { icon: "ðŸ—ï¸", label: "Project Management", desc: "Create projects, budget, and scope", link: "/dashboard/construction/projects" },
    { icon: "ðŸ“", label: "Site Management", desc: "Multiple sites with worker and material tracking", link: "/dashboard/construction/sites" },
    { icon: "ðŸ“‹", label: "BOQ & Materials", desc: "Bill of quantities and material requests", link: "/dashboard/construction/boq" },
    { icon: "ðŸ‘·", label: "Subcontractors", desc: "Work tracking, invoices, and retentions", link: "/dashboard/construction/subcontractors" },
    { icon: "ðŸ§¾", label: "Client Billing", desc: "Progressive billing on milestones", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ’µ", label: "Payment Vouchers", desc: "Contractor and supplier payment tracking", link: "/dashboard/cpv" },
    { icon: "ðŸ›’", label: "Purchase Order", desc: "Materials procurement from suppliers", link: "/dashboard/purchase-order" },
    { icon: "ðŸ“¦", label: "Inventory", desc: "Materials on-site and in store", link: "/dashboard/inventory" },
    { icon: "ðŸ’°", label: "Project P&L", desc: "Revenue vs cost per project", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Project inflows and outflows vs bank", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Cost overrun detection and forecasting", link: "/dashboard/ai" },
    { icon: "ðŸ‘¥", label: "HR & Payroll", desc: "Daily labour, site staff, and engineers", link: "/dashboard/employees" },
  ],
  transport: [
    { icon: "ðŸš›", label: "Fleet Management", desc: "Vehicles, capacity, insurance, registration", link: "/dashboard/transport/fleet" },
    { icon: "ðŸ‘¤", label: "Driver Management", desc: "Driver records, license, and performance", link: "/dashboard/transport/drivers" },
    { icon: "ðŸ“‹", label: "Trip Booking", desc: "Route, vehicle, driver, and freight details", link: "/dashboard/transport/trips" },
    { icon: "â›½", label: "Fuel Tracking", desc: "Fuel per trip with efficiency monitoring", link: "/dashboard/transport/fuel" },
    { icon: "ðŸ”§", label: "Vehicle Maintenance", desc: "Service history, due alerts, repair costs", link: "/dashboard/transport/maintenance" },
    { icon: "ðŸ§¾", label: "Freight Invoice", desc: "Customer billing for completed trips", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ’µ", label: "Payment Collection", desc: "Freight receivables and cash tracking", link: "/dashboard/crv" },
    { icon: "ðŸ“¦", label: "Cargo Inventory", desc: "Goods loaded, delivered, and returned", link: "/dashboard/inventory" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Collections vs bank statements", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ“Š", label: "Fleet Reports", desc: "Per-vehicle profitability and utilization", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Route efficiency and revenue forecasting", link: "/dashboard/ai" },
    { icon: "ðŸ‘¥", label: "HR & Payroll", desc: "Drivers, mechanics, and office staff", link: "/dashboard/employees" },
  ],
  real_estate: [
    { icon: "ðŸ¢", label: "Property Listing", desc: "Type, location, size, price, amenities", link: "/dashboard/real-estate/properties" },
    { icon: "ðŸ‘¤", label: "Tenant Management", desc: "Tenant records and contact details", link: "/dashboard/real-estate/tenants" },
    { icon: "ðŸ“„", label: "Lease Management", desc: "Lease terms, renewal, and escalation", link: "/dashboard/real-estate/leases" },
    { icon: "ðŸ’µ", label: "Rent Collection", desc: "Monthly invoices, payments, defaulters", link: "/dashboard/real-estate/rent" },
    { icon: "ðŸ”§", label: "Maintenance", desc: "Requests, contractors, resolution tracking", link: "/dashboard/maintenance" },
    { icon: "ðŸ§¾", label: "Sales Invoice", desc: "Rent and service charge billing", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ’°", label: "Owner Payouts", desc: "Net rent after deductions to property owners", link: "/dashboard/cpv" },
    { icon: "ðŸ“¦", label: "Expense Tracking", desc: "Property-level expenses and repairs", link: "/dashboard/expense-vouchers" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Rent collections vs bank statements", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ“Š", label: "Portfolio Reports", desc: "Occupancy, rental yield, vacancy rates", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ¤–", label: "AI Insights", desc: "Rental yield optimization and vacancy alerts", link: "/dashboard/ai" },
    { icon: "ðŸ‘¥", label: "CRM", desc: "Tenant and owner relationship management", link: "/dashboard/crm" },
  ],
  default: [
    { icon: "ðŸ§¾", label: "Sales Invoice", desc: "Customer billing", link: "/dashboard/sales-invoice" },
    { icon: "ðŸ›’", label: "Purchase Invoice", desc: "Supplier bills", link: "/dashboard/purchase-invoice" },
    { icon: "ðŸ“¦", label: "Inventory", desc: "Stock management", link: "/dashboard/inventory" },
    { icon: "ðŸ’µ", label: "Payments", desc: "Cash and bank", link: "/dashboard/crv" },
    { icon: "ðŸ¦", label: "Bank Reconciliation", desc: "Books vs bank", link: "/dashboard/bank-reconciliation" },
    { icon: "ðŸ“Š", label: "Reports", desc: "Financial statements", link: "/dashboard/reports/trial-balance" },
    { icon: "ðŸ‘¥", label: "CRM", desc: "Customers & suppliers", link: "/dashboard/crm" },
    { icon: "ðŸ‘¤", label: "HR & Payroll", desc: "Employee management", link: "/dashboard/employees" },
    { icon: "ðŸ¤–", label: "AI Intelligence", desc: "Smart insights", link: "/dashboard/ai" },
    { icon: "ðŸ”", label: "User Access", desc: "Roles & permissions", link: "/dashboard/roles-permissions" },
    { icon: "ðŸ’±", label: "Multi-Currency", desc: "Foreign exchange", link: "/dashboard/currencies" },
    { icon: "ðŸ“ˆ", label: "P&L & Balance Sheet", desc: "Financial health", link: "/dashboard/reports/trial-balance" },
  ],
};

// â”€â”€â”€ Getting Started Checklist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CHECKLIST = [
  { id: 1, task: "Complete your company profile", icon: "ðŸ¢", link: "/dashboard/business-settings", urgent: true },
  { id: 2, task: "Set up chart of accounts", icon: "ðŸ“’", link: "/dashboard/accounts", urgent: true },
  { id: 3, task: "Enter opening balances", icon: "âš–ï¸", link: "/dashboard/opening-balances", urgent: true },
  { id: 4, task: "Add your customers & suppliers", icon: "ðŸ‘¥", link: "/dashboard/crm", urgent: false },
  { id: 5, task: "Create your first invoice", icon: "ðŸ§¾", link: "/dashboard/sales-invoice", urgent: false },
  { id: 6, task: "Set up your team users", icon: "ðŸ‘¤", link: "/dashboard/team", urgent: false },
  { id: 7, task: "Configure email & WhatsApp", icon: "ðŸ“§", link: "/dashboard/notifications", urgent: false },
  { id: 8, task: "Explore AI Intelligence", icon: "ðŸ¤–", link: "/dashboard/ai", urgent: false },
];

// â”€â”€â”€ AI Features highlight â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AI_FEATURES = [
  { icon: "âš¡", title: "Business Health Score", desc: "Real-time score 0â€“100 based on your revenue, profit, cash, and receivables.", link: "/dashboard/ai" },
  { icon: "ðŸ’¬", title: "Ask AI Anything", desc: "Chat with your financial data in plain English. Get instant answers.", link: "/dashboard/ai?tab=chat" },
  { icon: "ðŸ””", title: "Smart Alerts", desc: "Auto-detect overdue invoices, cash risks, expense spikes, revenue drops.", link: "/dashboard/ai?tab=alerts" },
  { icon: "ðŸ“ˆ", title: "30/60/90-Day Forecast", desc: "AI predicts your next 3 months of revenue, expenses, and cashflow.", link: "/dashboard/ai?tab=forecast" },
  { icon: "ðŸŒ", title: "Market Intelligence", desc: "Discover what products to add and what trends are hitting your industry.", link: "/dashboard/ai?tab=market" },
  { icon: "ðŸ§­", title: "Business Advisor", desc: "Get a personalized growth plan, cross-sell ideas, and risk warnings.", link: "/dashboard/ai?tab=advisor" },
];

export default function BusinessGuidePage() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "workflow" | "modules" | "ai" | "start">("overview");
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me/company", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setCompanyInfo({
            name: String(data?.name || "Your Company"),
            businessType: (data?.businessType || "trading") as BusinessType,
            plan: String(data?.plan || "STARTER"),
            subscriptionStatus: String(data?.subscriptionStatus || "ACTIVE"),
            country: data?.country || null,
            baseCurrency: data?.baseCurrency || null,
          });
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const businessType = companyInfo?.businessType || "trading";
  const businessMeta = getBusinessType(businessType);
  const flow = FLOW_MAP[businessType] || DEFAULT_FLOW;
  const modules = MODULES_MAP[businessType] || MODULES_MAP.default;

  const planColor = companyInfo?.plan === "ENTERPRISE" ? "#fbbf24" : companyInfo?.plan === "PRO" ? "#a78bfa" : "#34d399";

  // â”€â”€ Loading skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) return (
    <div style={{ fontFamily:"'Outfit','DM Sans',sans-serif", padding:"0 0 60px" }}>
      <style>{`
        @keyframes skshimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .sk { border-radius:10px; background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%); background-size:800px 100%; animation:skshimmer 1.4s infinite linear; }
      `}</style>
      {/* Hero skeleton */}
      <div style={{ borderRadius:24, padding:"32px 36px", marginBottom:24, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)" }}>
        <div className="sk" style={{ height:22, width:200, marginBottom:20 }} />
        <div className="sk" style={{ height:42, width:320, marginBottom:14 }} />
        <div className="sk" style={{ height:14, width:"80%", marginBottom:8 }} />
        <div className="sk" style={{ height:14, width:"60%", marginBottom:24 }} />
        <div style={{ display:"flex", gap:10 }}>
          <div className="sk" style={{ height:32, width:110, borderRadius:20 }} />
          <div className="sk" style={{ height:32, width:70, borderRadius:20 }} />
        </div>
      </div>
      {/* Tabs skeleton */}
      <div style={{ display:"flex", gap:6, marginBottom:24 }}>
        {[120,110,110,100,105].map((w,i) => <div key={i} className="sk" style={{ height:38, width:w, borderRadius:10 }} />)}
      </div>
      {/* Cards skeleton */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:16 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:"20px" }}>
            <div className="sk" style={{ height:28, width:28, borderRadius:8, marginBottom:14 }} />
            <div className="sk" style={{ height:16, width:"70%", marginBottom:10 }} />
            <div className="sk" style={{ height:12, width:"100%", marginBottom:6 }} />
            <div className="sk" style={{ height:12, width:"80%" }} />
          </div>
        ))}
      </div>
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: "âš¡" },
    { id: "workflow", label: "How It Works", icon: "ðŸ”„" },
    { id: "modules", label: "Your Modules", icon: "ðŸ“¦" },
    { id: "ai", label: "AI Features", icon: "ðŸ¤–" },
    { id: "start", label: "Quick Start", icon: "ðŸš€" },
  ] as const;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.4);opacity:0} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .guide-tab { border:none; cursor:pointer; font-family:inherit; padding:10px 20px; border-radius:10px; font-size:13px; font-weight:600; transition:all .2s; }
        .guide-tab.active { background:rgba(99,102,241,.2); color:#a5b4fc; border:1px solid rgba(99,102,241,.3); }
        .guide-tab:not(.active) { background:transparent; color:rgba(255,255,255,.4); border:1px solid transparent; }
        .guide-tab:not(.active):hover { background:rgba(255,255,255,.05); color:rgba(255,255,255,.8); }
        .module-card:hover { border-color:rgba(99,102,241,.35)!important; background:rgba(99,102,241,.06)!important; transform:translateY(-2px); }
        .module-card { transition:all .2s; }
        .check-item:hover { background:rgba(255,255,255,.04)!important; }
        .flow-step { transition:all .2s; }
        .flow-step:hover { border-color:rgba(99,102,241,.3)!important; background:rgba(99,102,241,.04)!important; }
      `}</style>

      {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{
        borderRadius: 24, padding: "32px 36px", marginBottom: 24,
        background: `linear-gradient(135deg, rgba(${businessMeta.color === "#818cf8" ? "99,102,241" : "99,102,241"},.15) 0%, rgba(8,10,28,.95) 60%)`,
        border: "1px solid rgba(255,255,255,.08)",
        position: "relative", overflow: "hidden",
        animation: "fadeUp .5s ease",
      }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${businessMeta.color}20, transparent 65%)`, pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20, position: "relative" }}>
          <div>
            {/* Business type badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 100, marginBottom: 16, background: `${businessMeta.color}15`, border: `1.5px solid ${businessMeta.color}30` }}>
              <span style={{ fontSize: 14 }}>{businessMeta.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: businessMeta.color, letterSpacing: ".08em" }}>{businessMeta.label.toUpperCase()} BUSINESS GUIDE</span>
            </div>

            <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,3vw,38px)", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.1 }}>
              {companyInfo?.name || "Your Company"}
            </h1>
            <p style={{ margin: "0 0 20px", fontSize: 15, color: "rgba(255,255,255,.5)", lineHeight: 1.7, maxWidth: 540 }}>
              {businessMeta.description}. This guide walks you through your complete business workflow, key modules, and how to get the most out of Finova for your {businessMeta.label.toLowerCase()} operations.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ padding: "6px 14px", borderRadius: 100, background: `${planColor}15`, border: `1px solid ${planColor}30`, fontSize: 12, fontWeight: 700, color: planColor }}>
                {companyInfo?.plan || "STARTER"} Plan
              </div>
              {companyInfo?.country && (
                <div style={{ padding: "6px 14px", borderRadius: 100, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)" }}>
                  ðŸ“ {companyInfo.country}
                </div>
              )}
              {companyInfo?.baseCurrency && (
                <div style={{ padding: "6px 14px", borderRadius: 100, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)" }}>
                  ðŸ’± {companyInfo.baseCurrency}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, minWidth: 200 }}>
            {[
              { label: "Modules Available", val: String(businessMeta.modules.length), color: "#a5b4fc" },
              { label: "Workflow Steps", val: String(flow.length), color: "#34d399" },
              { label: "AI Features", val: "9", color: "#f59e0b" },
              { label: "Reports Available", val: "15+", color: "#38bdf8" },
            ].map((s) => (
              <div key={s.label} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 3, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "rgba(255,255,255,.03)", padding: 6, borderRadius: 14, width: "fit-content", border: "1px solid rgba(255,255,255,.07)" }}>
        {tabs.map((t) => (
          <button key={t.id} className={`guide-tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* â”€â”€ OVERVIEW TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "overview" && (
        <div style={{ animation: "fadeUp .4s ease", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* What Finova does for this business */}
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "28px 30px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", marginBottom: 12 }}>WHAT FINOVA DOES FOR YOUR BUSINESS</div>
            <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800 }}>Everything you need to run {businessMeta.label} operations</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
              {[
                { icon: "ðŸ“Š", title: "Real-Time Financial Visibility", desc: "See your P&L, balance sheet, and cash position updated the moment any transaction is recorded." },
                { icon: "ðŸ”„", title: "End-to-End Workflow", desc: `Complete ${businessMeta.label.toLowerCase()} workflow â€” from first contact to final payment â€” all in one platform.` },
                { icon: "ðŸ¤–", title: "AI-Powered Decisions", desc: "Get smart alerts, revenue forecasts, market insights, and personalized business recommendations." },
                { icon: "ðŸ‘¥", title: "Team Collaboration", desc: "Invite your team, set role-based permissions, and track who did what with full audit logs." },
                { icon: "ðŸ“±", title: "Notifications & Alerts", desc: "Automated WhatsApp and email alerts for invoices, payments, low stock, and more." },
                { icon: "ðŸŒ", title: "Multi-Currency Ready", desc: "Handle foreign invoices, exchange rates, and multi-currency reports with ease." },
              ].map((item) => (
                <div key={item.title} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: "18px 20px" }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "white" }}>{item.title}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            {[
              { label: "Go to Dashboard", href: "/dashboard", icon: "âš¡", color: "#6366f1" },
              { label: "Open AI Center", href: "/dashboard/ai", icon: "ðŸ¤–", color: "#a78bfa" },
              { label: "Create Invoice", href: "/dashboard/sales-invoice", icon: "ðŸ§¾", color: "#34d399" },
              { label: "View Reports", href: "/dashboard/reports/trial-balance", icon: "ðŸ“Š", color: "#38bdf8" },
              { label: "Business Settings", href: "/dashboard/business-settings", icon: "âš™ï¸", color: "#fbbf24" },
              { label: "Team Management", href: "/dashboard/team", icon: "ðŸ‘¥", color: "#f87171" },
            ].map((link) => (
              <Link key={link.href} href={link.href} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 14, textDecoration: "none",
                background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
                transition: "all .2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = `${link.color}10`; e.currentTarget.style.borderColor = `${link.color}30`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; }}
              >
                <span style={{ fontSize: 20 }}>{link.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>{link.label}</span>
                <svg style={{ marginLeft: "auto" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* â”€â”€ WORKFLOW TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "workflow" && (
        <div style={{ animation: "fadeUp .4s ease" }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "28px 30px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", marginBottom: 8 }}>STEP-BY-STEP BUSINESS WORKFLOW</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>How {businessMeta.label} businesses operate on Finova</h2>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>
              Follow this workflow every day to keep your books accurate, customers happy, and business growing.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {flow.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 0 }}>
                  {/* Timeline */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 52, flexShrink: 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${businessMeta.color}30, rgba(99,102,241,.2))`,
                      border: `2px solid ${businessMeta.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>{step.icon}</div>
                    {i < flow.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: "rgba(255,255,255,.06)", margin: "4px 0" }} />}
                  </div>

                  {/* Content */}
                  <div className="flow-step" style={{
                    flex: 1, marginLeft: 16, marginBottom: i < flow.length - 1 ? 8 : 0,
                    background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)",
                    borderRadius: 16, padding: "16px 20px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: businessMeta.color, background: `${businessMeta.color}15`, padding: "2px 8px", borderRadius: 20 }}>STEP {i + 1}</span>
                        <span style={{ fontSize: 15, fontWeight: 800 }}>{step.step}</span>
                      </div>
                      <Link href={step.link} style={{
                        fontSize: 11, fontWeight: 700, color: "#a5b4fc", textDecoration: "none",
                        background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", padding: "4px 12px", borderRadius: 20,
                        whiteSpace: "nowrap",
                      }}>Open â†’</Link>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.7 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ MODULES TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "modules" && (
        <div style={{ animation: "fadeUp .4s ease" }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "28px 30px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", marginBottom: 8 }}>YOUR AVAILABLE MODULES</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>Key features for {businessMeta.label} businesses</h2>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>
              These are the core modules configured for your business type. Click any to open it directly.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              {modules.map((mod) => (
                <Link key={mod.label} href={mod.link} style={{ textDecoration: "none" }}>
                  <div className="module-card" style={{
                    background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
                    borderRadius: 16, padding: "18px 20px", cursor: "pointer",
                  }}>
                    <div style={{ fontSize: 26, marginBottom: 12 }}>{mod.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 6 }}>{mod.label}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>{mod.desc}</div>
                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6366f1", fontWeight: 700 }}>
                      Open module
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Key Reports */}
          <div style={{ marginTop: 20, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "24px 28px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>ðŸ“Š Important Reports</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              {[
                { label: "Trial Balance", href: "/dashboard/reports/trial-balance" },
                { label: "Profit & Loss", href: "/dashboard/reports/trial-balance" },
                { label: "Balance Sheet", href: "/dashboard/reports/trial-balance" },
                { label: "Cash Flow", href: "/dashboard/reports/cash-flow" },
                { label: "Ledger", href: "/dashboard/reports/ledger" },
                { label: "Ageing Report", href: "/dashboard/ageing" },
                { label: "Customer Statement", href: "/dashboard/reports/ledger" },
                { label: "Tax Summary", href: "/dashboard/reports/tax-summary" },
              ].map((r) => (
                <Link key={r.label} href={r.href} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  padding: "10px 14px", borderRadius: 10, textDecoration: "none",
                  background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)",
                  fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,.7)", transition: "all .2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#a5b4fc"; e.currentTarget.style.borderColor = "rgba(99,102,241,.25)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,.7)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.06)"; }}
                >
                  {r.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ AI FEATURES TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "ai" && (
        <div style={{ animation: "fadeUp .4s ease" }}>
          {/* AI Hero */}
          <div style={{
            borderRadius: 20, padding: "32px 36px", marginBottom: 20,
            background: "linear-gradient(135deg, rgba(167,139,250,.12), rgba(99,102,241,.08), rgba(8,10,28,.95))",
            border: "1px solid rgba(167,139,250,.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(167,139,250,.2)", border: "1px solid rgba(167,139,250,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>ðŸ¤–</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Finova AI Intelligence</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>9 AI-powered features analyzing your real business data 24/7</div>
              </div>
              <Link href="/dashboard/ai" style={{ marginLeft: "auto", padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", textDecoration: "none", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "0 8px 24px rgba(99,102,241,.35)" }}>
                Open AI Center â†’
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { val: "9", label: "AI Tabs" }, { val: "24/7", label: "Monitoring" }, { val: "0", label: "OpenAI Required*" },
              ].map((s) => (
                <div key={s.label} style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#a5b4fc" }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Feature Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
            {AI_FEATURES.map((f) => (
              <Link key={f.title} href={f.link} style={{ textDecoration: "none" }}>
                <div className="module-card" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(167,139,250,.12)", borderRadius: 18, padding: "22px 24px", height: "100%" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>{f.desc}</div>
                  <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: "#a78bfa", display: "flex", alignItems: "center", gap: 6 }}>
                    Explore
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: "14px 20px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", fontSize: 12, color: "rgba(255,255,255,.4)", textAlign: "center" }}>
            * 80% of AI features work without OpenAI credits â€” powered by your real business data and rule-based intelligence.
          </div>
        </div>
      )}

      {/* â”€â”€ QUICK START TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "start" && (
        <div style={{ animation: "fadeUp .4s ease" }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "28px 30px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", marginBottom: 8 }}>GETTING STARTED CHECKLIST</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>Set up Finova in 30 minutes</h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>
              Complete these steps to get your business fully operational on Finova.
            </p>

            {/* Progress bar */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc" }}>{completedTasks.length} of {CHECKLIST.length} completed</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>{Math.round((completedTasks.length / CHECKLIST.length) * 100)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#6366f1,#a78bfa)", width: `${(completedTasks.length / CHECKLIST.length) * 100}%`, transition: "width .5s ease" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CHECKLIST.map((item) => {
                const done = completedTasks.includes(item.id);
                return (
                  <div key={item.id} className="check-item" style={{
                    display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderRadius: 14,
                    background: done ? "rgba(16,185,129,.05)" : "rgba(255,255,255,.025)",
                    border: `1px solid ${done ? "rgba(16,185,129,.2)" : item.urgent ? "rgba(239,68,68,.15)" : "rgba(255,255,255,.06)"}`,
                    transition: "all .2s", cursor: "pointer",
                  }} onClick={() => setCompletedTasks((prev) => done ? prev.filter((id) => id !== item.id) : [...prev, item.id])}>
                    {/* Checkbox */}
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: done ? "#10b981" : "transparent",
                      border: `2px solid ${done ? "#10b981" : "rgba(255,255,255,.2)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .2s",
                    }}>
                      {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>

                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: done ? "rgba(255,255,255,.4)" : "white", textDecoration: done ? "line-through" : "none" }}>
                        {item.task}
                      </div>
                    </div>

                    {item.urgent && !done && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(239,68,68,.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,.2)", whiteSpace: "nowrap" }}>Required</span>
                    )}

                    <Link href={item.link} onClick={(e) => e.stopPropagation()} style={{
                      fontSize: 11, fontWeight: 700, color: "#a5b4fc", textDecoration: "none",
                      padding: "4px 12px", borderRadius: 20, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", whiteSpace: "nowrap",
                    }}>Go â†’</Link>
                  </div>
                );
              })}
            </div>

            {completedTasks.length === CHECKLIST.length && (
              <div style={{ marginTop: 20, padding: "20px 24px", borderRadius: 14, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>ðŸŽ‰</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#6ee7b7" }}>Setup Complete!</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginTop: 4 }}>Your business is now fully configured. Head to the dashboard to get started.</div>
                <Link href="/dashboard" style={{ display: "inline-block", marginTop: 14, padding: "10px 24px", borderRadius: 10, background: "#10b981", color: "white", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>Go to Dashboard â†’</Link>
              </div>
            )}
          </div>

          {/* Help Resources */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {[
              { icon: "ðŸ¤–", title: "Ask AI for Help", desc: "Chat with AI to understand any feature instantly.", href: "/dashboard/ai?tab=chat", color: "#a78bfa" },
              { icon: "ðŸ“§", title: "Contact Support", desc: "Our team is available 24/7 to assist you.", href: "mailto:finovaos.app@gmail.com", color: "#34d399" },
              { icon: "ðŸ“¹", title: "Video Tutorials", desc: "Watch step-by-step walkthroughs for each module.", href: "/help", color: "#38bdf8" },
            ].map((r) => (
              <Link key={r.title} href={r.href} style={{ textDecoration: "none" }}>
                <div style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${r.color}18`, borderRadius: 16, padding: "20px 22px", transition: "all .2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${r.color}35`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${r.color}18`; }}
                >
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{r.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 6 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>{r.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
