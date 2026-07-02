"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const ALL_POSTS: Record<string, any> = {
  "bank-reconciliation-guide": {
    title: "The Complete Guide to Bank Reconciliation for SMEs in 2025",
    category: "accounting", categoryLabel: "Accounting Tips", color: "#818cf8",
    author: "FinovaOS Team", authorRole: "Finance Experts", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    date: "March 10, 2025", readTime: "8 min read",
    content: [
      { type:"intro", text:"Bank reconciliation is one of the most critical tasks in accounting. For SMEs using FinovaOS, what used to take days now takes minutes. Here's everything you need to know about bank reconciliation — and how to automate it completely." },
      { type:"h2", text:"What is Bank Reconciliation?" },
      { type:"p", text:"Bank reconciliation is comparing your FinovaOS ledger entries with your actual bank statement to make sure every transaction matches. Any difference — called a discrepancy — must be investigated and resolved before closing your books." },
      { type:"p", text:"Example: FinovaOS shows a supplier payment of $500 on March 5th, but your bank statement shows $520 on March 6th. That $20 difference could be a bank charge or a timing issue — you need to find out which." },
      { type:"h2", text:"Why It Matters for Your Business" },
      { type:"list", items:[
        "Catches fraud and unauthorized transactions immediately",
        "Ensures your cash position in FinovaOS matches reality",
        "Required for tax filing — clean books prevent audit issues",
        "Builds investor confidence — accurate financials are non-negotiable",
        "Prevents small errors from becoming big problems",
      ]},
      { type:"h2", text:"How FinovaOS Auto-Reconciliation Works" },
      { type:"numbered", items:[
        "Go to Banking → Bank Reconciliation in your FinovaOS dashboard",
        "Upload your bank statement (CSV or PDF) or connect via bank feed",
        "FinovaOS's engine matches transactions by amount, date, and reference",
        "Matched transactions show green — no action needed",
        "Unmatched items are flagged in red for your review",
        "Resolve all flagged items and mark the period as reconciled",
      ]},
      { type:"h2", text:"Supported Banks in FinovaOS" },
      { type:"p", text:"FinovaOS accepts CSV import from any bank — you download the statement from your bank's portal and upload it. The engine parses standard column formats used by major Pakistani, GCC, UK, and US banks. Direct bank feed connections are on the roadmap but not yet live — for now, CSV is the fastest path." },
      { type:"h2", text:"Common Discrepancies and How to Fix Them" },
      { type:"p", text:"Bank charges: Your bank deducts fees that aren't in FinovaOS yet. Simply add them as an expense entry in FinovaOS and the reconciliation will match." },
      { type:"p", text:"Timing differences: A cheque you issued hasn't cleared yet. Mark it as 'outstanding' in FinovaOS — it will clear in the next period." },
      { type:"p", text:"Duplicate entries: You accidentally entered the same transaction twice. Delete the duplicate and reconcile." },
      { type:"quote", text:"We used to spend 2 full days every month on bank reconciliation. With FinovaOS, our accountant finishes it in 25 minutes every Monday morning.", author:"James Thompson, CEO — Thompson Trading Co." },
      { type:"h2", text:"Best Practices" },
      { type:"list", items:[
        "Reconcile every month — never skip even one period",
        "Set up FinovaOS bank alerts to catch unusual transactions in real time",
        "Keep scanned copies of all bank statements in FinovaOS's document vault",
        "Use FinovaOS's reconciliation report for your accountant and tax authority filings",
      ]},
    ],
  },

  "1": {
    title: "How to Create and Send Professional Invoices with FinovaOS",
    category: "guides", categoryLabel: "How-to Guides", color: "#34d399",
    author: "FinovaOS Team", authorRole: "Product Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#059669,#34d399)",
    date: "March 8, 2025", readTime: "5 min read",
    content: [
      { type:"intro", text:"Creating a professional invoice in FinovaOS takes less than 2 minutes. From custom templates to automatic payment reminders, here's how to get paid faster using FinovaOS's invoicing module." },
      { type:"h2", text:"Step 1: Create a New Invoice" },
      { type:"p", text:"From your FinovaOS dashboard, go to Sales → Sales Invoices → New Invoice. Select your customer from the list (or add a new one), set the invoice date and due date, then add your line items." },
      { type:"h2", text:"Step 2: Add Products/Services" },
      { type:"p", text:"Each line item pulls from your FinovaOS inventory or service list. The rate, tax, and total are calculated automatically. You can add discounts at the line level or as an overall invoice discount." },
      { type:"h2", text:"Step 3: Apply Tax Configuration" },
      { type:"p", text:"FinovaOS supports GST, Sales Tax, and VAT configurations. Select the applicable tax from your pre-configured tax codes and FinovaOS calculates the tax amount and grand total automatically — fully compliant with your local tax authority requirements." },
      { type:"h2", text:"Step 4: Choose Your Template" },
      { type:"p", text:"FinovaOS offers 5 professional invoice templates. Select the one that matches your brand, add your logo, and customize colors. Your template is saved for future invoices." },
      { type:"h2", text:"Step 5: Send and Track" },
      { type:"p", text:"Send the invoice directly from FinovaOS via email. The customer receives a professional PDF with a payment link. FinovaOS tracks when the email was opened and marks the invoice as paid when payment is received." },
      { type:"list", items:[
        "Payment reminders on due dates",
        "Share invoice PDF via email or download for messaging apps",
        "Multi-currency invoicing (USD, GBP, EUR, AED, SAR, QAR, KWD, OMR, PKR, INR, CNY, JPY)",
        "Recurring invoices — set up once, generate on schedule",
        "Convert delivery challan to invoice with one click",
      ]},
      { type:"quote", text:"Our invoice processing time went from 45 minutes per invoice to 8 minutes. That's 37 minutes saved, per invoice, every day.", author:"Finance Manager, Distribution Company" },
    ],
  },

  "2": {
    title: "FinovaOS HR & Payroll: Complete Setup Guide for Your Business",
    category: "guides", categoryLabel: "How-to Guides", color: "#fbbf24",
    author: "FinovaOS Team", authorRole: "HR Module Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#b45309,#f59e0b)",
    date: "March 6, 2025", readTime: "7 min read",
    content: [
      { type:"intro", text:"FinovaOS's HR & Payroll module handles the full flow from employee onboarding to monthly payslips and payroll journal entries. Statutory deduction lines (EOBI, PESSI, income tax, provident fund, etc.) are configurable per employee — you set the rate or amount once, and it runs the same way each month. Here's how to set it up." },
      { type:"h2", text:"Step 1: Add Your Employees" },
      { type:"p", text:"Go to HR → Employees → Add Employee. Fill in the employee's personal details, designation, department, date of joining, and base salary. Each employee record becomes the anchor for their salary structure and deductions." },
      { type:"h2", text:"Step 2: Configure Salary Components" },
      { type:"p", text:"For each employee, set up their salary structure: basic salary, housing allowance, transport, medical allowance, and any other allowances. FinovaOS uses this to calculate gross salary before deductions." },
      { type:"h2", text:"Step 3: Set Up Deduction Lines" },
      { type:"p", text:"Add the deduction lines each employee needs — EOBI, PESSI, income tax, provident fund, loan repayment. Enter either a fixed amount or a percentage of basic salary. When statutory rates change, you update the deduction line and the new rate applies from the next payroll run." },
      { type:"h2", text:"Step 4: Income Tax Handling" },
      { type:"p", text:"Configure the annual income tax slab for each employee as a monthly deduction line. This keeps net salary and withholding accurate throughout the year, and the annual salary summary gives your tax consultant the numbers they need for FBR filing." },
      { type:"h2", text:"Step 5: Run Monthly Payroll" },
      { type:"p", text:"Go to HR → Payroll → Run Payroll, select the month, review each employee's gross, deductions and net, and approve. FinovaOS generates individual payslips, posts the payroll journal entry to your accounts, and marks salaries as paid." },
      { type:"list", items:[
        "Deduction registers — total EOBI/PESSI/tax by month for filing hand-off",
        "Configurable per-employee salary structure",
        "Gratuity tracking based on join date and salary",
        "Leave management — casual, sick, annual",
        "Advance salary tracked and recovered over subsequent payrolls",
        "Employee documents vault — contracts, ID documents, degrees",
      ]},
      { type:"quote", text:"Payroll pe pehle har month 2 din lagte thay. Ab template ek dafa set kiya hai, har month sirf review karke process karta hoon.", author:"HR Manager, Manufacturing Company" },
    ],
  },

  "3": {
    title: "Using FinovaOS CRM to Convert More Leads into Paying Customers",
    category: "product", categoryLabel: "Product Features", color: "#818cf8",
    author: "FinovaOS Team", authorRole: "Product Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    date: "March 5, 2025", readTime: "5 min read",
    content: [
      { type:"intro", text:"FinovaOS's CRM module connects your customer relationships directly to your financial data. When a deal closes, an invoice is created automatically. When a payment is received, the CRM updates. Here's how to use it effectively." },
      { type:"h2", text:"Setting Up Your CRM Pipeline" },
      { type:"p", text:"Go to CRM → Contacts → New Contact. Add your leads, customers, and partners. Assign them a type (Lead, Customer, Supplier, Partner) and link them to your Chart of Accounts if they're also accounting parties." },
      { type:"h2", text:"Managing Opportunities" },
      { type:"p", text:"For each potential deal, create an Opportunity. Set the deal value, probability percentage, expected close date, and current stage (Lead → Prospect → Negotiation → Won/Lost). FinovaOS shows your pipeline value and win probability at a glance." },
      { type:"h2", text:"Logging Interactions" },
      { type:"p", text:"Every call, meeting, email, and site visit can be logged against a contact. Set follow-up reminders. FinovaOS's activity feed gives you a complete history of every interaction with every customer — accessible to your entire sales team." },
      { type:"h2", text:"Connecting CRM to Finance" },
      { type:"p", text:"When an opportunity is marked as Won, FinovaOS can automatically create a Quotation or Sales Invoice from the deal data. No double entry. No errors. The financial record is created the moment the sale is confirmed." },
      { type:"list", items:[
        "Contact profiles with full interaction history",
        "Pipeline view with deal values and stages",
        "Automatic invoice creation from won opportunities",
        "Follow-up reminders and activity tracking",
        "Contact documents — proposals, contracts, agreements",
        "Notes — private or shared with team",
      ]},
      { type:"quote", text:"Our sales team now sees outstanding payments against each customer directly in the CRM. Chasing overdue invoices has become much easier.", author:"Sales Director, Global Trading Co." },
    ],
  },

  "4": {
    title: "FinovaOS Inventory Management: Track Stock, Purchases, and Sales in Real Time",
    category: "product", categoryLabel: "Product Features", color: "#38bdf8",
    author: "FinovaOS Team", authorRole: "Product Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#0891b2,#06b6d4)",
    date: "March 3, 2025", readTime: "6 min read",
    content: [
      { type:"intro", text:"FinovaOS's inventory module gives you real-time visibility into your stock levels, purchase orders, and sales. Every purchase invoice automatically updates stock. Every sales invoice automatically reduces it. No manual stock counting needed." },
      { type:"h2", text:"Setting Up Your Item List" },
      { type:"p", text:"Go to Inventory → Items → Add Item. For each product, set the item code, name, unit of measure, standard rate, and minimum stock level. Add a barcode for fast scanning. FinovaOS supports thousands of SKUs with no performance issues." },
      { type:"h2", text:"Purchase Orders and GRN" },
      { type:"p", text:"Create a Purchase Order in FinovaOS and send it to your supplier. When goods arrive, create a Purchase Invoice against the PO. Stock levels update automatically. Partially received orders are tracked — you always know what's been received and what's pending." },
      { type:"h2", text:"Sales and Stock Deduction" },
      { type:"p", text:"When you create a Sales Invoice in FinovaOS, the inventory is automatically deducted. If you try to sell more than you have in stock, FinovaOS warns you. Returns via Sale Return automatically add stock back." },
      { type:"h2", text:"Stock Reports" },
      { type:"p", text:"FinovaOS's inventory reports include: Stock Summary (current levels), Stock Ledger (movement history), Low Stock Alert (items below minimum), and Stock Valuation (cost of inventory at any date)." },
      { type:"list", items:[
        "Real-time stock levels across all locations",
        "FIFO stock rate calculation",
        "Godown/location-wise stock tracking",
        "Barcode scanning support",
        "Delivery Challan before invoice",
        "Outward register for dispatch tracking",
      ]},
      { type:"quote", text:"We had no idea we were running out of stock until customers called. Now FinovaOS alerts us when any item hits minimum stock level.", author:"Operations Manager, Wholesale Distributor" },
    ],
  },

  "5": {
    title: "Tax Filing with FinovaOS: A Complete Guide for 2025",
    category: "accounting", categoryLabel: "Accounting Tips", color: "#c4b5fd",
    author: "FinovaOS Team", authorRole: "Finance Experts", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#7c3aed,#a78bfa)",
    date: "March 1, 2025", readTime: "8 min read",
    content: [
      { type:"intro", text:"Tax filing doesn't have to be a last-minute panic. FinovaOS tracks tax data on every transaction throughout the year so that when filing season arrives, the numbers are ready to hand to your consultant. Here's how to use FinovaOS to keep tax data clean." },
      { type:"h2", text:"Sales Tax / GST Reports" },
      { type:"p", text:"Every sales invoice in FinovaOS records tax amounts against the tax code you selected. At month end, go to Reports → Tax → Sales Tax Summary for a detailed report of all taxable sales, tax collected, and net payable — export as PDF or Excel and hand to your accountant for the filing." },
      { type:"h2", text:"Income Tax on Salary" },
      { type:"p", text:"Set an income tax deduction line on each employee based on their annual FBR slab. Every month it deducts the correct amount from net pay. At year end, run the salary summary per employee — gross salary, total tax deducted, other deductions — for your consultant to generate the certificate." },
      { type:"h2", text:"Withholding Tax on Suppliers" },
      { type:"p", text:"When you record a supplier payment, add the WHT deduction as a line item and tag it to the vendor. The WHT register shows all such deductions grouped by supplier for monthly filing." },
      { type:"h2", text:"Annual Accounts for Tax Filing" },
      { type:"p", text:"FinovaOS's Balance Sheet, Profit & Loss, and Cash Flow statements come out clean and consistent — the same format year on year. Your tax consultant can use them directly without reformatting." },
      { type:"list", items:[
        "Sales Tax / GST monthly summary reports",
        "Salary tax as a configurable deduction line per employee",
        "WHT register grouped by supplier",
        "Annual accounts — Balance Sheet, P&L, Cash Flow",
        "Tax ID (NTN / STRN) tracking per customer and supplier",
        "Export to PDF or Excel for consultant hand-off",
      ]},
      { type:"quote", text:"Our chartered accountant liked how organised the FinovaOS reports were. Everything he needed for tax filing was already tagged and grouped. Filing was much faster this year.", author:"CEO, Import/Export Company" },
    ],
  },

  "6": {
    title: "Multi-Branch Accounting with FinovaOS: One Dashboard, Every Location",
    category: "business", categoryLabel: "Business Growth", color: "#f9a8d4",
    author: "FinovaOS Team", authorRole: "Enterprise Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#be185d,#ec4899)",
    date: "February 27, 2025", readTime: "6 min read",
    content: [
      { type:"intro", text:"Managing accounts across multiple branches used to mean consolidating spreadsheets from each location every month. With FinovaOS's multi-branch module, every branch is live in one dashboard. Here's how it works." },
      { type:"h2", text:"Setting Up Branches in FinovaOS" },
      { type:"p", text:"Go to Settings → Branches → Add Branch. Create a branch for each location — New York HQ, London branch, Dubai office. Each branch gets its own code and can have its own users, inventory, and transactions." },
      { type:"h2", text:"Branch-Level Transactions" },
      { type:"p", text:"Every transaction in FinovaOS — invoices, payments, vouchers, purchase orders — can be assigned to a specific branch. This means your London branch manager sees only London data, while the head office sees everything consolidated." },
      { type:"h2", text:"Consolidated Reporting" },
      { type:"p", text:"FinovaOS's consolidated reports show you the full picture across all branches. P&L by branch, Balance Sheet consolidated, Cash Flow per location — all in one report. No more Excel merging at month end." },
      { type:"h2", text:"Cost Centers for Departments" },
      { type:"p", text:"In addition to branches, FinovaOS supports Cost Centers — useful for tracking profitability by department (Sales, Operations, Marketing) within the same branch. Assign any transaction to a cost center for granular reporting." },
      { type:"list", items:[
        "Unlimited branches — no extra cost on Enterprise plan",
        "Branch-specific users and permissions",
        "Consolidated P&L, Balance Sheet, and Cash Flow",
        "Inter-branch transfers tracked automatically",
        "Cost center profitability reports",
        "Branch-level inventory management",
      ]},
      { type:"quote", text:"We have branches across Europe and one in Dubai. Before FinovaOS, month-end consolidation took a week. Now it's instant — one click.", author:"CFO, Distribution Group" },
    ],
  },

  "7": {
    title: "How to Use FinovaOS's Quotation Module to Close Deals Faster",
    category: "guides", categoryLabel: "How-to Guides", color: "#38bdf8",
    author: "FinovaOS Team", authorRole: "Product Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#0891b2,#06b6d4)",
    date: "February 25, 2025", readTime: "5 min read",
    content: [
      { type:"intro", text:"FinovaOS's quotation module lets you create professional quotes in minutes and convert them to invoices with one click — no re-entry needed. Here's how to use it to speed up your sales cycle." },
      { type:"h2", text:"Creating a Quotation" },
      { type:"p", text:"Go to Sales → Quotations → New Quotation. Select the customer, add your items with quantities and rates, apply any discount, set a validity date, and save. FinovaOS generates a professional PDF quote ready to send." },
      { type:"h2", text:"Sending the Quote" },
      { type:"p", text:"Send the quotation directly from FinovaOS via email, or download the PDF and share via WhatsApp. The customer can review itemized pricing, validity period, and your terms and conditions." },
      { type:"h2", text:"Quote to Invoice in One Click" },
      { type:"p", text:"When the customer accepts, go to the quotation and click 'Convert to Invoice'. FinovaOS creates a Sales Invoice with all line items pre-filled. No duplicate data entry. No errors from retyping." },
      { type:"h2", text:"Quote to Delivery Challan" },
      { type:"p", text:"Alternatively, convert the quotation to a Delivery Challan first — for businesses that deliver goods before invoicing. The challan confirms delivery, then converts to invoice when payment terms are agreed." },
      { type:"list", items:[
        "Professional PDF quotation templates",
        "Validity date tracking — expired quotes flagged automatically",
        "One-click conversion: Quote → Challan → Invoice",
        "Quote approval workflow for large deals",
        "Pipeline view — see all open quotes and their values",
        "Quote comparison — send multiple options to one customer",
      ]},
      { type:"quote", text:"Our quote-to-invoice conversion used to take 30 minutes of re-entry. With FinovaOS it's one click. We close deals faster because customers get their invoice immediately.", author:"Sales Manager, Engineering Supplies" },
    ],
  },

  "8": {
    title: "FinovaOS Custom Plans: Build Your Perfect Accounting Package",
    category: "product", categoryLabel: "Product Features", color: "#c4b5fd",
    author: "FinovaOS Team", authorRole: "Product Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#7c3aed,#c4b5fd)",
    date: "February 22, 2025", readTime: "4 min read",
    content: [
      { type:"intro", text:"Not every business needs every feature. A freelance consultant doesn't need inventory management. A trading company doesn't need CRM. FinovaOS's Custom Plan lets you pay only for the modules you actually use." },
      { type:"h2", text:"Available Modules" },
      { type:"list", items:[
        "Accounting & Invoicing — $15/month",
        "CRM — $15/month",
        "HR & Payroll — $20/month",
        "Bank Reconciliation — $10/month",
        "Inventory Management — $12/month",
        "Advanced Reports — $8/month",
        "Multi-Branch — $15/month",
        "WhatsApp Notifications — $8/month",
        "API Access — $20/month",
        "Tax Filing Reports — $10/month",
      ]},
      { type:"h2", text:"How to Build Your Custom Plan" },
      { type:"p", text:"Go to finovaos.app/pricing and click 'Build Your Plan'. Select the modules you need — the price updates in real time as you add or remove modules. When you're satisfied, click 'Get Custom Plan' and complete signup." },
      { type:"h2", text:"Changing Your Plan Later" },
      { type:"p", text:"Your business needs change. Add modules anytime from Settings → Subscription → Manage Modules. New modules are activated immediately and prorated billing is applied for the remainder of the month." },
      { type:"h2", text:"Who Should Use Custom Plans?" },
      { type:"list", items:[
        "Startups — start with just Accounting & Invoicing, add more as you grow",
        "Consultants and freelancers — invoicing only, no inventory needed",
        "HR firms — HR & Payroll without accounting",
        "Sales-focused teams — CRM without the full accounting suite",
        "Seasonal businesses — add/remove modules based on business cycle",
      ]},
      { type:"quote", text:"We only needed invoicing and bank reconciliation. The Custom Plan saved us 60% compared to the Pro plan. We added HR when we hired our 5th employee.", author:"Founder, IT Services Company" },
    ],
  },

  "9": {
    title: "FinovaOS Reports: Every Financial Report Your Business Needs",
    category: "accounting", categoryLabel: "Accounting Tips", color: "#fbbf24",
    author: "FinovaOS Team", authorRole: "Finance Experts", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#b45309,#f59e0b)",
    date: "February 20, 2025", readTime: "6 min read",
    content: [
      { type:"intro", text:"FinovaOS generates every financial report your business needs — from daily cash position to annual tax statements. Here's a complete overview of FinovaOS's reporting module and how each report helps you run a better business." },
      { type:"h2", text:"Core Financial Reports" },
      { type:"list", items:[
        "Profit & Loss Statement — revenue, expenses, and net profit for any period",
        "Balance Sheet — assets, liabilities, and equity at any date",
        "Cash Flow Statement — operating, investing, and financing activities",
        "Trial Balance — debit/credit summary of all accounts",
        "General Ledger — complete transaction history for any account",
      ]},
      { type:"h2", text:"Sales & Receivables Reports" },
      { type:"list", items:[
        "Sales Register — all invoices with customer, amount, and payment status",
        "Accounts Receivable Aging — who owes you, and how overdue they are",
        "Customer Statement — full transaction history per customer",
        "Sales by Product — which items are your top sellers",
        "Sales by Branch — performance comparison across locations",
      ]},
      { type:"h2", text:"Purchase & Payables Reports" },
      { type:"list", items:[
        "Purchase Register — all purchase invoices",
        "Accounts Payable Aging — what you owe and when it's due",
        "Supplier Statement — full transaction history per supplier",
        "Purchase Order Status — pending, partial, and completed POs",
      ]},
      { type:"h2", text:"Tax Reports" },
      { type:"list", items:[
        "Sales Tax Summary — monthly tax collected (tax authority-compatible)",
        "Withholding Tax Statement — supplier tax tracking",
        "Income Tax (Salary) — annual tax certificates",
        "Tax by Customer/Supplier — tax ID-based tracking",
      ]},
      { type:"h2", text:"Exporting Reports" },
      { type:"p", text:"Every FinovaOS report can be exported as PDF, Excel, or CSV. Share with your accountant, submit to your tax authority, or attach to board meeting presentations. Reports can also be scheduled for automatic email delivery — weekly P&L to your phone every Monday morning." },
      { type:"quote", text:"My accountant used to spend 3 days preparing reports for our board meeting. Now he pulls them from FinovaOS in 10 minutes. The board gets better information, faster.", author:"CEO, Manufacturing Company" },
    ],
  },

  "10": {
    title: "Pakistan SME Accounting Software Guide 2026: What to Look For",
    category: "business", categoryLabel: "Business Growth", color: "#34d399",
    author: "FinovaOS Team", authorRole: "Pakistan Market Experts", authorAvatar: "FO",
    authorGradient: "linear-gradient(135deg,#059669,#34d399)",
    date: "June 10, 2026", readTime: "9 min read",
    content: [
      { type:"intro", text:"Pakistan's SME sector is rapidly shifting from manual registers and Excel sheets to cloud accounting. But not all accounting software fits Pakistani workflows. Here's what to look for in 2026." },
      { type:"h2", text:"1. Tax Data Ready for FBR Filing" },
      { type:"p", text:"Every Pakistani business has to file with FBR — Sales Tax returns, Withholding Tax, Income Tax on salaries. Your software should track tax by tax code on every transaction so your accountant can pull out the numbers they need for IRIS. FinovaOS tracks tax on each invoice and expense, giving you sales-tax summary and WHT registers to feed into your filing." },
      { type:"h2", text:"2. PKR & Multi-Currency Support" },
      { type:"p", text:"Pakistani businesses dealing internationally need PKR as their base currency plus support for USD, AED, EUR, and GBP. FinovaOS supports 12 major currencies (USD, GBP, EUR, AED, SAR, QAR, KWD, OMR, PKR, INR, CNY, JPY) with rates refreshed several times a day and automatic FX gain/loss tracking on realised amounts." },
      { type:"h2", text:"3. Easy Invoice Sharing" },
      { type:"p", text:"In Pakistan, business is done on WhatsApp. Your accounting software should generate a clean invoice PDF you can download and share on any channel — email, WhatsApp, or print." },
      { type:"h2", text:"4. Simple, Clear Interface" },
      { type:"p", text:"Many Pakistani business owners have never used cloud software before. What matters is a dashboard that's fast, simple, and doesn't need training. FinovaOS is designed to be usable on day one — no accountant needed to record a sale or expense." },
      { type:"h2", text:"5. Bank Statement Import" },
      { type:"p", text:"HBL, MCB, UBL, Meezan Bank — download the CSV from your bank portal and import it into FinovaOS. The reconciliation engine matches by amount, date, and reference so you review candidates instead of typing entries by hand." },
      { type:"list", items:[
        "Tax tracked by code on every transaction — feeds into FBR filing",
        "PKR + 11 other currencies with rate updates and FX gain/loss",
        "Clean PDF invoices — share via email or WhatsApp",
        "Simple, mobile-friendly dashboard",
        "Bank CSV import + smart matching reconciliation",
        "Payroll module with configurable deductions (record EOBI/PESSI/tax as line items)",
      ]},
      { type:"quote", text:"FinovaOS ne meri accounting ka setup easy kar diya. Invoices, expenses, aur bank reconciliation sab ek jagah — accountant ko sirf tax filing time pe report bhej deta hoon.", author:"Ahmed Raza, Owner — Al-Raza Traders, Karachi" },
    ],
  },

  "11": {
    title: "FBR Tax Filing for Small Businesses in Pakistan: Step-by-Step 2026",
    category: "accounting", categoryLabel: "Accounting Tips", color: "#f87171",
    author: "FinovaOS Team", authorRole: "Tax & Compliance Experts", authorAvatar: "FO",
    authorGradient: "linear-gradient(135deg,#dc2626,#f87171)",
    date: "June 8, 2026", readTime: "10 min read",
    content: [
      { type:"intro", text:"FBR tax compliance is the biggest pain point for Pakistani SMEs. This guide explains each major tax obligation — Sales Tax, Income Tax, Withholding Tax — and how good bookkeeping in FinovaOS makes filing season a lot less painful. Filing itself still happens on IRIS with your tax consultant; FinovaOS's job is to keep your numbers clean and pullable." },
      { type:"h2", text:"Understanding Pakistan's Main Business Taxes" },
      { type:"list", items:[
        "Sales Tax (GST): Collected from customers on taxable sales and remitted monthly via IRIS",
        "Withholding Tax (WHT): Deducted on payments to suppliers — rates vary by vendor category",
        "Income Tax on Salary: Deducted from employees per FBR slabs and deposited with FBR",
        "Advance Income Tax: Paid quarterly by registered companies",
        "Corporate Tax: Paid annually based on net profit",
      ]},
      { type:"h2", text:"Step 1: Register on FBR IRIS" },
      { type:"p", text:"Go to iris.fbr.gov.pk and register your business. You'll receive an NTN (National Tax Number) and STRN (Sales Tax Registration Number) if applicable. Store these in FinovaOS Company Settings so they appear on all tax-relevant invoices." },
      { type:"h2", text:"Step 2: Configure Tax Codes in FinovaOS" },
      { type:"p", text:"In Settings → Tax, set up your sales tax rates (typically 17% or 18%) and any WHT rates you commonly apply. Every invoice and expense you record afterwards can be tagged with the right tax code, so the tax data is captured at source rather than reconstructed at month end." },
      { type:"h2", text:"Step 3: Monthly Sales Tax Data" },
      { type:"p", text:"At month end, run the Sales Tax report in FinovaOS. It shows every taxable sale, tax collected, and net payable — grouped by tax code. Export it to Excel or PDF and hand it to your tax consultant for the IRIS ST-3 filing. FinovaOS gives you the numbers; the IRIS submission itself is done on the FBR portal." },
      { type:"h2", text:"Step 4: Withholding Tax Register" },
      { type:"p", text:"When you record a supplier payment, note the WHT amount as a deduction line. Run the Withholding Tax register monthly to get a full supplier-wise breakdown for your accountant to file on IRIS." },
      { type:"h2", text:"Step 5: Annual Accounts for the Income Tax Return" },
      { type:"p", text:"FinovaOS's Balance Sheet, Profit & Loss, and Cash Flow are ready to hand off to your tax consultant for your annual income tax return. Because everything ties back to individual transactions in FinovaOS, your consultant can drill down whenever the FBR asks a question." },
      { type:"quote", text:"FBR ka kaam pehle sara Excel mein hota tha aur har month accountant ko purani entries dhoondni parti thi. Ab FinovaOS mein sab live rehta hai — jab report chahiye ek click pe mil jaati hai. Filing time bohot kam ho gaya.", author:"Hassan Mahmood, MD — Metro Wholesale Co., Lahore" },
    ],
  },

  "12": {
    title: "Best Accounting Software for Pakistani Traders & Wholesalers",
    category: "business", categoryLabel: "Business Growth", color: "#818cf8",
    author: "FinovaOS Team", authorRole: "Product Comparisons", authorAvatar: "FO",
    authorGradient: "linear-gradient(135deg,#4f46e5,#818cf8)",
    date: "June 5, 2026", readTime: "8 min read",
    content: [
      { type:"intro", text:"Pakistani traders and wholesalers have very specific needs — party ledgers, godown management, purchase orders, credit limits, and FBR compliance. Here's how FinovaOS compares to the alternatives." },
      { type:"h2", text:"What Pakistani Traders Actually Need" },
      { type:"list", items:[
        "Party ledger (customer & supplier outstanding balances)",
        "Godown / warehouse-level stock tracking",
        "Purchase order to delivery workflow with stock updates",
        "Quotation → delivery challan → invoice conversion",
        "Credit limit tracking per customer",
        "Sales tax and WHT captured on every transaction (ready for filing)",
        "Multi-branch operations",
        "Clean invoice PDFs for email/WhatsApp sharing",
      ]},
      { type:"h2", text:"FinovaOS vs Xero" },
      { type:"p", text:"Xero is excellent for Western markets but its pricing in PKR is heavy for smaller SMEs and it isn't tuned for the traders/wholesalers workflow common in Pakistan — party ledgers, godown-level stock, and quick invoice sharing over messaging apps. FinovaOS is priced and structured for South Asian SMEs." },
      { type:"h2", text:"FinovaOS vs Zoho Books" },
      { type:"p", text:"Zoho Books has strong multi-currency support and is a solid product overall. Where FinovaOS differs is the tighter focus on the trader/wholesaler workflow: party ledgers front and centre, godown-level inventory, and quote → challan → invoice conversion in a single flow." },
      { type:"h2", text:"FinovaOS vs Peachtree / QuickBooks Desktop" },
      { type:"p", text:"Many Pakistani businesses still use Peachtree or QuickBooks Desktop. These are capable but require local servers, IT maintenance, no easy remote access, and no built-in backups. FinovaOS is cloud-based — access from your phone, from any city, with automatic backups." },
      { type:"h2", text:"FinovaOS vs Manual Excel / WhatsApp Ledgers" },
      { type:"p", text:"Using Excel or WhatsApp for accounts is free but costs you in errors, time, and late payments. Moving to a real accounting system saves hours every week — no more spreadsheet-merging at month end, and invoices sit in one searchable place instead of scattered chat threads." },
      { type:"quote", text:"Pehle hum Peachtree use karte thay. Server crash ho gaya aur 6 mahine ka data gum ho gaya. Ab FinovaOS use karte hain — cloud pe hai, data kabi delete nahi hoga.", author:"Usman Ali, Director — Ali Construction Group, Karachi" },
    ],
  },

  "13": {
    title: "How to Automate Payroll for 10-100 Employees in Pakistan",
    category: "guides", categoryLabel: "How-to Guides", color: "#fbbf24",
    author: "FinovaOS Team", authorRole: "HR & Payroll Experts", authorAvatar: "FO",
    authorGradient: "linear-gradient(135deg,#d97706,#fbbf24)",
    date: "June 3, 2026", readTime: "7 min read",
    content: [
      { type:"intro", text:"Payroll in Pakistan means managing EOBI contributions, PESSI (in Punjab), income tax deductions, and gratuity — all before you write a single payslip. FinovaOS gives you a clean payroll workspace where you set the deduction lines up once and run the same payroll every month with minimal manual work." },
      { type:"h2", text:"Pakistan Payroll Basics" },
      { type:"list", items:[
        "EOBI: Employee 1% + Employer 5% of minimum wage — standard fixed contribution",
        "PESSI (Punjab): Rate applied on basic salary for provincial employees",
        "Income Tax: Salaried individuals taxed per annual FBR slabs",
        "Gratuity: 1 month salary per year of service (for confirmed employees)",
        "Provident Fund: Optional — usually 8-10% each from employee and employer",
      ]},
      { type:"h2", text:"Step 1: Set Up Employees in FinovaOS" },
      { type:"p", text:"Go to HR → Employees → Add Employee. Enter their basic salary, allowances (House Rent, Medical, Transport), CNIC, NTN (if applicable), and bank account. Once set up, each employee's salary structure is reused every payroll cycle." },
      { type:"h2", text:"Step 2: Configure Deduction Lines" },
      { type:"p", text:"On each employee, add the deduction lines you need — EOBI, PESSI, income tax, provident fund, loan repayment. You set the amount or percentage once and FinovaOS applies it on every payroll run. Statutory rate changes only need a single update on the deduction line." },
      { type:"h2", text:"Step 3: Run Monthly Payroll" },
      { type:"p", text:"Go to HR → Payroll → Run Payroll. Select the month, review each employee's gross, deductions and net, and process. FinovaOS produces the payslips and posts the salary journal entry to your accounts." },
      { type:"h2", text:"Step 4: Pay Salaries and Record Receipts" },
      { type:"p", text:"Export the payroll summary and use it to run your bank's bulk salary transfer, or pay individually. Mark each salary as paid inside FinovaOS to keep employee ledgers and payables in sync." },
      { type:"h2", text:"Step 5: Year-End Reports for Tax" },
      { type:"p", text:"At year end, run the annual salary summary for each employee — total gross, total income tax deducted, EOBI contributions — and hand it to your tax consultant for FBR filings." },
      { type:"quote", text:"12 employees ki payroll ab 10 minute mein process hoti hai. Pehle Excel mein baar baar formulas theek karta tha — ab bas month select karo, review karo, done.", author:"Hassan Mahmood, MD — Metro Wholesale Co." },
    ],
  },

  "14": {
    title: "Inventory Management for Pakistani Pharmacies: Batch, Expiry & DRAP",
    category: "product", categoryLabel: "Product Features", color: "#06b6d4",
    author: "FinovaOS Team", authorRole: "Healthcare Industry Team", authorAvatar: "FO",
    authorGradient: "linear-gradient(135deg,#0891b2,#06b6d4)",
    date: "June 1, 2026", readTime: "6 min read",
    content: [
      { type:"intro", text:"Pakistani pharmacies face inventory challenges most retailers don't: batch tracking, expiry date management, DRAP-friendly records, and controlled drug registers. FinovaOS gives you a batch tracking module alongside the standard inventory system so pharmacies can keep this information in one place." },
      { type:"h2", text:"Why Standard Inventory Software Falls Short for Pharmacies" },
      { type:"list", items:[
        "Most SME software doesn't have a place to record batch numbers",
        "No expiry visibility — expired stock sits on the shelf until noticed",
        "No FIFO discipline — new stock gets sold before older stock",
        "No dedicated register for controlled substances or serialised items",
        "Weak audit trail when a supplier requests a recall",
      ]},
      { type:"h2", text:"FinovaOS Batch Tracking Module" },
      { type:"p", text:"FinovaOS ships with a Batch Tracking module where you record each incoming batch — product, batch number, expiry date, and quantity. A separate Serial Tracking module handles serialised items where each unit has to be individually accounted for." },
      { type:"h2", text:"Expiry Visibility" },
      { type:"p", text:"The Batch dashboard flags every batch by expiry status: expired items in red, batches expiring within 30 days in amber, and healthy stock in green. Sort by urgency and act — clearance sale, supplier return, or write-off — before the loss hits your P&L." },
      { type:"h2", text:"FIFO Discipline" },
      { type:"p", text:"Because expiries are visible at a glance, staff can pick the oldest batch first. Pair it with the standard inventory module — every purchase invoice adds stock and every sales invoice deducts it — to keep quantities honest." },
      { type:"h2", text:"Records for DRAP and Recalls" },
      { type:"p", text:"When an inspector or supplier asks which batch went where, the Batch and Stock Movement reports give you a clean trail: what came in, what went out, and current on-hand. Keeps you well-prepared for DRAP inspections without a paper register." },
      { type:"quote", text:"Expired stock ka pata hi nahi chalta tha pehle. Ab FinovaOS ke Batch dashboard pe har month dekh leti hoon — kaunsi dawa ka expiry qareeb hai. Wastage bohot kam ho gaya.", author:"Priya Sharma, Owner — MedPlus Pharmacy, Islamabad" },
    ],
  },

  "15": {
    title: "Cloud Accounting vs Desktop Software for SMEs in 2026",
    category: "fintech", categoryLabel: "Fintech", color: "#c4b5fd",
    author: "FinovaOS Team", authorRole: "Technology Analysts", authorAvatar: "FO",
    authorGradient: "linear-gradient(135deg,#7c3aed,#a78bfa)",
    date: "May 28, 2026", readTime: "7 min read",
    content: [
      { type:"intro", text:"Thousands of Pakistani businesses are switching from Peachtree, QuickBooks Desktop, and manual Excel to cloud accounting. Here's an honest comparison of what you gain — and what to watch out for." },
      { type:"h2", text:"The Case for Desktop Software (Why People Still Use It)" },
      { type:"list", items:[
        "One-time purchase — no monthly subscription",
        "Works offline — no internet dependency",
        "Familiar — staff already knows how to use it",
        "Data stays local — some businesses prefer this",
      ]},
      { type:"h2", text:"The Hidden Costs of Desktop Software" },
      { type:"p", text:"Desktop software's upfront cost hides ongoing expenses: IT staff to maintain the server, hardware upgrades every 3-5 years, no mobile access (owner can't check accounts on the go), no automatic backups (one server crash = lost data), and no remote work for accountants." },
      { type:"h2", text:"What Cloud Accounting Actually Gives You" },
      { type:"list", items:[
        "Access from anywhere — phone, laptop, even abroad",
        "Automatic daily backups — your data is always safe",
        "Real-time collaboration — accountant works remotely",
        "Automatic updates — new features without reinstallation",
        "No IT infrastructure — no server, no maintenance",
        "Mobile invoicing — send invoices from the warehouse",
      ]},
      { type:"h2", text:"The Internet Dependency Question" },
      { type:"p", text:"The main concern with cloud software is internet dependency. In most Pakistani cities today, 4G is reliable enough that this rarely bites — and the trade-off is worth it for the mobility and backups you get in return." },
      { type:"h2", text:"Data Security: Cloud vs Local" },
      { type:"p", text:"Local data feels safer but is actually more vulnerable — hard drives fail, servers get stolen, offices flood. FinovaOS runs on managed cloud infrastructure with encrypted storage and regular backups, so a single hardware failure at your office doesn't wipe your accounts. Compare that with a Peachtree install on one desktop PC." },
      { type:"h2", text:"Cost Comparison" },
      { type:"p", text:"Desktop software's headline price often looks lower until you add the server, an IT person to keep it running, hardware refresh every few years, and the lost time from having no mobile access. Cloud subscriptions like FinovaOS bundle hosting, backups, and updates into a single predictable monthly cost — no capex, and you can add or remove users as your team changes." },
      { type:"quote", text:"Humara server crash ho gaya aur 6 mahine ka data gaya. Tab samjha ke cloud accounting kyun zaroori hai. Ab FinovaOS pe hain — data cloud mein safe hai.", author:"Trader, Karachi — switched from Peachtree 2024" },
    ],
  },
};

const RELATED_BY_CATEGORY: Record<string, string[]> = {
  accounting: ["bank-reconciliation-guide","5","9","11"],
  guides:     ["1","2","7","13"],
  business:   ["6","8","10","12"],
  product:    ["3","4","8","14"],
  fintech:    ["5","9","15"],
};

export default function BlogDetailPage() {
  const params  = useParams();
  const slug    = params?.slug as string;
  const post    = ALL_POSTS[slug];
  const [heroVis, setHeroVis] = useState(false);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => { setTimeout(() => setHeroVis(true), 80); }, []);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!post) {
    return (
      <main style={{ minHeight:"100vh", background:"linear-gradient(160deg,#080c1e,#0c0f2e)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📄</div>
          <div style={{ fontSize:20, fontWeight:700, color:"white", marginBottom:12 }}>Article not found</div>
          <Link href="/blog" style={{ color:"#818cf8", textDecoration:"none", fontWeight:600, fontSize:14 }}>← Back to Blog</Link>
        </div>
      </main>
    );
  }

  const related = (RELATED_BY_CATEGORY[post.category] || [])
    .filter((id: string) => id !== slug)
    .slice(0, 3)
    .map((id: string) => ALL_POSTS[id] ? { ...ALL_POSTS[id], slug: id } : null)
    .filter(Boolean);

  return (
    <main style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)",
      color:"white",
      fontFamily:"'DM Sans','Outfit',system-ui,sans-serif",
      overflowX:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* Hero */}
      <section style={{ padding:"100px 24px 48px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-80, left:"50%", transform:"translateX(-50%)", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle,${post.color}18 0%,transparent 70%)`, pointerEvents:"none" }}/>
        <div style={{ maxWidth:760, margin:"0 auto", position:"relative", zIndex:1,
          opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(20px)",
          transition:"opacity .6s ease, transform .6s ease" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:22, fontSize:13 }}>
            <Link href="/blog" style={{ color:"rgba(255,255,255,.4)", textDecoration:"none", fontWeight:600 }}>Blog</Link>
            <span style={{ color:"rgba(255,255,255,.2)" }}>›</span>
            <span style={{ color:post.color, fontWeight:700 }}>{post.categoryLabel}</span>
          </div>
          <div style={{ display:"inline-flex", padding:"4px 14px", borderRadius:24, background:`${post.color}20`, border:`1px solid ${post.color}40`, marginBottom:18 }}>
            <span style={{ fontSize:11, fontWeight:800, color:post.color, letterSpacing:".06em" }}>{post.categoryLabel.toUpperCase()}</span>
          </div>
          <h1 style={{ fontSize:"clamp(26px,5vw,46px)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.15, fontFamily:"Lora,serif", margin:"0 0 22px" }}>
            {post.title}
          </h1>
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:post.authorGradient, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"white" }}>{post.authorAvatar}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"white" }}>{post.author}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{post.authorRole}</div>
              </div>
            </div>
            <div style={{ width:1, height:24, background:"rgba(255,255,255,.1)" }}/>
            <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>📅 {post.date}</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>⏱ {post.readTime}</span>
            <button onClick={copyLink} style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {copied ? "✓ Copied!" : "🔗 Share"}
            </button>
          </div>
        </div>
      </section>

      {/* Article content */}
      <div style={{ maxWidth:760, margin:"0 auto", padding:"0 24px 60px" }}>
        {post.content.map((block: any, i: number) => {
          if (block.type === "intro") return (
            <p key={i} style={{ fontSize:18, color:"rgba(255,255,255,.7)", lineHeight:1.85, margin:"0 0 32px", fontWeight:500, borderLeft:`3px solid ${post.color}`, paddingLeft:20 }}>
              {block.text}
            </p>
          );
          if (block.type === "h2") return (
            <h2 key={i} style={{ fontSize:"clamp(18px,3vw,24px)", fontWeight:800, color:"white", letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"40px 0 14px" }}>
              {block.text}
            </h2>
          );
          if (block.type === "p") return (
            <p key={i} style={{ fontSize:16, color:"rgba(255,255,255,.6)", lineHeight:1.85, margin:"0 0 20px" }}>
              {block.text}
            </p>
          );
          if (block.type === "list") return (
            <ul key={i} style={{ margin:"0 0 24px", paddingLeft:0, listStyle:"none" }}>
              {block.items.map((item: string, j: number) => (
                <li key={j} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:10, fontSize:15, color:"rgba(255,255,255,.6)", lineHeight:1.65 }}>
                  <span style={{ color:post.color, fontWeight:800, flexShrink:0, marginTop:2 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          );
          if (block.type === "numbered") return (
            <ol key={i} style={{ margin:"0 0 24px", paddingLeft:0, listStyle:"none" }}>
              {block.items.map((item: string, j: number) => (
                <li key={j} style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:12 }}>
                  <span style={{ width:28, height:28, borderRadius:8, background:`${post.color}20`, border:`1px solid ${post.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:post.color, flexShrink:0 }}>{j+1}</span>
                  <span style={{ fontSize:15, color:"rgba(255,255,255,.6)", lineHeight:1.65, paddingTop:4 }}>{item}</span>
                </li>
              ))}
            </ol>
          );
          if (block.type === "quote") return (
            <div key={i} style={{ margin:"32px 0", padding:"24px 28px", borderRadius:16, background:`${post.color}10`, border:`1px solid ${post.color}30` }}>
              <div style={{ fontSize:40, color:post.color, lineHeight:1, marginBottom:10, opacity:.6 }}>&quot;</div>
              <p style={{ fontSize:16, color:"rgba(255,255,255,.75)", lineHeight:1.75, margin:"0 0 14px", fontStyle:"italic" }}>{block.text}</p>
              <div style={{ fontSize:13, color:post.color, fontWeight:700 }}>— {block.author}</div>
            </div>
          );
          return null;
        })}

        {/* CTA */}
        <div style={{ marginTop:48, padding:"36px 32px", borderRadius:20, background:"linear-gradient(135deg,rgba(79,70,229,.2),rgba(124,58,237,.1))", border:"1px solid rgba(99,102,241,.3)", textAlign:"center" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>READY TO START?</div>
          <h3 style={{ fontSize:22, fontWeight:800, color:"white", fontFamily:"Lora,serif", margin:"0 0 10px" }}>Start using FinovaOS today</h3>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", margin:"0 auto 22px", maxWidth:380 }}>Full platform access with expert support and priority response times.</p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/signup" style={{ padding:"12px 28px", borderRadius:11, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", fontWeight:800, fontSize:13, textDecoration:"none" }}>
              Get Started →
            </Link>
            <Link href="/demo" style={{ padding:"12px 28px", borderRadius:11, background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.8)", fontWeight:700, fontSize:13, textDecoration:"none" }}>
              Book a Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div style={{ maxWidth:760, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:20 }}>Related Articles</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16 }}>
            {related.map((r: any) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} style={{ textDecoration:"none", display:"block", background:"rgba(255,255,255,.03)", borderRadius:14, border:"1px solid rgba(255,255,255,.07)", padding:"18px 16px", transition:"all .15s" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(99,102,241,.08)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(99,102,241,.25)"; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.03)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,.07)"; }}>
                <div style={{ height:3, borderRadius:2, background:r.color, marginBottom:12 }}/>
                <div style={{ fontSize:13, fontWeight:700, color:"white", lineHeight:1.4, marginBottom:8 }}>{r.title}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{r.readTime}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
