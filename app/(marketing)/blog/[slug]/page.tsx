"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const ALL_POSTS: Record<string, any> = {
  "bank-reconciliation-guide": {
    title: "The Complete Guide to Bank Reconciliation for SMEs in 2025",
    category: "accounting", categoryLabel: "Accounting Tips", color: "#818cf8",
    author: "Finova Team", authorRole: "Finance Experts", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    date: "March 10, 2025", readTime: "8 min read",
    content: [
      { type:"intro", text:"Bank reconciliation is one of the most critical tasks in accounting. For SMEs using Finova, what used to take days now takes minutes. Here's everything you need to know about bank reconciliation â€” and how to automate it completely." },
      { type:"h2", text:"What is Bank Reconciliation?" },
      { type:"p", text:"Bank reconciliation is comparing your Finova ledger entries with your actual bank statement to make sure every transaction matches. Any difference â€” called a discrepancy â€” must be investigated and resolved before closing your books." },
      { type:"p", text:"Example: Finova shows a supplier payment of $500 on March 5th, but your bank statement shows $520 on March 6th. That $20 difference could be a bank charge or a timing issue â€” you need to find out which." },
      { type:"h2", text:"Why It Matters for Your Business" },
      { type:"list", items:[
        "Catches fraud and unauthorized transactions immediately",
        "Ensures your cash position in Finova matches reality",
        "Required for tax filing â€” clean books prevent audit issues",
        "Builds investor confidence â€” accurate financials are non-negotiable",
        "Prevents small errors from becoming big problems",
      ]},
      { type:"h2", text:"How Finova Auto-Reconciliation Works" },
      { type:"numbered", items:[
        "Go to Banking â†’ Bank Reconciliation in your Finova dashboard",
        "Upload your bank statement (CSV or PDF) or connect via bank feed",
        "Finova's engine matches transactions by amount, date, and reference",
        "Matched transactions show green â€” no action needed",
        "Unmatched items are flagged in red for your review",
        "Resolve all flagged items and mark the period as reconciled",
      ]},
      { type:"h2", text:"Supported Banks in Finova" },
      { type:"p", text:"Finova supports CSV/Excel import from all major banks worldwide. For UAE businesses, ADCB and Emirates NBD formats are also supported, and UK bank formats including Barclays and HSBC are fully compatible. Direct bank feed connections are coming in Q2 2025." },
      { type:"h2", text:"Common Discrepancies and How to Fix Them" },
      { type:"p", text:"Bank charges: Your bank deducts fees that aren't in Finova yet. Simply add them as an expense entry in Finova and the reconciliation will match." },
      { type:"p", text:"Timing differences: A cheque you issued hasn't cleared yet. Mark it as 'outstanding' in Finova â€” it will clear in the next period." },
      { type:"p", text:"Duplicate entries: You accidentally entered the same transaction twice. Delete the duplicate and reconcile." },
      { type:"quote", text:"We used to spend 2 full days every month on bank reconciliation. With Finova, our accountant finishes it in 25 minutes every Monday morning.", author:"James Thompson, CEO â€” Thompson Trading Co." },
      { type:"h2", text:"Best Practices" },
      { type:"list", items:[
        "Reconcile every month â€” never skip even one period",
        "Set up Finova bank alerts to catch unusual transactions in real time",
        "Keep scanned copies of all bank statements in Finova's document vault",
        "Use Finova's reconciliation report for your accountant and tax authority filings",
      ]},
    ],
  },

  "1": {
    title: "How to Create and Send Professional Invoices with Finova",
    category: "guides", categoryLabel: "How-to Guides", color: "#34d399",
    author: "Finova Team", authorRole: "Product Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#059669,#34d399)",
    date: "March 8, 2025", readTime: "5 min read",
    content: [
      { type:"intro", text:"Creating a professional invoice in Finova takes less than 2 minutes. From custom templates to automatic payment reminders, here's how to get paid faster using Finova's invoicing module." },
      { type:"h2", text:"Step 1: Create a New Invoice" },
      { type:"p", text:"From your Finova dashboard, go to Sales â†’ Sales Invoices â†’ New Invoice. Select your customer from the list (or add a new one), set the invoice date and due date, then add your line items." },
      { type:"h2", text:"Step 2: Add Products/Services" },
      { type:"p", text:"Each line item pulls from your Finova inventory or service list. The rate, tax, and total are calculated automatically. You can add discounts at the line level or as an overall invoice discount." },
      { type:"h2", text:"Step 3: Apply Tax Configuration" },
      { type:"p", text:"Finova supports GST, Sales Tax, and VAT configurations. Select the applicable tax from your pre-configured tax codes and Finova calculates the tax amount and grand total automatically â€” fully compliant with your local tax authority requirements." },
      { type:"h2", text:"Step 4: Choose Your Template" },
      { type:"p", text:"Finova offers 5 professional invoice templates. Select the one that matches your brand, add your logo, and customize colors. Your template is saved for future invoices." },
      { type:"h2", text:"Step 5: Send and Track" },
      { type:"p", text:"Send the invoice directly from Finova via email. The customer receives a professional PDF with a payment link. Finova tracks when the email was opened and marks the invoice as paid when payment is received." },
      { type:"list", items:[
        "Automatic payment reminders â€” 7 days, 3 days, and on due date",
        "WhatsApp invoice sharing (beta)",
        "Multi-currency invoicing â€” 150+ currencies supported",
        "Recurring invoices â€” set up once, auto-generate monthly",
        "Bulk invoice creation from delivery challans",
      ]},
      { type:"quote", text:"Our invoice processing time went from 45 minutes per invoice to 8 minutes. That's 37 minutes saved, per invoice, every day.", author:"Finance Manager, Distribution Company" },
    ],
  },

  "2": {
    title: "Finova HR & Payroll: Complete Setup Guide for Your Business",
    category: "guides", categoryLabel: "How-to Guides", color: "#fbbf24",
    author: "Finova Team", authorRole: "HR Module Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#b45309,#f59e0b)",
    date: "March 6, 2025", readTime: "7 min read",
    content: [
      { type:"intro", text:"Finova's HR & Payroll module handles everything from employee onboarding to monthly payslips, statutory contribution calculations, and income tax withholding â€” all in one place. Here's how to set it up for your business." },
      { type:"h2", text:"Step 1: Add Your Employees" },
      { type:"p", text:"Go to HR â†’ Employees â†’ Add Employee. Fill in the employee's personal details, designation, department, date of joining, and base salary. Finova automatically calculates statutory contributions based on local regulations." },
      { type:"h2", text:"Step 2: Configure Salary Components" },
      { type:"p", text:"For each employee, set up their salary structure: basic salary, housing allowance, transport, medical allowance, and any other allowances. Finova uses this to calculate gross salary and applicable deductions." },
      { type:"h2", text:"Step 3: Statutory Contributions Setup" },
      { type:"p", text:"Finova automatically calculates statutory contributions based on your country's requirements. Both employee and employer contribution rates are applied and updated whenever regulations change." },
      { type:"h2", text:"Step 4: Income Tax Configuration" },
      { type:"p", text:"Finova applies the applicable income tax bands automatically for your jurisdiction. For each employee, the annual salary is calculated, tax is computed at the correct rate, and divided by 12 for monthly deduction. Tax certificates are generated automatically at year end." },
      { type:"h2", text:"Step 5: Run Monthly Payroll" },
      { type:"p", text:"Go to HR â†’ Payroll â†’ Run Payroll, select the month, review all calculations, and approve. Finova generates individual payslips for every employee, posts the payroll journal entry to your accounts, and marks salaries as paid." },
      { type:"list", items:[
        "Statutory contribution reports â€” ready for regulatory submission",
        "Region-specific compliance rules",
        "Gratuity accrual tracking â€” automatic calculation",
        "Leave management â€” casual, sick, annual",
        "Advance salary management with automatic deduction",
        "Employee documents vault â€” contracts, ID documents, degrees",
      ]},
      { type:"quote", text:"We had a labour dispute over gratuity miscalculation. Since Finova, every calculation is automatic and documented. Zero disputes in 18 months.", author:"HR Manager, Manufacturing Company" },
    ],
  },

  "3": {
    title: "Using Finova CRM to Convert More Leads into Paying Customers",
    category: "product", categoryLabel: "Product Features", color: "#818cf8",
    author: "Finova Team", authorRole: "Product Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    date: "March 5, 2025", readTime: "5 min read",
    content: [
      { type:"intro", text:"Finova's CRM module connects your customer relationships directly to your financial data. When a deal closes, an invoice is created automatically. When a payment is received, the CRM updates. Here's how to use it effectively." },
      { type:"h2", text:"Setting Up Your CRM Pipeline" },
      { type:"p", text:"Go to CRM â†’ Contacts â†’ New Contact. Add your leads, customers, and partners. Assign them a type (Lead, Customer, Supplier, Partner) and link them to your Chart of Accounts if they're also accounting parties." },
      { type:"h2", text:"Managing Opportunities" },
      { type:"p", text:"For each potential deal, create an Opportunity. Set the deal value, probability percentage, expected close date, and current stage (Lead â†’ Prospect â†’ Negotiation â†’ Won/Lost). Finova shows your pipeline value and win probability at a glance." },
      { type:"h2", text:"Logging Interactions" },
      { type:"p", text:"Every call, meeting, email, and site visit can be logged against a contact. Set follow-up reminders. Finova's activity feed gives you a complete history of every interaction with every customer â€” accessible to your entire sales team." },
      { type:"h2", text:"Connecting CRM to Finance" },
      { type:"p", text:"When an opportunity is marked as Won, Finova can automatically create a Quotation or Sales Invoice from the deal data. No double entry. No errors. The financial record is created the moment the sale is confirmed." },
      { type:"list", items:[
        "Contact profiles with full interaction history",
        "Pipeline view with deal values and stages",
        "Automatic invoice creation from won opportunities",
        "Follow-up reminders and activity tracking",
        "Contact documents â€” proposals, contracts, agreements",
        "Notes â€” private or shared with team",
      ]},
      { type:"quote", text:"Our sales team now sees outstanding payments against each customer directly in the CRM. Chasing overdue invoices has become much easier.", author:"Sales Director, Global Trading Co." },
    ],
  },

  "4": {
    title: "Finova Inventory Management: Track Stock, Purchases, and Sales in Real Time",
    category: "product", categoryLabel: "Product Features", color: "#38bdf8",
    author: "Finova Team", authorRole: "Product Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#0891b2,#06b6d4)",
    date: "March 3, 2025", readTime: "6 min read",
    content: [
      { type:"intro", text:"Finova's inventory module gives you real-time visibility into your stock levels, purchase orders, and sales. Every purchase invoice automatically updates stock. Every sales invoice automatically reduces it. No manual stock counting needed." },
      { type:"h2", text:"Setting Up Your Item List" },
      { type:"p", text:"Go to Inventory â†’ Items â†’ Add Item. For each product, set the item code, name, unit of measure, standard rate, and minimum stock level. Add a barcode for fast scanning. Finova supports thousands of SKUs with no performance issues." },
      { type:"h2", text:"Purchase Orders and GRN" },
      { type:"p", text:"Create a Purchase Order in Finova and send it to your supplier. When goods arrive, create a Purchase Invoice against the PO. Stock levels update automatically. Partially received orders are tracked â€” you always know what's been received and what's pending." },
      { type:"h2", text:"Sales and Stock Deduction" },
      { type:"p", text:"When you create a Sales Invoice in Finova, the inventory is automatically deducted. If you try to sell more than you have in stock, Finova warns you. Returns via Sale Return automatically add stock back." },
      { type:"h2", text:"Stock Reports" },
      { type:"p", text:"Finova's inventory reports include: Stock Summary (current levels), Stock Ledger (movement history), Low Stock Alert (items below minimum), and Stock Valuation (cost of inventory at any date)." },
      { type:"list", items:[
        "Real-time stock levels across all locations",
        "FIFO stock rate calculation",
        "Godown/location-wise stock tracking",
        "Barcode scanning support",
        "Delivery Challan before invoice",
        "Outward register for dispatch tracking",
      ]},
      { type:"quote", text:"We had no idea we were running out of stock until customers called. Now Finova alerts us when any item hits minimum stock level.", author:"Operations Manager, Wholesale Distributor" },
    ],
  },

  "5": {
    title: "Tax Filing with Finova: A Complete Guide for 2025",
    category: "accounting", categoryLabel: "Accounting Tips", color: "#c4b5fd",
    author: "Finova Team", authorRole: "Finance Experts", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#7c3aed,#a78bfa)",
    date: "March 1, 2025", readTime: "8 min read",
    content: [
      { type:"intro", text:"Tax filing doesn't have to be a last-minute panic. Finova generates tax authority-compatible reports throughout the year so that when filing season arrives, everything is ready. Here's how to use Finova for seamless tax compliance." },
      { type:"h2", text:"Sales Tax / GST Reports" },
      { type:"p", text:"Every sales invoice in Finova tracks tax amounts by tax code. At month end, go to Reports â†’ Tax â†’ Sales Tax Summary. Finova generates a detailed report of all taxable sales, tax collected, and net payable â€” in the format required by your local tax authority." },
      { type:"h2", text:"Income Tax Withholding (Salary)" },
      { type:"p", text:"Finova's payroll module deducts income tax from employee salaries every month. At year end, generate the Annual Tax Certificates for all employees directly from HR â†’ Reports â†’ Tax Certificates." },
      { type:"h2", text:"Withholding Tax on Suppliers" },
      { type:"p", text:"When you pay a supplier who is subject to withholding tax, Finova automatically calculates and deducts the applicable rate. Monthly withholding tax statements are generated automatically for submission to your tax authority." },
      { type:"h2", text:"Annual Accounts for Tax Filing" },
      { type:"p", text:"Finova's Balance Sheet, Profit & Loss, and Cash Flow statements are formatted for direct use in tax filing. Your tax consultant can access these reports directly â€” no reformatting needed." },
      { type:"list", items:[
        "Sales Tax / GST monthly statements",
        "Income tax withholding (salary) certificates",
        "Withholding tax on supplier payments",
        "Annual accounts â€” Balance Sheet, P&L",
        "Tax authority-compatible report formats",
        "Tax ID tracking per customer/supplier",
      ]},
      { type:"quote", text:"Our chartered accountant was amazed. Every report he needed for tax filing was already in Finova, correctly formatted. Filing took 2 hours instead of 2 days.", author:"CEO, Import/Export Company" },
    ],
  },

  "6": {
    title: "Multi-Branch Accounting with Finova: One Dashboard, Every Location",
    category: "business", categoryLabel: "Business Growth", color: "#f9a8d4",
    author: "Finova Team", authorRole: "Enterprise Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#be185d,#ec4899)",
    date: "February 27, 2025", readTime: "6 min read",
    content: [
      { type:"intro", text:"Managing accounts across multiple branches used to mean consolidating spreadsheets from each location every month. With Finova's multi-branch module, every branch is live in one dashboard. Here's how it works." },
      { type:"h2", text:"Setting Up Branches in Finova" },
      { type:"p", text:"Go to Settings â†’ Branches â†’ Add Branch. Create a branch for each location â€” New York HQ, London branch, Dubai office. Each branch gets its own code and can have its own users, inventory, and transactions." },
      { type:"h2", text:"Branch-Level Transactions" },
      { type:"p", text:"Every transaction in Finova â€” invoices, payments, vouchers, purchase orders â€” can be assigned to a specific branch. This means your London branch manager sees only London data, while the head office sees everything consolidated." },
      { type:"h2", text:"Consolidated Reporting" },
      { type:"p", text:"Finova's consolidated reports show you the full picture across all branches. P&L by branch, Balance Sheet consolidated, Cash Flow per location â€” all in one report. No more Excel merging at month end." },
      { type:"h2", text:"Cost Centers for Departments" },
      { type:"p", text:"In addition to branches, Finova supports Cost Centers â€” useful for tracking profitability by department (Sales, Operations, Marketing) within the same branch. Assign any transaction to a cost center for granular reporting." },
      { type:"list", items:[
        "Unlimited branches â€” no extra cost on Enterprise plan",
        "Branch-specific users and permissions",
        "Consolidated P&L, Balance Sheet, and Cash Flow",
        "Inter-branch transfers tracked automatically",
        "Cost center profitability reports",
        "Branch-level inventory management",
      ]},
      { type:"quote", text:"We have branches across Europe and one in Dubai. Before Finova, month-end consolidation took a week. Now it's instant â€” one click.", author:"CFO, Distribution Group" },
    ],
  },

  "7": {
    title: "How to Use Finova's Quotation Module to Close Deals Faster",
    category: "guides", categoryLabel: "How-to Guides", color: "#38bdf8",
    author: "Finova Team", authorRole: "Product Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#0891b2,#06b6d4)",
    date: "February 25, 2025", readTime: "5 min read",
    content: [
      { type:"intro", text:"Finova's quotation module lets you create professional quotes in minutes and convert them to invoices with one click â€” no re-entry needed. Here's how to use it to speed up your sales cycle." },
      { type:"h2", text:"Creating a Quotation" },
      { type:"p", text:"Go to Sales â†’ Quotations â†’ New Quotation. Select the customer, add your items with quantities and rates, apply any discount, set a validity date, and save. Finova generates a professional PDF quote ready to send." },
      { type:"h2", text:"Sending the Quote" },
      { type:"p", text:"Send the quotation directly from Finova via email, or download the PDF and share via WhatsApp. The customer can review itemized pricing, validity period, and your terms and conditions." },
      { type:"h2", text:"Quote to Invoice in One Click" },
      { type:"p", text:"When the customer accepts, go to the quotation and click 'Convert to Invoice'. Finova creates a Sales Invoice with all line items pre-filled. No duplicate data entry. No errors from retyping." },
      { type:"h2", text:"Quote to Delivery Challan" },
      { type:"p", text:"Alternatively, convert the quotation to a Delivery Challan first â€” for businesses that deliver goods before invoicing. The challan confirms delivery, then converts to invoice when payment terms are agreed." },
      { type:"list", items:[
        "Professional PDF quotation templates",
        "Validity date tracking â€” expired quotes flagged automatically",
        "One-click conversion: Quote â†’ Challan â†’ Invoice",
        "Quote approval workflow for large deals",
        "Pipeline view â€” see all open quotes and their values",
        "Quote comparison â€” send multiple options to one customer",
      ]},
      { type:"quote", text:"Our quote-to-invoice conversion used to take 30 minutes of re-entry. With Finova it's one click. We close deals faster because customers get their invoice immediately.", author:"Sales Manager, Engineering Supplies" },
    ],
  },

  "8": {
    title: "Finova Custom Plans: Build Your Perfect Accounting Package",
    category: "product", categoryLabel: "Product Features", color: "#c4b5fd",
    author: "Finova Team", authorRole: "Product Team", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#7c3aed,#c4b5fd)",
    date: "February 22, 2025", readTime: "4 min read",
    content: [
      { type:"intro", text:"Not every business needs every feature. A freelance consultant doesn't need inventory management. A trading company doesn't need CRM. Finova's Custom Plan lets you pay only for the modules you actually use." },
      { type:"h2", text:"Available Modules" },
      { type:"list", items:[
        "Accounting & Invoicing â€” $15/month",
        "CRM â€” $15/month",
        "HR & Payroll â€” $20/month",
        "Bank Reconciliation â€” $10/month",
        "Inventory Management â€” $12/month",
        "Advanced Reports â€” $8/month",
        "Multi-Branch â€” $15/month",
        "WhatsApp Notifications â€” $8/month",
        "API Access â€” $20/month",
        "Tax Filing Reports â€” $10/month",
      ]},
      { type:"h2", text:"How to Build Your Custom Plan" },
      { type:"p", text:"Go to finovaos.app/pricing and click 'Build Your Plan'. Select the modules you need â€” the price updates in real time as you add or remove modules. When you're satisfied, click 'Get Custom Plan' and complete signup." },
      { type:"h2", text:"Changing Your Plan Later" },
      { type:"p", text:"Your business needs change. Add modules anytime from Settings â†’ Subscription â†’ Manage Modules. New modules are activated immediately and prorated billing is applied for the remainder of the month." },
      { type:"h2", text:"Who Should Use Custom Plans?" },
      { type:"list", items:[
        "Startups â€” start with just Accounting & Invoicing, add more as you grow",
        "Consultants and freelancers â€” invoicing only, no inventory needed",
        "HR firms â€” HR & Payroll without accounting",
        "Sales-focused teams â€” CRM without the full accounting suite",
        "Seasonal businesses â€” add/remove modules based on business cycle",
      ]},
      { type:"quote", text:"We only needed invoicing and bank reconciliation. The Custom Plan saved us 60% compared to the Pro plan. We added HR when we hired our 5th employee.", author:"Founder, IT Services Company" },
    ],
  },

  "9": {
    title: "Finova Reports: Every Financial Report Your Business Needs",
    category: "accounting", categoryLabel: "Accounting Tips", color: "#fbbf24",
    author: "Finova Team", authorRole: "Finance Experts", authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#b45309,#f59e0b)",
    date: "February 20, 2025", readTime: "6 min read",
    content: [
      { type:"intro", text:"Finova generates every financial report your business needs â€” from daily cash position to annual tax statements. Here's a complete overview of Finova's reporting module and how each report helps you run a better business." },
      { type:"h2", text:"Core Financial Reports" },
      { type:"list", items:[
        "Profit & Loss Statement â€” revenue, expenses, and net profit for any period",
        "Balance Sheet â€” assets, liabilities, and equity at any date",
        "Cash Flow Statement â€” operating, investing, and financing activities",
        "Trial Balance â€” debit/credit summary of all accounts",
        "General Ledger â€” complete transaction history for any account",
      ]},
      { type:"h2", text:"Sales & Receivables Reports" },
      { type:"list", items:[
        "Sales Register â€” all invoices with customer, amount, and payment status",
        "Accounts Receivable Aging â€” who owes you, and how overdue they are",
        "Customer Statement â€” full transaction history per customer",
        "Sales by Product â€” which items are your top sellers",
        "Sales by Branch â€” performance comparison across locations",
      ]},
      { type:"h2", text:"Purchase & Payables Reports" },
      { type:"list", items:[
        "Purchase Register â€” all purchase invoices",
        "Accounts Payable Aging â€” what you owe and when it's due",
        "Supplier Statement â€” full transaction history per supplier",
        "Purchase Order Status â€” pending, partial, and completed POs",
      ]},
      { type:"h2", text:"Tax Reports" },
      { type:"list", items:[
        "Sales Tax Summary â€” monthly tax collected (tax authority-compatible)",
        "Withholding Tax Statement â€” supplier tax tracking",
        "Income Tax (Salary) â€” annual tax certificates",
        "Tax by Customer/Supplier â€” tax ID-based tracking",
      ]},
      { type:"h2", text:"Exporting Reports" },
      { type:"p", text:"Every Finova report can be exported as PDF, Excel, or CSV. Share with your accountant, submit to your tax authority, or attach to board meeting presentations. Reports can also be scheduled for automatic email delivery â€” weekly P&L to your phone every Monday morning." },
      { type:"quote", text:"My accountant used to spend 3 days preparing reports for our board meeting. Now he pulls them from Finova in 10 minutes. The board gets better information, faster.", author:"CEO, Manufacturing Company" },
    ],
  },
};

const RELATED_BY_CATEGORY: Record<string, string[]> = {
  accounting: ["bank-reconciliation-guide","5","9"],
  guides:     ["1","2","7"],
  business:   ["6","8"],
  product:    ["3","4","8"],
  fintech:    ["5","9"],
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
          <div style={{ fontSize:48, marginBottom:16 }}>ðŸ“„</div>
          <div style={{ fontSize:20, fontWeight:700, color:"white", marginBottom:12 }}>Article not found</div>
          <Link href="/blog" style={{ color:"#818cf8", textDecoration:"none", fontWeight:600, fontSize:14 }}>â† Back to Blog</Link>
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
            <span style={{ color:"rgba(255,255,255,.2)" }}>â€º</span>
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
            <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>ðŸ“… {post.date}</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>â± {post.readTime}</span>
            <button onClick={copyLink} style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {copied ? "âœ“ Copied!" : "ðŸ”— Share"}
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
                  <span style={{ color:post.color, fontWeight:800, flexShrink:0, marginTop:2 }}>âœ“</span>
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
              <div style={{ fontSize:13, color:post.color, fontWeight:700 }}>â€” {block.author}</div>
            </div>
          );
          return null;
        })}

        {/* CTA */}
        <div style={{ marginTop:48, padding:"36px 32px", borderRadius:20, background:"linear-gradient(135deg,rgba(79,70,229,.2),rgba(124,58,237,.1))", border:"1px solid rgba(99,102,241,.3)", textAlign:"center" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>TRY FINOVA FREE</div>
          <h3 style={{ fontSize:22, fontWeight:800, color:"white", fontFamily:"Lora,serif", margin:"0 0 10px" }}>Start using Finova today</h3>
          <p style={{ fontSize:14, color:"rgba(255,255,255,.45)", margin:"0 auto 22px", maxWidth:380 }}>14-day free trial. No credit card required. Full access to all features.</p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/signup" style={{ padding:"12px 28px", borderRadius:11, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", fontWeight:800, fontSize:13, textDecoration:"none" }}>
              Get Started â†’
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
