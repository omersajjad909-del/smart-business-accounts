// FILE LOCATION: app/help/[category]/[slug]/page.tsx
// Ya agar tumhara route app/help/[slug]/page.tsx hai toh wahan bhi kaam karega

import Link from "next/link";

/* ─────────────────────────────────────────
   ARTICLE DATABASE
   ───────────────────────────────────────── */
const ARTICLES: Record<string, {
  title: string;
  category: string;
  categorySlug: string;
  time: string;
  updatedAt: string;
  content: {
    type: "intro" | "step" | "tip" | "warning" | "code" | "heading" | "para" | "list";
    text?: string;
    items?: string[];
    step?: number;
  }[];
  related: { title: string; slug: string; category: string; categorySlug: string }[];
}> = {

  "create-account": {
    title: "How to create your FinovaOS account",
    category: "Getting Started", categorySlug: "getting-started",
    time: "3 min", updatedAt: "March 1, 2025",
    content: [
      { type:"intro", text:"Creating your FinovaOS account takes less than 2 minutes. Follow these steps to get started." },
      { type:"step", step:1, text:"Go to finovaos.app and click **Get Started Now** in the top navigation bar." },
      { type:"step", step:2, text:"Choose your plan — Starter, Professional, or Enterprise. You can always upgrade later." },
      { type:"step", step:3, text:"Fill in your details: first name, last name, work email, company name, and a secure password." },
      { type:"step", step:4, text:"Agree to the Privacy Policy and Terms of Service, then click **Continue to Confirmation**." },
      { type:"step", step:5, text:"Check your email for a verification link. Click it to activate your account." },
      { type:"tip", text:"Use a work email address. This makes it easier to invite team members later and keeps your account professional." },
      { type:"heading", text:"After signing up" },
      { type:"para", text:"Once your account is verified, you'll be taken to the onboarding wizard where you can set up your company profile, currency, and financial year." },
      { type:"warning", text:"If you don't receive the verification email within 5 minutes, check your spam folder. You can also request a resend from the login page." },
    ],
    related: [
      { title:"Choosing the right plan", slug:"choose-plan", category:"Getting Started", categorySlug:"getting-started" },
      { title:"Setting up your company profile", slug:"company-profile", category:"Getting Started", categorySlug:"getting-started" },
      { title:"Inviting team members", slug:"invite-team", category:"Getting Started", categorySlug:"getting-started" },
    ],
  },

  "choose-plan": {
    title: "Choosing the right plan for your business",
    category: "Getting Started", categorySlug: "getting-started",
    time: "4 min", updatedAt: "March 1, 2025",
    content: [
      { type:"intro", text:"FinovaOS offers three plans to suit businesses of all sizes. Here's how to pick the one that fits you best." },
      { type:"heading", text:"Starter Plan — Best for small businesses" },
      { type:"list", items:["Up to 1 company", "Invoicing & billing", "Ledger & trial balance", "Basic reports", "2 users included", "Email support"] },
      { type:"heading", text:"Professional Plan — Best for growing teams" },
      { type:"list", items:["Up to 3 companies", "Everything in Starter", "Bank reconciliation", "Advanced reports & analytics", "Role-based access control", "Up to 10 users", "Priority email support"] },
      { type:"heading", text:"Enterprise Plan — Best for large organizations" },
      { type:"list", items:["Unlimited companies & branches", "Everything in Professional", "Custom integrations & API", "Dedicated onboarding manager", "Unlimited users", "24/7 priority support", "SLA guarantee"] },
      { type:"tip", text:"Start with Starter and upgrade anytime — your data and settings carry over automatically. There's no lock-in." },
      { type:"warning", text:"If you need multi-branch support or more than 10 users, go directly to Enterprise. Starter and Pro do not support unlimited branches." },
    ],
    related: [
      { title:"How to create your FinovaOS account", slug:"create-account", category:"Getting Started", categorySlug:"getting-started" },
      { title:"Your first invoice — step by step", slug:"first-invoice", category:"Getting Started", categorySlug:"getting-started" },
    ],
  },

  "company-profile": {
    title: "Setting up your company profile",
    category: "Getting Started", categorySlug: "getting-started",
    time: "5 min", updatedAt: "February 20, 2025",
    content: [
      { type:"intro", text:"Your company profile is the foundation of everything in FinovaOS — it appears on invoices, reports, and all documents." },
      { type:"step", step:1, text:"Go to **Settings → Company Profile** from your dashboard sidebar." },
      { type:"step", step:2, text:"Enter your **Company Name** exactly as it should appear on invoices and legal documents." },
      { type:"step", step:3, text:"Upload your **company logo** (PNG or JPG, recommended 200×200px or larger)." },
      { type:"step", step:4, text:"Fill in your **registered address**, phone number, and email." },
      { type:"step", step:5, text:"Set your **base currency** and **financial year start month**." },
      { type:"step", step:6, text:"Add your **tax registration number** (NTN, VAT, GST, etc.) if applicable." },
      { type:"step", step:7, text:"Click **Save Changes**. Your profile is now applied to all new documents." },
      { type:"tip", text:"You can have multiple company profiles on the Professional and Enterprise plans. Switch between them from the top-left company selector." },
    ],
    related: [
      { title:"Your first invoice — step by step", slug:"first-invoice", category:"Getting Started", categorySlug:"getting-started" },
      { title:"Inviting team members", slug:"invite-team", category:"Getting Started", categorySlug:"getting-started" },
    ],
  },

  "invite-team": {
    title: "Inviting team members & setting roles",
    category: "Getting Started", categorySlug: "getting-started",
    time: "3 min", updatedAt: "February 15, 2025",
    content: [
      { type:"intro", text:"FinovaOS supports role-based access so each team member only sees what they need to." },
      { type:"step", step:1, text:"Go to **Settings → Team Members** in your dashboard." },
      { type:"step", step:2, text:"Click **Invite Member** and enter their email address." },
      { type:"step", step:3, text:"Select a role for the member:" },
      { type:"list", items:["**Admin** — Full access to all features and settings", "**Accountant** — Access to reports, ledgers, and financial data", "**Sales** — Can create invoices and manage customers only", "**Viewer** — Read-only access to reports"] },
      { type:"step", step:4, text:"Click **Send Invite**. They'll receive an email to join your workspace." },
      { type:"tip", text:"On the Professional plan you can invite up to 10 members. Enterprise has no limit." },
      { type:"warning", text:"Removing a team member does not delete their work. All entries they created remain in your books." },
    ],
    related: [
      { title:"Choosing the right plan", slug:"choose-plan", category:"Getting Started", categorySlug:"getting-started" },
      { title:"Setting up your company profile", slug:"company-profile", category:"Getting Started", categorySlug:"getting-started" },
    ],
  },

  "connect-bank": {
    title: "Connecting your bank account",
    category: "Getting Started", categorySlug: "getting-started",
    time: "6 min", updatedAt: "March 5, 2025",
    content: [
      { type:"intro", text:"Connecting your bank account lets FinovaOS import transactions automatically for faster reconciliation." },
      { type:"step", step:1, text:"Go to **Banking → Bank Accounts** in your dashboard." },
      { type:"step", step:2, text:"Click **Add Bank Account**." },
      { type:"step", step:3, text:"Choose your bank from the list. Supported banks include HBL, UBL, MCB, Meezan, Standard Chartered, and 50+ others worldwide." },
      { type:"step", step:4, text:"Enter your account details: account title, account number, and opening balance." },
      { type:"step", step:5, text:"To import transactions, go to **Bank Reconciliation → Import Statement** and upload your bank's CSV/Excel export." },
      { type:"tip", text:"Most banks let you export statements as CSV from their internet banking portal. Check your bank's online portal under 'Account Statements' or 'Download Transactions'." },
      { type:"warning", text:"FinovaOS does not store your internet banking credentials. Statements are imported as files — there is no direct bank sync for security reasons." },
    ],
    related: [
      { title:"How bank reconciliation works", slug:"bank-reconciliation", category:"Banking & Reconciliation", categorySlug:"banking" },
      { title:"Importing bank statements", slug:"import-statements", category:"Banking & Reconciliation", categorySlug:"banking" },
    ],
  },

  "first-invoice": {
    title: "Your first invoice — step by step",
    category: "Getting Started", categorySlug: "getting-started",
    time: "4 min", updatedAt: "March 1, 2025",
    content: [
      { type:"intro", text:"Creating your first invoice in FinovaOS takes under 2 minutes. Here's exactly how to do it." },
      { type:"step", step:1, text:"From your dashboard, click **Sales → New Invoice** or press the **+** button in the top bar." },
      { type:"step", step:2, text:"Select or create a **customer**. Type their name and FinovaOS will search your existing customers. If new, click 'Add Customer'." },
      { type:"step", step:3, text:"Set the **invoice date** and **due date**." },
      { type:"step", step:4, text:"Add **line items** — product or service name, quantity, unit price, and tax rate." },
      { type:"step", step:5, text:"Add any **notes or payment terms** at the bottom (e.g., 'Payment due within 30 days')." },
      { type:"step", step:6, text:"Click **Save & Preview** to see how it looks, then **Send Invoice** to email it directly to your customer." },
      { type:"tip", text:"You can save invoices as drafts and come back to them later. They won't post to your ledger until you mark them as sent." },
    ],
    related: [
      { title:"Creating a sales invoice", slug:"create-invoice", category:"Invoicing & Billing", categorySlug:"invoicing" },
      { title:"Recording payments & receipts", slug:"record-payment", category:"Invoicing & Billing", categorySlug:"invoicing" },
    ],
  },

  "create-invoice": {
    title: "Creating a sales invoice",
    category: "Invoicing & Billing", categorySlug: "invoicing",
    time: "3 min", updatedAt: "March 1, 2025",
    content: [
      { type:"intro", text:"FinovaOS makes invoice creation fast and professional. Here's the full walkthrough." },
      { type:"step", step:1, text:"Navigate to **Sales → Invoices → New Invoice**." },
      { type:"step", step:2, text:"Select your customer. If they don't exist yet, click **+ Add New Customer**." },
      { type:"step", step:3, text:"Choose the **invoice currency**. By default it uses your company's base currency." },
      { type:"step", step:4, text:"Add products or services as **line items**. Each line has: Item name, Description (optional), Qty, Unit Price, Tax %, Discount %." },
      { type:"step", step:5, text:"Set **payment terms** (due date or net days). These appear on the printed invoice." },
      { type:"step", step:6, text:"Add **internal notes** (not visible to customer) or **customer notes** (printed on invoice)." },
      { type:"step", step:7, text:"Click **Save as Draft** or **Finalize & Send**." },
      { type:"tip", text:"Enable **recurring invoices** on this screen to automatically regenerate this invoice monthly, quarterly, or on any schedule." },
      { type:"warning", text:"Once an invoice is finalized and sent, you cannot edit the amounts. You'll need to create a credit note to make corrections." },
    ],
    related: [
      { title:"Setting up recurring invoices", slug:"recurring-invoices", category:"Invoicing & Billing", categorySlug:"invoicing" },
      { title:"Credit notes and refunds", slug:"credit-notes", category:"Invoicing & Billing", categorySlug:"invoicing" },
      { title:"Recording payments & receipts", slug:"record-payment", category:"Invoicing & Billing", categorySlug:"invoicing" },
    ],
  },

  "record-payment": {
    title: "Recording payments & receipts",
    category: "Invoicing & Billing", categorySlug: "invoicing",
    time: "3 min", updatedAt: "February 28, 2025",
    content: [
      { type:"intro", text:"When a customer pays an invoice, you need to record it in FinovaOS to update your books and clear the receivable." },
      { type:"step", step:1, text:"Go to **Sales → Invoices** and open the invoice you received payment for." },
      { type:"step", step:2, text:"Click the **Record Payment** button (green button at the top right)." },
      { type:"step", step:3, text:"Enter the **payment date**, **amount received**, and **payment method** (bank transfer, cash, cheque, etc.)." },
      { type:"step", step:4, text:"Select the **bank account** or cash account the payment was deposited into." },
      { type:"step", step:5, text:"Add a **reference number** (e.g., bank transfer reference) if applicable." },
      { type:"step", step:6, text:"Click **Save Payment**. The invoice will be marked as Paid (or Partial if underpaid)." },
      { type:"tip", text:"You can record partial payments. FinovaOS will track the remaining balance and show the invoice as 'Partially Paid'." },
    ],
    related: [
      { title:"Creating a sales invoice", slug:"create-invoice", category:"Invoicing & Billing", categorySlug:"invoicing" },
      { title:"Bank reconciliation", slug:"bank-reconciliation", category:"Banking & Reconciliation", categorySlug:"banking" },
    ],
  },

  "bank-reconciliation": {
    title: "How bank reconciliation works",
    category: "Banking & Reconciliation", categorySlug: "banking",
    time: "6 min", updatedAt: "March 3, 2025",
    content: [
      { type:"intro", text:"Bank reconciliation matches your FinovaOS records against your actual bank statement to ensure they agree. It catches errors, missing entries, and fraud." },
      { type:"heading", text:"Why reconcile?" },
      { type:"list", items:["Catches duplicate or missing transactions", "Ensures your cash balance is accurate", "Required for clean year-end accounts", "Helps detect unauthorised payments"] },
      { type:"heading", text:"Steps to reconcile" },
      { type:"step", step:1, text:"Go to **Banking → Bank Reconciliation**." },
      { type:"step", step:2, text:"Select the **bank account** you want to reconcile." },
      { type:"step", step:3, text:"Enter the **closing balance** from your bank statement and the **statement date**." },
      { type:"step", step:4, text:"FinovaOS will show you unmatched transactions on both sides. **Tick** each transaction that appears in both your books and your statement." },
      { type:"step", step:5, text:"If a transaction is in your statement but not in FinovaOS, click **Add Transaction** to create it." },
      { type:"step", step:6, text:"Once the **difference shows zero**, click **Complete Reconciliation**." },
      { type:"tip", text:"Reconcile monthly at minimum. Weekly reconciliation is even better for active businesses — it takes just a few minutes once you're in the habit." },
      { type:"warning", text:"Do not skip months. Each reconciliation builds on the last. Catching up on 6 months at once is significantly harder than doing them monthly." },
    ],
    related: [
      { title:"Importing bank statements (CSV/Excel)", slug:"import-statements", category:"Banking & Reconciliation", categorySlug:"banking" },
      { title:"Handling unmatched transactions", slug:"unmatched-transactions", category:"Banking & Reconciliation", categorySlug:"banking" },
    ],
  },

  "import-statements": {
    title: "Importing bank statements (CSV/Excel)",
    category: "Banking & Reconciliation", categorySlug: "banking",
    time: "4 min", updatedAt: "February 25, 2025",
    content: [
      { type:"intro", text:"FinovaOS can import your bank statements from CSV or Excel files exported from your bank's internet banking portal." },
      { type:"step", step:1, text:"Log in to your bank's internet banking portal and download your statement as **CSV** or **Excel (.xlsx)**." },
      { type:"step", step:2, text:"In FinovaOS, go to **Banking → Bank Reconciliation → Import Statement**." },
      { type:"step", step:3, text:"Select your **bank account** from the dropdown." },
      { type:"step", step:4, text:"Click **Choose File** and upload your downloaded statement." },
      { type:"step", step:5, text:"FinovaOS will show a **column mapping screen**. Match the columns: Date, Description, Debit, Credit, Balance." },
      { type:"step", step:6, text:"Click **Import**. FinovaOS will load the transactions for reconciliation." },
      { type:"tip", text:"Most major banks export in a compatible format. If your bank's format doesn't match, contact support and we'll add a custom mapping." },
      { type:"warning", text:"Make sure there are no blank rows or merged cells in your Excel file before importing. These can cause import errors." },
    ],
    related: [
      { title:"How bank reconciliation works", slug:"bank-reconciliation", category:"Banking & Reconciliation", categorySlug:"banking" },
      { title:"Connecting your bank account", slug:"connect-bank", category:"Getting Started", categorySlug:"getting-started" },
    ],
  },

  "pl-statement": {
    title: "Understanding your P&L statement",
    category: "Reports & Analytics", categorySlug: "reports",
    time: "5 min", updatedAt: "March 2, 2025",
    content: [
      { type:"intro", text:"The Profit & Loss (P&L) statement — also called an Income Statement — shows how much money your business made or lost over a period." },
      { type:"heading", text:"Key sections of your P&L" },
      { type:"list", items:["**Revenue** — Total sales income from all invoices in the period", "**Cost of Goods Sold (COGS)** — Direct costs of producing what you sold", "**Gross Profit** — Revenue minus COGS", "**Operating Expenses** — Rent, salaries, utilities, and other overheads", "**Net Profit / Loss** — What's left after all expenses"] },
      { type:"heading", text:"How to generate your P&L in FinovaOS" },
      { type:"step", step:1, text:"Go to **Reports → Profit & Loss**." },
      { type:"step", step:2, text:"Select the **date range** (monthly, quarterly, yearly, or custom)." },
      { type:"step", step:3, text:"Choose whether to compare against a **previous period** for trend analysis." },
      { type:"step", step:4, text:"Click **Generate Report**. You can then **export to PDF or Excel**." },
      { type:"tip", text:"Review your P&L at least monthly. A healthy business tracks gross margin trends — if your gross profit % is falling, your pricing or costs need attention." },
    ],
    related: [
      { title:"Balance sheet explained", slug:"balance-sheet", category:"Reports & Analytics", categorySlug:"reports" },
      { title:"Cash flow report walkthrough", slug:"cash-flow", category:"Reports & Analytics", categorySlug:"reports" },
      { title:"Exporting reports to PDF & Excel", slug:"export-reports", category:"Reports & Analytics", categorySlug:"reports" },
    ],
  },

  "export-reports": {
    title: "Exporting reports to PDF & Excel",
    category: "Reports & Analytics", categorySlug: "reports",
    time: "2 min", updatedAt: "February 10, 2025",
    content: [
      { type:"intro", text:"Every report in FinovaOS can be exported to PDF or Excel with one click." },
      { type:"step", step:1, text:"Open any report from the **Reports** menu (P&L, Balance Sheet, Cash Flow, Tax Summary, etc.)." },
      { type:"step", step:2, text:"Configure the report — date range, comparisons, filters." },
      { type:"step", step:3, text:"Click the **Export** button at the top right of the report." },
      { type:"step", step:4, text:"Choose **PDF** for sharing/printing or **Excel** for further analysis." },
      { type:"step", step:5, text:"The file downloads immediately to your device." },
      { type:"tip", text:"PDF exports include your company logo and branding. Excel exports include all raw data with separate tabs for each section of the report." },
    ],
    related: [
      { title:"Understanding your P&L statement", slug:"pl-statement", category:"Reports & Analytics", categorySlug:"reports" },
      { title:"Tax summary and filing reports", slug:"tax-summary", category:"Reports & Analytics", categorySlug:"reports" },
    ],
  },

  "add-products": {
    title: "Adding products and services",
    category: "Inventory & Stock", categorySlug: "inventory",
    time: "3 min", updatedAt: "February 18, 2025",
    content: [
      { type:"intro", text:"Products and services are the items you sell. Adding them to FinovaOS means you can add them to invoices with one click." },
      { type:"step", step:1, text:"Go to **Inventory → Products & Services → Add New**." },
      { type:"step", step:2, text:"Choose the type: **Product** (physical goods tracked in stock) or **Service** (no stock tracking)." },
      { type:"step", step:3, text:"Enter the **item name**, **SKU code** (optional), and **description**." },
      { type:"step", step:4, text:"Set the **unit price** and **tax rate** (e.g., 17% GST, 5% SST)." },
      { type:"step", step:5, text:"For products, enter the **opening stock quantity** and **reorder level** (alert when stock falls below this)." },
      { type:"step", step:6, text:"Click **Save Product**." },
      { type:"tip", text:"You can import products in bulk using an Excel template. Go to **Inventory → Import Products** and download the template." },
    ],
    related: [
      { title:"Setting stock alert levels", slug:"stock-alerts", category:"Inventory & Stock", categorySlug:"inventory" },
      { title:"Stock in / stock out entries", slug:"stock-entries", category:"Inventory & Stock", categorySlug:"inventory" },
    ],
  },

  "upgrade-plan": {
    title: "Upgrading or downgrading your plan",
    category: "Account & Billing", categorySlug: "account",
    time: "3 min", updatedAt: "March 1, 2025",
    content: [
      { type:"intro", text:"You can change your FinovaOS plan at any time. Upgrades take effect immediately; downgrades take effect at the end of your billing cycle." },
      { type:"step", step:1, text:"Go to **Settings → Subscription & Billing**." },
      { type:"step", step:2, text:"Click **Change Plan**." },
      { type:"step", step:3, text:"Select the new plan you want." },
      { type:"step", step:4, text:"For **upgrades**: you'll be charged a prorated amount for the remainder of your billing period. Click **Confirm Upgrade**." },
      { type:"step", step:5, text:"For **downgrades**: your current plan continues until the billing period ends, then switches. Click **Confirm Downgrade**." },
      { type:"tip", text:"Upgrading never loses your data. All your invoices, reports, and settings carry over automatically." },
      { type:"warning", text:"Downgrading may disable features you currently use. Your data is preserved but the features become unavailable until you upgrade again." },
    ],
    related: [
      { title:"Updating payment method", slug:"update-payment", category:"Account & Billing", categorySlug:"account" },
      { title:"Cancelling your subscription", slug:"cancel-subscription", category:"Account & Billing", categorySlug:"account" },
    ],
  },

  /* ══ INVOICING ══ */
  "recurring-invoices": {
    title: "Setting up recurring invoices",
    category: "Invoicing & Billing", categorySlug: "invoicing",
    time: "4 min", updatedAt: "March 5, 2025",
    content: [
      { type:"intro", text:"Recurring invoices let FinovaOS automatically generate and send invoices on a set schedule — saving you hours every month." },
      { type:"heading", text:"When to use recurring invoices" },
      { type:"list", items:["Monthly retainer clients", "Subscription-based services", "Regular maintenance contracts", "Rent or lease billing"] },
      { type:"heading", text:"How to set up a recurring invoice" },
      { type:"step", step:1, text:"Go to **Sales → Invoices → New Invoice** and fill in all the invoice details as normal." },
      { type:"step", step:2, text:"At the bottom of the form, toggle on **Make this a recurring invoice**." },
      { type:"step", step:3, text:"Set the **frequency**: Weekly, Monthly, Quarterly, or Custom (e.g., every 45 days)." },
      { type:"step", step:4, text:"Set the **start date** and optionally an **end date** (or leave open-ended)." },
      { type:"step", step:5, text:"Choose **Auto-send** to email the invoice automatically, or **Create draft** to review before sending." },
      { type:"step", step:6, text:"Click **Save Recurring Invoice**. FinovaOS will handle the rest." },
      { type:"tip", text:"You can pause, edit, or cancel any recurring invoice at any time from **Sales → Recurring Invoices** without affecting invoices already sent." },
      { type:"warning", text:"If a recurring invoice fails to send (e.g., customer email bounces), FinovaOS will notify you via dashboard alert. Always keep customer email addresses up to date." },
    ],
    related: [
      { title:"Creating a sales invoice", slug:"create-invoice", category:"Invoicing & Billing", categorySlug:"invoicing" },
      { title:"Recording payments & receipts", slug:"record-payment", category:"Invoicing & Billing", categorySlug:"invoicing" },
      { title:"Credit notes and refunds", slug:"credit-notes", category:"Invoicing & Billing", categorySlug:"invoicing" },
    ],
  },

  "send-invoice": {
    title: "Sending invoices via email or WhatsApp",
    category: "Invoicing & Billing", categorySlug: "invoicing",
    time: "2 min", updatedAt: "February 22, 2025",
    content: [
      { type:"intro", text:"FinovaOS lets you send invoices directly to customers via email or WhatsApp — no downloading or attaching files needed." },
      { type:"heading", text:"Send via Email" },
      { type:"step", step:1, text:"Open any finalized invoice from **Sales → Invoices**." },
      { type:"step", step:2, text:"Click **Send Invoice** → **Email**." },
      { type:"step", step:3, text:"FinovaOS pre-fills the customer's email. You can edit the subject line and message body." },
      { type:"step", step:4, text:"Click **Send**. The customer receives a branded email with a PDF attachment and an online view link." },
      { type:"heading", text:"Send via WhatsApp" },
      { type:"step", step:1, text:"Open the invoice and click **Send Invoice** → **WhatsApp**." },
      { type:"step", step:2, text:"FinovaOS generates a WhatsApp link with a pre-filled message and invoice PDF link." },
      { type:"step", step:3, text:"Click **Open WhatsApp** — it opens on your phone or WhatsApp Web with the message ready to send." },
      { type:"tip", text:"Customize your email template from **Settings → Invoice Email Template** to include your brand tone, logo, and payment instructions." },
      { type:"warning", text:"WhatsApp sharing requires your device to have WhatsApp installed or WhatsApp Web active in your browser." },
    ],
    related: [
      { title:"Creating a sales invoice", slug:"create-invoice", category:"Invoicing & Billing", categorySlug:"invoicing" },
      { title:"Recording payments & receipts", slug:"record-payment", category:"Invoicing & Billing", categorySlug:"invoicing" },
    ],
  },

  "quotation-invoice": {
    title: "Creating quotations and converting to invoice",
    category: "Invoicing & Billing", categorySlug: "invoicing",
    time: "4 min", updatedAt: "March 2, 2025",
    content: [
      { type:"intro", text:"Quotations (also called estimates or proforma invoices) let you send a price proposal to a customer before they confirm the order." },
      { type:"heading", text:"Creating a quotation" },
      { type:"step", step:1, text:"Go to **Sales → Quotations → New Quotation**." },
      { type:"step", step:2, text:"Select the customer and add line items exactly as you would for an invoice." },
      { type:"step", step:3, text:"Set an **expiry date** (e.g., valid for 30 days)." },
      { type:"step", step:4, text:"Add any **terms and conditions** or notes." },
      { type:"step", step:5, text:"Click **Save & Send** to email the quotation to the customer." },
      { type:"heading", text:"Converting to invoice" },
      { type:"step", step:1, text:"When the customer accepts, open the quotation from **Sales → Quotations**." },
      { type:"step", step:2, text:"Click **Convert to Invoice**. All line items, prices, and customer details copy over automatically." },
      { type:"step", step:3, text:"Review the invoice, set the invoice date and due date, then **Finalize & Send**." },
      { type:"tip", text:"The original quotation is automatically marked as 'Converted' once you create the invoice. You can still view it for reference." },
    ],
    related: [
      { title:"Creating a sales invoice", slug:"create-invoice", category:"Invoicing & Billing", categorySlug:"invoicing" },
      { title:"Sending invoices via email or WhatsApp", slug:"send-invoice", category:"Invoicing & Billing", categorySlug:"invoicing" },
    ],
  },

  "credit-notes": {
    title: "Credit notes and refunds",
    category: "Invoicing & Billing", categorySlug: "invoicing",
    time: "3 min", updatedAt: "February 28, 2025",
    content: [
      { type:"intro", text:"A credit note is issued to correct or cancel a finalized invoice — for example, if a customer returned goods or was overcharged." },
      { type:"heading", text:"When to issue a credit note" },
      { type:"list", items:["Customer returned goods", "Invoice had wrong pricing", "Service was cancelled after invoicing", "Discount applied after the fact"] },
      { type:"heading", text:"How to create a credit note" },
      { type:"step", step:1, text:"Go to **Sales → Invoices** and open the invoice you need to correct." },
      { type:"step", step:2, text:"Click **Issue Credit Note** at the top right." },
      { type:"step", step:3, text:"FinovaOS pre-fills the credit note with the original invoice items. Adjust the quantities or amounts as needed." },
      { type:"step", step:4, text:"Add a **reason** for the credit note (e.g., 'Goods returned — damaged')." },
      { type:"step", step:5, text:"Click **Save & Send** to email the credit note to the customer." },
      { type:"heading", text:"Applying a credit note" },
      { type:"para", text:"You can apply the credit note against a future invoice or mark it as refunded if you return the cash to the customer. Both options are available in the credit note view." },
      { type:"warning", text:"Credit notes do not automatically refund money — they are accounting entries. You must separately process the cash refund through your bank if needed." },
    ],
    related: [
      { title:"Creating a sales invoice", slug:"create-invoice", category:"Invoicing & Billing", categorySlug:"invoicing" },
      { title:"Recording payments & receipts", slug:"record-payment", category:"Invoicing & Billing", categorySlug:"invoicing" },
    ],
  },

  /* ══ BANKING ══ */
  "match-transactions": {
    title: "Matching transactions automatically",
    category: "Banking & Reconciliation", categorySlug: "banking",
    time: "3 min", updatedAt: "March 4, 2025",
    content: [
      { type:"intro", text:"FinovaOS's auto-match engine compares your imported bank transactions against your recorded entries and suggests matches — reducing manual work by up to 80%." },
      { type:"heading", text:"How auto-matching works" },
      { type:"para", text:"When you import a bank statement, FinovaOS compares each transaction's amount, date, and description against your unmatched invoices, payments, and expenses. Matches with high confidence are suggested automatically." },
      { type:"heading", text:"Reviewing and confirming matches" },
      { type:"step", step:1, text:"Go to **Banking → Bank Reconciliation** and select your bank account." },
      { type:"step", step:2, text:"Click **Auto-Match**. FinovaOS will process the statement and highlight suggested matches in green." },
      { type:"step", step:3, text:"Review each suggestion — confirm matches that are correct by clicking **✓ Accept**." },
      { type:"step", step:4, text:"For incorrect suggestions, click **✗ Reject** and match manually." },
      { type:"step", step:5, text:"For unmatched bank transactions, click **Create Entry** to record them directly." },
      { type:"tip", text:"The more you use FinovaOS and the more consistent your descriptions are, the better auto-matching becomes over time." },
      { type:"warning", text:"Always review auto-matches before accepting. FinovaOS may suggest a match based on amount alone — verify the dates and descriptions also make sense." },
    ],
    related: [
      { title:"How bank reconciliation works", slug:"bank-reconciliation", category:"Banking & Reconciliation", categorySlug:"banking" },
      { title:"Handling unmatched transactions", slug:"unmatched-transactions", category:"Banking & Reconciliation", categorySlug:"banking" },
    ],
  },

  "unmatched-transactions": {
    title: "Handling unmatched transactions",
    category: "Banking & Reconciliation", categorySlug: "banking",
    time: "4 min", updatedAt: "March 3, 2025",
    content: [
      { type:"intro", text:"Unmatched transactions are bank entries that don't correspond to any record in FinovaOS. Clearing them is essential to complete your reconciliation." },
      { type:"heading", text:"Common reasons for unmatched transactions" },
      { type:"list", items:["Bank charges and fees not yet recorded", "Direct bank transfers not entered in FinovaOS", "Salary payments processed outside payroll", "Bounced cheque reversals", "Interest income or penalties"] },
      { type:"heading", text:"How to clear unmatched transactions" },
      { type:"step", step:1, text:"In the reconciliation screen, find the unmatched bank transaction." },
      { type:"step", step:2, text:"Click **Create Entry**." },
      { type:"step", step:3, text:"Select the **account** to post to (e.g., Bank Charges, Miscellaneous Income)." },
      { type:"step", step:4, text:"Add a **description** and verify the date and amount." },
      { type:"step", step:5, text:"Click **Save**. The transaction is now matched and your reconciliation difference reduces." },
      { type:"tip", text:"Set up a 'Suspense Account' for transactions you can't immediately identify. Review it monthly and move entries to the correct accounts once clarified." },
      { type:"warning", text:"Never just delete unmatched transactions. Always record them to the correct account — even if it's a minor bank fee — to keep your books accurate." },
    ],
    related: [
      { title:"How bank reconciliation works", slug:"bank-reconciliation", category:"Banking & Reconciliation", categorySlug:"banking" },
      { title:"Matching transactions automatically", slug:"match-transactions", category:"Banking & Reconciliation", categorySlug:"banking" },
    ],
  },

  "multiple-accounts": {
    title: "Setting up multiple bank accounts",
    category: "Banking & Reconciliation", categorySlug: "banking",
    time: "3 min", updatedAt: "February 20, 2025",
    content: [
      { type:"intro", text:"FinovaOS supports unlimited bank accounts — you can track current accounts, savings accounts, petty cash, and foreign currency accounts all in one place." },
      { type:"step", step:1, text:"Go to **Banking → Bank Accounts → Add Account**." },
      { type:"step", step:2, text:"Enter the **account name** (e.g., 'HBL Current Account', 'MCB USD Account')." },
      { type:"step", step:3, text:"Select the **account type**: Current, Savings, Cash, or Credit Card." },
      { type:"step", step:4, text:"Set the **currency** for this account (useful for foreign currency accounts)." },
      { type:"step", step:5, text:"Enter the **opening balance** as of your FinovaOS start date." },
      { type:"step", step:6, text:"Click **Save Account**. It now appears in your banking dashboard and reconciliation list." },
      { type:"tip", text:"Give each account a clear, descriptive name including the bank name. This prevents confusion when recording payments — especially if you have accounts at multiple banks." },
      { type:"heading", text:"Switching between accounts" },
      { type:"para", text:"All bank accounts appear in the dropdown when recording payments, creating vouchers, or doing reconciliation. Simply select the relevant account for each transaction." },
    ],
    related: [
      { title:"Connecting your bank account", slug:"connect-bank", category:"Getting Started", categorySlug:"getting-started" },
      { title:"How bank reconciliation works", slug:"bank-reconciliation", category:"Banking & Reconciliation", categorySlug:"banking" },
    ],
  },

  "cpv": {
    title: "Cash payment vouchers (CPV)",
    category: "Banking & Reconciliation", categorySlug: "banking",
    time: "3 min", updatedAt: "February 15, 2025",
    content: [
      { type:"intro", text:"A Cash Payment Voucher (CPV) records money going out of your cash or bank account — for expenses, supplier payments, salaries, or any other outflow." },
      { type:"heading", text:"Creating a CPV" },
      { type:"step", step:1, text:"Go to **Banking → Payment Vouchers → New CPV**." },
      { type:"step", step:2, text:"Select the **payment account** (cash box or bank account the payment is made from)." },
      { type:"step", step:3, text:"Enter the **payee name** — supplier, employee, or vendor." },
      { type:"step", step:4, text:"Set the **payment date** and **amount**." },
      { type:"step", step:5, text:"Select the **expense account** to debit (e.g., Office Supplies, Salaries, Rent)." },
      { type:"step", step:6, text:"Add a **narration** describing the payment purpose." },
      { type:"step", step:7, text:"Click **Save Voucher**. The entry is posted to your ledger and reduces your cash/bank balance." },
      { type:"tip", text:"You can print CPVs as formal payment voucher documents for record-keeping and audit purposes. Click **Print Voucher** after saving." },
      { type:"warning", text:"CPVs are immediately posted to the ledger when saved. If you made an error, you must create a correction entry — you cannot delete a posted voucher." },
    ],
    related: [
      { title:"Setting up multiple bank accounts", slug:"multiple-accounts", category:"Banking & Reconciliation", categorySlug:"banking" },
      { title:"How bank reconciliation works", slug:"bank-reconciliation", category:"Banking & Reconciliation", categorySlug:"banking" },
    ],
  },

  /* ══ REPORTS ══ */
  "balance-sheet": {
    title: "Balance sheet explained",
    category: "Reports & Analytics", categorySlug: "reports",
    time: "6 min", updatedAt: "March 1, 2025",
    content: [
      { type:"intro", text:"The balance sheet shows what your business owns (assets), what it owes (liabilities), and the owner's stake (equity) at a single point in time." },
      { type:"heading", text:"The accounting equation" },
      { type:"para", text:"Every balance sheet follows: **Assets = Liabilities + Equity**. If your balance sheet doesn't balance, there's an error somewhere in your books." },
      { type:"heading", text:"Key sections explained" },
      { type:"list", items:[
        "**Current Assets** — Cash, receivables, inventory (convertible to cash within 1 year)",
        "**Fixed Assets** — Equipment, vehicles, property (long-term assets)",
        "**Current Liabilities** — Payables, short-term loans (due within 1 year)",
        "**Long-term Liabilities** — Bank loans, mortgages (due beyond 1 year)",
        "**Owner's Equity** — Capital invested + retained profits",
      ]},
      { type:"heading", text:"Generating your balance sheet in FinovaOS" },
      { type:"step", step:1, text:"Go to **Reports → Balance Sheet**." },
      { type:"step", step:2, text:"Select the **date** — the balance sheet is always as of a specific date, not a period." },
      { type:"step", step:3, text:"Optionally compare with a **prior period** (e.g., last year same date)." },
      { type:"step", step:4, text:"Click **Generate**. Export to PDF or Excel using the button at top right." },
      { type:"tip", text:"Review your balance sheet at year end and share it with your accountant or bank. Lenders often require this document for loan applications." },
      { type:"warning", text:"If Assets ≠ Liabilities + Equity in your report, contact support immediately — it indicates a data entry error that needs to be traced and corrected." },
    ],
    related: [
      { title:"Understanding your P&L statement", slug:"pl-statement", category:"Reports & Analytics", categorySlug:"reports" },
      { title:"Cash flow report walkthrough", slug:"cash-flow", category:"Reports & Analytics", categorySlug:"reports" },
    ],
  },

  "cash-flow": {
    title: "Cash flow report walkthrough",
    category: "Reports & Analytics", categorySlug: "reports",
    time: "4 min", updatedAt: "March 2, 2025",
    content: [
      { type:"intro", text:"The cash flow statement shows how cash actually moved in and out of your business — separate from profits. A profitable business can still run out of cash without this view." },
      { type:"heading", text:"Three sections of cash flow" },
      { type:"list", items:[
        "**Operating Activities** — Cash from day-to-day business (invoices collected, expenses paid)",
        "**Investing Activities** — Cash spent on or received from assets (equipment purchase, asset sales)",
        "**Financing Activities** — Cash from loans, repayments, or owner withdrawals",
      ]},
      { type:"heading", text:"Generating the cash flow report" },
      { type:"step", step:1, text:"Go to **Reports → Cash Flow Statement**." },
      { type:"step", step:2, text:"Select your **date range** (monthly or custom period)." },
      { type:"step", step:3, text:"Choose **Indirect Method** (most common) or **Direct Method** if your accountant requires it." },
      { type:"step", step:4, text:"Click **Generate**. Review each section and drill down by clicking any line item." },
      { type:"tip", text:"Watch your **Net Change in Cash** line every month. If it's consistently negative while you're profitable, you likely have a receivables collection problem — customers are paying too slowly." },
      { type:"warning", text:"Cash flow and profit are different. You can be profitable but cash-poor if customers don't pay on time. Chase overdue invoices regularly." },
    ],
    related: [
      { title:"Understanding your P&L statement", slug:"pl-statement", category:"Reports & Analytics", categorySlug:"reports" },
      { title:"Balance sheet explained", slug:"balance-sheet", category:"Reports & Analytics", categorySlug:"reports" },
      { title:"Exporting reports to PDF & Excel", slug:"export-reports", category:"Reports & Analytics", categorySlug:"reports" },
    ],
  },

  "tax-summary": {
    title: "Tax summary and filing reports",
    category: "Reports & Analytics", categorySlug: "reports",
    time: "5 min", updatedAt: "March 5, 2025",
    content: [
      { type:"intro", text:"FinovaOS's tax summary report consolidates all your taxable transactions in one place — making it easy to file GST, sales tax, or income tax returns." },
      { type:"heading", text:"What the tax summary includes" },
      { type:"list", items:[
        "Total taxable sales by tax rate",
        "Total tax collected from customers",
        "Total input tax paid to suppliers",
        "Net tax payable or refundable",
        "Breakdown by tax type (GST, Sales Tax, Withholding Tax)",
      ]},
      { type:"heading", text:"Generating the tax summary" },
      { type:"step", step:1, text:"Go to **Reports → Tax Summary**." },
      { type:"step", step:2, text:"Select the **tax period** (monthly, quarterly, or custom)." },
      { type:"step", step:3, text:"Filter by **tax type** if needed (e.g., only GST, or only withholding tax)." },
      { type:"step", step:4, text:"Review the figures and click **Export to PDF** to save for filing." },
      { type:"heading", text:"Filing your return" },
      { type:"para", text:"Use the exported tax summary as a reference when logging into your country's tax portal. The figures in FinovaOS match what you need to enter." },
      { type:"tip", text:"Set up tax rates correctly in **Settings → Tax Rates** before creating invoices. This ensures every invoice automatically applies the right tax and appears correctly in the summary." },
      { type:"warning", text:"FinovaOS generates reports based on the data you enter. If invoices are missing or tax rates were set up incorrectly, the tax summary will be wrong. Review your setup with an accountant before your first filing." },
    ],
    related: [
      { title:"Understanding your P&L statement", slug:"pl-statement", category:"Reports & Analytics", categorySlug:"reports" },
      { title:"Exporting reports to PDF & Excel", slug:"export-reports", category:"Reports & Analytics", categorySlug:"reports" },
    ],
  },

  "scheduled-reports": {
    title: "Scheduling automated report emails",
    category: "Reports & Analytics", categorySlug: "reports",
    time: "3 min", updatedAt: "February 18, 2025",
    content: [
      { type:"intro", text:"FinovaOS can automatically generate and email reports on a schedule — so you and your team always have up-to-date financials without manual effort." },
      { type:"step", step:1, text:"Go to **Reports → Scheduled Reports → New Schedule**." },
      { type:"step", step:2, text:"Select the **report type** (P&L, Balance Sheet, Cash Flow, Tax Summary, etc.)." },
      { type:"step", step:3, text:"Set the **frequency**: Daily, Weekly, Monthly, or Quarterly." },
      { type:"step", step:4, text:"Choose the **delivery time** (e.g., 8:00 AM on the 1st of each month)." },
      { type:"step", step:5, text:"Enter the **recipient email addresses** — you can send to multiple people." },
      { type:"step", step:6, text:"Choose the **format**: PDF, Excel, or both." },
      { type:"step", step:7, text:"Click **Save Schedule**. FinovaOS will send the report automatically going forward." },
      { type:"tip", text:"Set up a monthly P&L report to your email so you always review business performance at the start of each month — even when you're busy." },
    ],
    related: [
      { title:"Exporting reports to PDF & Excel", slug:"export-reports", category:"Reports & Analytics", categorySlug:"reports" },
      { title:"Understanding your P&L statement", slug:"pl-statement", category:"Reports & Analytics", categorySlug:"reports" },
    ],
  },

  /* ══ INVENTORY ══ */
  "stock-alerts": {
    title: "Setting stock alert levels",
    category: "Inventory & Stock", categorySlug: "inventory",
    time: "2 min", updatedAt: "February 20, 2025",
    content: [
      { type:"intro", text:"Stock alerts notify you when a product falls below its reorder level — preventing stockouts before they happen." },
      { type:"step", step:1, text:"Go to **Inventory → Products** and open any product." },
      { type:"step", step:2, text:"Find the **Reorder Level** field and enter the minimum quantity you want to keep in stock." },
      { type:"step", step:3, text:"Optionally set a **Reorder Quantity** — how much to order when restocking." },
      { type:"step", step:4, text:"Click **Save**." },
      { type:"heading", text:"Viewing stock alerts" },
      { type:"para", text:"When any product falls at or below its reorder level, it appears in the **Inventory → Low Stock Alerts** dashboard. You'll also see a notification badge in the main menu." },
      { type:"tip", text:"Set reorder levels based on your lead time. If your supplier takes 7 days to deliver and you sell 10 units per day, set your reorder level to at least 70 units." },
      { type:"warning", text:"Reorder levels only work if your stock quantities are kept accurate. Make sure all sales invoices and stock-in entries are recorded promptly." },
    ],
    related: [
      { title:"Adding products and services", slug:"add-products", category:"Inventory & Stock", categorySlug:"inventory" },
      { title:"Stock in / stock out entries", slug:"stock-entries", category:"Inventory & Stock", categorySlug:"inventory" },
    ],
  },

  "stock-entries": {
    title: "Stock in / stock out entries",
    category: "Inventory & Stock", categorySlug: "inventory",
    time: "3 min", updatedAt: "March 1, 2025",
    content: [
      { type:"intro", text:"Stock entries record physical movement of goods — purchases (stock in) and adjustments or write-offs (stock out) — keeping your inventory count accurate." },
      { type:"heading", text:"Stock In (Goods Received)" },
      { type:"step", step:1, text:"Go to **Inventory → Stock Entries → New Stock In**." },
      { type:"step", step:2, text:"Select the **product(s)** received and enter the **quantity** and **purchase cost per unit**." },
      { type:"step", step:3, text:"Enter the **supplier name** and **date received**." },
      { type:"step", step:4, text:"Click **Save**. The product's stock count increases immediately." },
      { type:"heading", text:"Stock Out (Adjustments & Write-offs)" },
      { type:"step", step:1, text:"Go to **Inventory → Stock Entries → New Stock Out**." },
      { type:"step", step:2, text:"Select the product and enter the **quantity** to reduce." },
      { type:"step", step:3, text:"Choose the **reason**: Damaged, Expired, Stolen, Adjustment, or Sample." },
      { type:"step", step:4, text:"Click **Save**. The stock count decreases and the loss is posted to the relevant expense account." },
      { type:"tip", text:"Sales invoices automatically reduce stock when products are added as line items. You only need manual stock-out entries for non-sale reductions like damage or theft." },
    ],
    related: [
      { title:"Adding products and services", slug:"add-products", category:"Inventory & Stock", categorySlug:"inventory" },
      { title:"Setting stock alert levels", slug:"stock-alerts", category:"Inventory & Stock", categorySlug:"inventory" },
      { title:"Inventory valuation methods (FIFO/LIFO)", slug:"inventory-valuation", category:"Inventory & Stock", categorySlug:"inventory" },
    ],
  },

  "inventory-valuation": {
    title: "Inventory valuation methods (FIFO/LIFO)",
    category: "Inventory & Stock", categorySlug: "inventory",
    time: "5 min", updatedAt: "February 25, 2025",
    content: [
      { type:"intro", text:"Inventory valuation determines the cost of goods sold and the value of remaining stock. The method you choose affects your profit and tax calculations." },
      { type:"heading", text:"FIFO — First In, First Out" },
      { type:"para", text:"FIFO assumes the oldest stock is sold first. This is the most common method and reflects real-world stock movement for most businesses (especially perishables)." },
      { type:"list", items:["Lower COGS when prices are rising (older, cheaper stock used first)", "Higher reported profit", "Closing stock valued at latest (higher) prices", "Recommended for most businesses"] },
      { type:"heading", text:"LIFO — Last In, First Out" },
      { type:"para", text:"LIFO assumes the newest stock is sold first. This is less common and not permitted under IFRS, but available for management reporting." },
      { type:"list", items:["Higher COGS when prices are rising", "Lower reported profit (tax advantage)", "Not allowed for statutory accounts under IFRS", "Useful for internal pricing decisions only"] },
      { type:"heading", text:"Setting your valuation method" },
      { type:"step", step:1, text:"Go to **Settings → Inventory Settings**." },
      { type:"step", step:2, text:"Select your preferred **Valuation Method**: FIFO, LIFO, or Weighted Average Cost." },
      { type:"step", step:3, text:"Click **Save**. This applies to all new stock movements going forward." },
      { type:"warning", text:"Changing valuation method mid-year can significantly impact your financial statements. Consult your accountant before making this change on a live account." },
    ],
    related: [
      { title:"Stock in / stock out entries", slug:"stock-entries", category:"Inventory & Stock", categorySlug:"inventory" },
      { title:"Generating stock reports", slug:"stock-reports", category:"Inventory & Stock", categorySlug:"inventory" },
    ],
  },

  "stock-transfer": {
    title: "Stock transfer between branches",
    category: "Inventory & Stock", categorySlug: "inventory",
    time: "4 min", updatedAt: "February 22, 2025",
    content: [
      { type:"intro", text:"If your business has multiple branches or warehouses, FinovaOS lets you transfer stock between them while keeping each location's inventory accurate." },
      { type:"step", step:1, text:"Go to **Inventory → Stock Transfers → New Transfer**." },
      { type:"step", step:2, text:"Select the **From Location** (source branch/warehouse)." },
      { type:"step", step:3, text:"Select the **To Location** (destination branch/warehouse)." },
      { type:"step", step:4, text:"Add the **products and quantities** to transfer." },
      { type:"step", step:5, text:"Set the **transfer date** and add any **notes** (e.g., delivery reference)." },
      { type:"step", step:6, text:"Click **Save Transfer**. Stock is deducted from the source and added to the destination immediately." },
      { type:"tip", text:"Print the stock transfer document and include it with the physical delivery as a delivery note. This helps the receiving branch verify quantities." },
      { type:"warning", text:"Stock transfers on the Enterprise plan support approval workflows — a branch manager must approve incoming stock before it's added to their count. Enable this in **Settings → Inventory → Require Transfer Approval**." },
    ],
    related: [
      { title:"Adding products and services", slug:"add-products", category:"Inventory & Stock", categorySlug:"inventory" },
      { title:"Stock in / stock out entries", slug:"stock-entries", category:"Inventory & Stock", categorySlug:"inventory" },
    ],
  },

  "stock-reports": {
    title: "Generating stock reports",
    category: "Inventory & Stock", categorySlug: "inventory",
    time: "2 min", updatedAt: "February 10, 2025",
    content: [
      { type:"intro", text:"FinovaOS's inventory reports give you a real-time view of stock levels, movement, and valuation across all locations." },
      { type:"heading", text:"Available stock reports" },
      { type:"list", items:[
        "**Stock Summary** — Current quantity and value of all products",
        "**Stock Movement Report** — History of all stock in/out for a period",
        "**Low Stock Report** — All products at or below reorder level",
        "**Stock Valuation Report** — Total inventory value by product",
        "**Branch-wise Stock** — Quantities per location (Enterprise plan)",
      ]},
      { type:"heading", text:"Running a report" },
      { type:"step", step:1, text:"Go to **Reports → Inventory Reports** and select the report type." },
      { type:"step", step:2, text:"Set filters: date range, product category, or specific product." },
      { type:"step", step:3, text:"Click **Generate** and review the results on screen." },
      { type:"step", step:4, text:"Click **Export** to download as PDF or Excel." },
      { type:"tip", text:"Run the Stock Valuation Report at month-end and compare it to your balance sheet's inventory asset value. They should match — any difference needs investigation." },
    ],
    related: [
      { title:"Adding products and services", slug:"add-products", category:"Inventory & Stock", categorySlug:"inventory" },
      { title:"Inventory valuation methods (FIFO/LIFO)", slug:"inventory-valuation", category:"Inventory & Stock", categorySlug:"inventory" },
    ],
  },

  /* ══ ACCOUNT & BILLING ══ */
  "update-payment": {
    title: "Updating your payment method",
    category: "Account & Billing", categorySlug: "account",
    time: "2 min", updatedAt: "March 1, 2025",
    content: [
      { type:"intro", text:"You can update your credit card or payment details at any time from your account settings." },
      { type:"step", step:1, text:"Go to **Settings → Subscription & Billing**." },
      { type:"step", step:2, text:"Click **Update Payment Method**." },
      { type:"step", step:3, text:"Enter your new card details: card number, expiry date, and CVV." },
      { type:"step", step:4, text:"Click **Save Card**. Your new card will be used for the next billing cycle." },
      { type:"tip", text:"You'll receive an email confirmation whenever your payment method is updated. If you didn't make this change, contact support immediately at finovaos.app@gmail.com." },
      { type:"warning", text:"If your card fails on the renewal date, your account will enter a 7-day grace period. Update your payment method within this window to avoid service interruption." },
    ],
    related: [
      { title:"Upgrading or downgrading your plan", slug:"upgrade-plan", category:"Account & Billing", categorySlug:"account" },
      { title:"Downloading invoices and receipts", slug:"download-invoices", category:"Account & Billing", categorySlug:"account" },
    ],
  },

  "download-invoices": {
    title: "Downloading your FinovaOS invoices and receipts",
    category: "Account & Billing", categorySlug: "account",
    time: "2 min", updatedAt: "February 15, 2025",
    content: [
      { type:"intro", text:"All your FinovaOS subscription invoices and payment receipts are available to download from your account at any time." },
      { type:"step", step:1, text:"Go to **Settings → Subscription & Billing → Billing History**." },
      { type:"step", step:2, text:"You'll see a list of all charges with date, amount, and status." },
      { type:"step", step:3, text:"Click **Download PDF** next to any invoice to save it." },
      { type:"tip", text:"These invoices include your company name and address (as set in your billing profile) and can be used for expense claims or tax deductions." },
      { type:"heading", text:"Updating billing details on invoices" },
      { type:"para", text:"To update the name, address, or tax number shown on your FinovaOS invoices, go to **Settings → Billing Profile** and update your details. Future invoices will reflect the changes." },
    ],
    related: [
      { title:"Updating your payment method", slug:"update-payment", category:"Account & Billing", categorySlug:"account" },
      { title:"Upgrading or downgrading your plan", slug:"upgrade-plan", category:"Account & Billing", categorySlug:"account" },
    ],
  },

  "cancel-subscription": {
    title: "Cancelling your subscription",
    category: "Account & Billing", categorySlug: "account",
    time: "3 min", updatedAt: "March 1, 2025",
    content: [
      { type:"intro", text:"You can cancel your FinovaOS subscription at any time. Your account remains active until the end of your current billing period." },
      { type:"step", step:1, text:"Go to **Settings → Subscription & Billing**." },
      { type:"step", step:2, text:"Click **Cancel Subscription** at the bottom of the page." },
      { type:"step", step:3, text:"Select a **cancellation reason** (this helps us improve)." },
      { type:"step", step:4, text:"Click **Confirm Cancellation**." },
      { type:"heading", text:"What happens after cancellation" },
      { type:"list", items:[
        "Your account stays active until the billing period ends",
        "No further charges are made",
        "You can export all your data before access ends",
        "Your data is retained for 90 days after expiry",
        "You can reactivate within 90 days and all data is restored",
      ]},
      { type:"tip", text:"Before cancelling, export your data from **Settings → Data Export**. This gives you a full backup of all invoices, accounts, and transactions." },
      { type:"warning", text:"After 90 days of inactivity, your data is permanently deleted. If you think you may return, reactivate before this window closes." },
    ],
    related: [
      { title:"Data export and backup", slug:"data-export", category:"Account & Billing", categorySlug:"account" },
      { title:"Upgrading or downgrading your plan", slug:"upgrade-plan", category:"Account & Billing", categorySlug:"account" },
    ],
  },

  "data-export": {
    title: "Data export and backup",
    category: "Account & Billing", categorySlug: "account",
    time: "4 min", updatedAt: "February 28, 2025",
    content: [
      { type:"intro", text:"FinovaOS lets you export all your business data at any time — invoices, transactions, contacts, reports, and more — in standard formats you can keep forever." },
      { type:"heading", text:"What you can export" },
      { type:"list", items:[
        "All invoices and credit notes (PDF or Excel)",
        "Full transaction ledger (Excel/CSV)",
        "Customer and supplier contacts (CSV)",
        "Chart of accounts and balances (Excel)",
        "Inventory and product list (CSV)",
        "Complete data backup (ZIP archive)",
      ]},
      { type:"heading", text:"How to export" },
      { type:"step", step:1, text:"Go to **Settings → Data Export**." },
      { type:"step", step:2, text:"Select what you want to export from the checklist." },
      { type:"step", step:3, text:"Choose the **date range** if applicable." },
      { type:"step", step:4, text:"Click **Export**. A ZIP file is prepared and emailed to your registered email address within a few minutes." },
      { type:"tip", text:"Schedule a monthly data export as a backup habit — it only takes 30 seconds and gives you peace of mind. Store the ZIP files in Google Drive or Dropbox." },
      { type:"warning", text:"Data exports are sent to your account's registered email only, for security. Make sure your email address is current in **Settings → Account**." },
    ],
    related: [
      { title:"Cancelling your subscription", slug:"cancel-subscription", category:"Account & Billing", categorySlug:"account" },
      { title:"Deleting your account", slug:"delete-account", category:"Account & Billing", categorySlug:"account" },
    ],
  },

  "delete-account": {
    title: "Deleting your account",
    category: "Account & Billing", categorySlug: "account",
    time: "3 min", updatedAt: "February 10, 2025",
    content: [
      { type:"intro", text:"Account deletion is permanent. Before you proceed, make sure you've exported all data you need to keep." },
      { type:"warning", text:"Account deletion cannot be undone. All your data — invoices, transactions, reports, contacts — will be permanently erased. There is no recovery after deletion." },
      { type:"heading", text:"Before you delete" },
      { type:"list", items:[
        "Export all your data from Settings → Data Export",
        "Download all invoices you may need for tax purposes",
        "Cancel any active subscription first",
        "Inform your team members — their access will also end",
      ]},
      { type:"heading", text:"How to delete your account" },
      { type:"step", step:1, text:"Go to **Settings → Account → Danger Zone**." },
      { type:"step", step:2, text:"Click **Delete Account**." },
      { type:"step", step:3, text:"Type your account email address to confirm." },
      { type:"step", step:4, text:"Click **Permanently Delete**." },
      { type:"para", text:"You'll receive a confirmation email. Your account and all associated data will be deleted within 24 hours." },
      { type:"tip", text:"Consider downgrading to our free tier instead of deleting — you keep access to view your historical data without paying anything." },
    ],
    related: [
      { title:"Data export and backup", slug:"data-export", category:"Account & Billing", categorySlug:"account" },
      { title:"Cancelling your subscription", slug:"cancel-subscription", category:"Account & Billing", categorySlug:"account" },
    ],
  },

};

/* ─── Bold text renderer ─── */
function renderText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color:"white", fontWeight:700 }}>{p}</strong>
      : <span key={i}>{p}</span>
  );
}

/* ─── Content blocks ─── */
function ArticleContent({ blocks }: { blocks: typeof ARTICLES[string]["content"] }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "intro":
            return (
              <p key={i} style={{ fontSize:16, color:"rgba(255,255,255,.65)", lineHeight:1.8, borderLeft:"3px solid rgba(129,140,248,.5)", paddingLeft:16, fontStyle:"italic", margin:0 }}>
                {block.text}
              </p>
            );
          case "heading":
            return (
              <h3 key={i} style={{ fontFamily:"'Lora',serif", fontSize:18, fontWeight:700, color:"white", letterSpacing:"-.3px", margin:"8px 0 0", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ width:3, height:18, borderRadius:2, background:"linear-gradient(#818cf8,#6366f1)", display:"inline-block", flexShrink:0 }}/>
                {block.text}
              </h3>
            );
          case "para":
            return (
              <p key={i} style={{ fontSize:14.5, color:"rgba(255,255,255,.6)", lineHeight:1.85, margin:0 }}>
                {block.text && renderText(block.text)}
              </p>
            );
          case "step":
            return (
              <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"white", boxShadow:"0 4px 12px rgba(99,102,241,.4)", marginTop:1 }}>
                  {block.step}
                </div>
                <p style={{ fontSize:14.5, color:"rgba(255,255,255,.65)", lineHeight:1.8, margin:0, paddingTop:3 }}>
                  {block.text && renderText(block.text)}
                </p>
              </div>
            );
          case "tip":
            return (
              <div key={i} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(52,211,153,.07)", border:"1.5px solid rgba(52,211,153,.22)", display:"flex", gap:12, alignItems:"flex-start" }}>
                <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>💡</span>
                <p style={{ fontSize:13.5, color:"rgba(255,255,255,.6)", lineHeight:1.75, margin:0 }}>
                  <strong style={{ color:"#34d399", fontWeight:700 }}>Tip: </strong>
                  {block.text && renderText(block.text)}
                </p>
              </div>
            );
          case "warning":
            return (
              <div key={i} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(251,191,36,.06)", border:"1.5px solid rgba(251,191,36,.22)", display:"flex", gap:12, alignItems:"flex-start" }}>
                <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>⚠️</span>
                <p style={{ fontSize:13.5, color:"rgba(255,255,255,.6)", lineHeight:1.75, margin:0 }}>
                  <strong style={{ color:"#fbbf24", fontWeight:700 }}>Note: </strong>
                  {block.text && renderText(block.text)}
                </p>
              </div>
            );
          case "list":
            return (
              <ul key={i} style={{ paddingLeft:0, margin:0, display:"flex", flexDirection:"column", gap:8, listStyle:"none" }}>
                {block.items?.map((item, j) => (
                  <li key={j} style={{ display:"flex", alignItems:"flex-start", gap:10, fontSize:14, color:"rgba(255,255,255,.6)", lineHeight:1.75 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"#818cf8", flexShrink:0, marginTop:8 }}/>
                    <span>{renderText(item)}</span>
                  </li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE COMPONENT
   ───────────────────────────────────────── */
export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string; category?: string }>;
}) {
  const { slug } = await params;
  const article = ARTICLES[slug];

  if (!article) {
    return (
      <div style={{ minHeight:"100vh", background:"#080c1e", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontFamily:"'Outfit',sans-serif" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
          <h1 style={{ fontFamily:"'Lora',serif", fontSize:28, marginBottom:8 }}>Article not found</h1>
          <p style={{ color:"rgba(255,255,255,.4)", marginBottom:24 }}>This article doesn&apos;t exist or may have moved.</p>
          <Link href="/help" style={{ color:"#818cf8", fontWeight:600, fontSize:14 }}>← Back to Help Center</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#080c1e 0%,#0c0f2e 30%,#080c1e 100%)", color:"white", fontFamily:"'Outfit','DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:ital,wght@0,700;1,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes orbDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(16px,-14px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .hc-crumb{color:rgba(255,255,255,.28);text-decoration:none;transition:color .2s}
        .hc-crumb:hover{color:rgba(255,255,255,.6)}
        .hc-related{display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);text-decoration:none;transition:all .22s}
        .hc-related:hover{background:rgba(99,102,241,.08);border-color:rgba(129,140,248,.3);transform:translateX(4px)}
        .hc-back{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;color:rgba(255,255,255,.35);text-decoration:none;transition:color .2s}
        .hc-back:hover{color:#818cf8}
        .hc-mail{font-size:13px;font-weight:600;color:rgba(255,255,255,.3);text-decoration:none;transition:color .2s}
        .hc-mail:hover{color:white}
      `}</style>

      {/* BG */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)", backgroundSize:"48px 48px" }}/>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,.08),transparent 65%)", top:-100, right:-100, animation:"orbDrift 14s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.4),transparent)" }}/>
      </div>

      <div style={{ position:"relative", zIndex:1, maxWidth:820, margin:"0 auto", padding:"60px 24px 100px", animation:"fadeUp .5s ease both" }}>

        {/* Breadcrumb */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:32, flexWrap:"wrap" }}>
          {[
            { label:"Home",        href:"/" },
            { label:"Help Center", href:"/help" },
          ].map(({ label, href }, i) => (
            <span key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Link href={href} className="hc-crumb" style={{ fontSize:12, fontWeight:500 }}>
                {label}
              </Link>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          ))}
          <span style={{ fontSize:12, color:"rgba(255,255,255,.45)", fontWeight:500 }}>{article.title}</span>
        </div>

        {/* Article header */}
        <div style={{ marginBottom:36 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            <div style={{ padding:"4px 12px", borderRadius:20, background:"rgba(129,140,248,.1)", border:"1.5px solid rgba(129,140,248,.28)", fontSize:11, fontWeight:700, color:"#a5b4fc", letterSpacing:".08em", textTransform:"uppercase" }}>
              {article.category}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"rgba(255,255,255,.3)", fontWeight:500 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {article.time} read
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.25)", fontWeight:500 }}>Updated {article.updatedAt}</div>
          </div>
          <h1 style={{ fontFamily:"'Lora',serif", fontSize:"clamp(24px,3.5vw,36px)", fontWeight:700, color:"white", letterSpacing:"-1px", lineHeight:1.15, margin:0 }}>
            {article.title}
          </h1>
        </div>

        {/* Article body */}
        <div style={{ borderRadius:22, padding:"32px 32px", background:"rgba(255,255,255,.03)", border:"1.5px solid rgba(255,255,255,.08)", backdropFilter:"blur(16px)", marginBottom:28, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }}/>
          <ArticleContent blocks={article.content}/>
        </div>

        {/* Was this helpful */}
        <HelpfulWidget />

        {/* Related articles */}
        {article.related.length > 0 && (
          <div style={{ marginBottom:40 }}>
            <h3 style={{ fontFamily:"'Lora',serif", fontSize:18, fontWeight:700, color:"white", marginBottom:14 }}>Related Articles</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {article.related.map((rel, i) => (
                <Link key={i} href={`/help/${rel.slug}`} className="hc-related">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,.5)" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13.5, fontWeight:600, color:"rgba(255,255,255,.7)" }}>{rel.title}</div>
                    <div style={{ fontSize:11.5, color:"rgba(255,255,255,.28)", marginTop:2 }}>{rel.category}</div>
                  </div>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop:28, borderTop:"1px solid rgba(255,255,255,.07)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <Link href="/help" className="hc-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Help Center
          </Link>
          <a href="mailto:finovaos.app@gmail.com" className="hc-mail">
            Still need help? Contact support →
          </a>
        </div>

      </div>
    </div>
  );
}

/* ─── Client component for helpful widget ─── */
// Isko alag file mein rakh sakte ho: components/HelpfulWidget.tsx
// Ya inline "use client" ke saath use karo
function HelpfulWidget() {
  // Server component mein useState nahi chalta
  // Isko alag client component mein move karo:
  // "use client"
  // import { useState } from "react"
  // export default function HelpfulWidget() { ... }
  return (
    <div style={{ borderRadius:16, padding:"20px 22px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", marginBottom:32, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
      <span style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,.45)" }}>Was this article helpful?</span>
      <div style={{ display:"flex", gap:8 }}>
        <a href="?helpful=yes" style={{ padding:"8px 18px", borderRadius:10, background:"rgba(52,211,153,.08)", border:"1.5px solid rgba(52,211,153,.25)", color:"#34d399", fontSize:13, fontWeight:600, textDecoration:"none" }}>👍 Yes</a>
        <a href="?helpful=no"  style={{ padding:"8px 18px", borderRadius:10, background:"rgba(248,113,113,.08)", border:"1.5px solid rgba(248,113,113,.2)",  color:"#f87171", fontSize:13, fontWeight:600, textDecoration:"none" }}>👎 No</a>
      </div>
    </div>
  );
}
