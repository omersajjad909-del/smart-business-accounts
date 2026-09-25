import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES[slug];
  const url = `${BASE}/help/${slug}`;

  if (!article) return { alternates: { canonical: url } };

  const title = `${article.title} — FinovaOS Help Center`;
  const intro = article.content.find(b => b.type === "intro")?.text ?? "";
  const description = (intro || `A step-by-step FinovaOS Help Center guide: ${article.title.toLowerCase()}.`)
    .replace(/\*\*/g, "")
    .slice(0, 160);

  return {
    title,
    description,
    keywords: [article.title, article.category, "FinovaOS help", "FinovaOS guide"],
    openGraph: {
      title,
      description,
      url,
      siteName: "FinovaOS",
      images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: article.title }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE}/icon.png`],
    },
    alternates: { canonical: url },
  };
}

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
      { type:"intro", text:"FinovaOS offers three plans to suit businesses of all sizes. Here's how to pick the one that fits you best. Every plan covers one company — see the multi-company guide if you need a second legal entity." },
      { type:"heading", text:"Starter Plan — Best for small businesses" },
      { type:"list", items:["1 company", "Invoicing & billing", "Ledger & trial balance", "Basic reports", "Up to 3 users", "Email support"] },
      { type:"heading", text:"Professional Plan — Best for growing teams" },
      { type:"list", items:["1 company, up to 3 branches", "Everything in Starter", "Bank reconciliation", "Advanced reports & analytics", "Role-based access control", "Up to 10 users", "Priority email support"] },
      { type:"heading", text:"Enterprise Plan — Best for large organizations" },
      { type:"list", items:["1 company, up to 10 branches", "Everything in Professional", "Custom integrations & API", "Dedicated onboarding manager", "Up to 25 users", "24/7 priority support", "SLA guarantee"] },
      { type:"tip", text:"Start with Starter and upgrade anytime — your data and settings carry over automatically. There's no lock-in." },
      { type:"warning", text:"If you need more than 3 branches or more than 25 users, contact sales — these are the plan ceilings, and a higher limit needs a custom arrangement." },
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
      { type:"step", step:1, text:"Go to **Company Profile** from your dashboard sidebar." },
      { type:"step", step:2, text:"Enter your **Company Name** exactly as it should appear on invoices and legal documents." },
      { type:"step", step:3, text:"Upload your **company logo**." },
      { type:"step", step:4, text:"Set your **Country** and **base currency**." },
      { type:"step", step:5, text:"Click **Save Changes**. Your profile is now applied to all new documents." },
      { type:"tip", text:"Address, tax registration number and financial year aren't part of the company profile form yet — if you need one of these on your invoices, contact support." },
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
      { type:"list", items:["**Admin** — Full access to all features and settings", "**Manager**, **Accountant**, **HR Manager**, **Sales**, **Inventory Manager**, **Cashier**, **Auditor**, **Security** — access scoped to that function", "**Viewer** — Read-only access to reports"] },
      { type:"step", step:4, text:"Click **Send Invite**. They'll receive an email to join your workspace." },
      { type:"tip", text:"Team members count toward your plan's user limit — 3 on Starter, 10 on Professional, 25 on Enterprise." },
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
      { type:"intro", text:"How you connect a bank account depends on where it's held." },
      { type:"heading", text:"US bank accounts — automatic sync" },
      { type:"para", text:"US-based accounts can be linked directly via Plaid, so transactions import automatically without any manual entry." },
      { type:"heading", text:"Pakistani and other banks — manual entry" },
      { type:"step", step:1, text:"Go to **Bank Reconciliation** and click **+ Add Bank Account**." },
      { type:"step", step:2, text:"Enter the **bank name**, **account number**, **account name**, and **opening balance**." },
      { type:"step", step:3, text:"As transactions happen, add each statement line manually — date, amount, description and reference number." },
      { type:"warning", text:"FinovaOS never stores your internet banking credentials. Outside the US, there's currently no automatic sync or file-upload import — entries are added one at a time." },
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
      { type:"tip", text:"There's no recurring toggle on the invoice form itself — for a bill that repeats on a schedule, set it up separately under Recurring Transactions instead." },
      { type:"warning", text:"Once an invoice is finalized and sent, you cannot edit the amounts directly. Contact support for corrections until a self-service credit note flow is available." },
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
    time: "3 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"When a customer pays an invoice, you record the receipt as a Cash Receipt Voucher (CRV) — a general receipt entry, not a button on the invoice itself." },
      { type:"step", step:1, text:"Go to **Payment Receipts** in the sidebar — it opens the Cash Receipt Voucher (CRV) screen." },
      { type:"step", step:2, text:"Enter the **customer**, the **amount received**, and the **date**." },
      { type:"step", step:3, text:"Select the **bank account** or cash account the payment was deposited into." },
      { type:"step", step:4, text:"Add a **reference number** (e.g., bank transfer reference) if applicable." },
      { type:"step", step:5, text:"Click **Save**. This posts the receipt against the customer's account." },
      { type:"tip", text:"A CRV posts to the customer's overall account balance rather than against one specific invoice line — check the customer's party ledger to see the running balance after recording a receipt." },
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
    title: "Adding bank statement transactions",
    category: "Banking & Reconciliation", categorySlug: "banking",
    time: "3 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"A bulk CSV/Excel statement import with automatic column mapping isn't available yet — statement lines are added one at a time." },
      { type:"step", step:1, text:"Go to **Bank Reconciliation** and select your bank account." },
      { type:"step", step:2, text:"Add each transaction from your statement: date, amount, description and reference number." },
      { type:"step", step:3, text:"Once entered, use the Smart Reconciliation panel to match these against your recorded transactions." },
      { type:"tip", text:"If you have a US bank account, connecting it via Plaid (see connecting your bank account) imports transactions automatically instead — no manual entry needed." },
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
    title: "Exporting and printing reports",
    category: "Reports & Analytics", categorySlug: "reports",
    time: "2 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"There isn't a single universal PDF/Excel export yet — what's available depends on the report." },
      { type:"list", items:[
        "**Profit & Loss** and **Balance Sheet** — use the Print button, then \"Save as PDF\" from your browser's print dialog.",
        "**Cash Flow** and **Tax Summary** — use the Export CSV button.",
      ]},
      { type:"tip", text:"For a report that needs a specific export format you don't see here, contact support." },
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
      { type:"intro", text:"You can change your FinovaOS plan at any time." },
      { type:"step", step:1, text:"Go to **Billing** in your dashboard." },
      { type:"step", step:2, text:"Choose **Upgrade** or **Downgrade** on the plan you want." },
      { type:"step", step:3, text:"You'll be taken straight to checkout to complete the plan change." },
      { type:"tip", text:"Changing plans never loses your data. All your invoices, reports, and settings carry over automatically." },
      { type:"warning", text:"Both upgrades and downgrades take effect immediately at checkout — there's no deferred downgrade at the end of a billing cycle." },
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
      { type:"intro", text:"Recurring Transactions automate any repeating voucher or invoice, on a fixed frequency." },
      { type:"heading", text:"When to use it" },
      { type:"list", items:["Monthly retainer clients", "Subscription-based services", "Regular maintenance contracts", "Rent or lease billing"] },
      { type:"heading", text:"How to set one up" },
      { type:"step", step:1, text:"Go to **Accounting → Recurring Transactions** — this isn't a toggle on the invoice form itself." },
      { type:"step", step:2, text:"Choose the **type**: CPV, CRV, Expense, Payment, Sales Invoice or Purchase Invoice." },
      { type:"step", step:3, text:"Set the **frequency**: Daily, Weekly, Monthly or Quarterly." },
      { type:"step", step:4, text:"Set the **start date**." },
      { type:"step", step:5, text:"Save it. FinovaOS will generate the transaction on schedule." },
      { type:"tip", text:"There's no custom interval and no auto-send-vs-draft choice yet — every occurrence generates the same way, on the frequency you picked." },
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
      { type:"step", step:2, text:"FinovaOS sends the invoice PDF directly through your company's connected WhatsApp Business number — no app needs to open on your device." },
      { type:"tip", text:"WhatsApp sending uses your company's own WhatsApp Business API connection, set up separately — it does not rely on WhatsApp being installed on your phone." },
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
    time: "2 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"A credit note is issued to correct or cancel a finalized invoice — for example, if a customer returned goods or was overcharged." },
      { type:"heading", text:"When you'd issue a credit note" },
      { type:"list", items:["Customer returned goods", "Invoice had wrong pricing", "Service was cancelled after invoicing", "Discount applied after the fact"] },
      { type:"warning", text:"A dedicated credit-note screen isn't in the dashboard yet — there's no \"Issue Credit Note\" button on the invoice view. In the meantime, record the correction as a journal voucher against the customer's account, or contact support for help structuring the entry." },
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
      { type:"step", step:1, text:"Go to **Bank Reconciliation** and select a bank account and statement." },
      { type:"step", step:2, text:"Click **Refresh AI** in the Smart Reconciliation panel — it compares your statement lines against recorded entries and suggests matches." },
      { type:"step", step:3, text:"Review the suggestions and adjust the system or bank balance shown as needed." },
      { type:"step", step:4, text:"Once the balances agree, click **Reconcile** to confirm." },
      { type:"tip", text:"The more consistent your transaction descriptions are, the better the AI's suggestions become over time." },
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
      { type:"step", step:1, text:"For anything the statement shows that isn't in your books yet (a bank fee, an unentered transfer), record it as a voucher first — a CPV, CRV or journal entry against the correct account." },
      { type:"step", step:2, text:"Go back to **Bank Reconciliation**, click **Refresh AI**, and it should now pick up the newly-recorded entry as a match." },
      { type:"step", step:3, text:"Once the system and bank balances agree, click **Reconcile**." },
      { type:"warning", text:"There's no \"suspense account\" concept here — every entry needs to go to a real account before it can be matched. Never leave a transaction unrecorded just to make the balance close." },
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
      { type:"intro", text:"FinovaOS supports multiple bank accounts — track each account separately and pick the right one when recording a transaction." },
      { type:"step", step:1, text:"Go to **Bank Reconciliation** and click **+ Add Bank Account**." },
      { type:"step", step:2, text:"Enter the **bank name** (e.g., 'HBL', 'MCB')." },
      { type:"step", step:3, text:"Enter the **account number** and **account name**." },
      { type:"step", step:4, text:"Enter the **opening balance** as of your FinovaOS start date." },
      { type:"step", step:5, text:"Save it. It now appears in your reconciliation list." },
      { type:"tip", text:"There's no account-type field (Current/Savings/Cash) or a per-account currency selector yet — every account is tracked the same way, in your company's base currency." },
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
      { type:"step", step:4, text:"Review the figures and click **Export CSV** to save for filing." },
      { type:"heading", text:"Filing your return" },
      { type:"para", text:"Use the exported tax summary as a reference when logging into your country's tax portal. The figures in FinovaOS match what you need to enter." },
      { type:"tip", text:"Set up tax rates correctly under **Tax & GST** (in the Banking & Payments section) before creating invoices. This ensures every invoice automatically applies the right tax and appears correctly in the summary." },
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
    title: "Inventory valuation methods (FIFO / Weighted Average)",
    category: "Inventory & Stock", categorySlug: "inventory",
    time: "4 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"Inventory valuation determines the cost of goods sold and the value of remaining stock. FinovaOS supports two methods — FIFO and Weighted Average; LIFO isn't implemented." },
      { type:"heading", text:"FIFO — First In, First Out" },
      { type:"para", text:"FIFO assumes the oldest stock is sold first. This is the most common method and reflects real-world stock movement for most businesses (especially perishables)." },
      { type:"list", items:["Lower COGS when prices are rising (older, cheaper stock used first)", "Higher reported profit", "Closing stock valued at latest (higher) prices", "Recommended for most businesses"] },
      { type:"heading", text:"Weighted Average" },
      { type:"para", text:"Every purchase updates a running average cost, and every sale releases stock at that average. It smooths out price swings instead of tracking specific batches." },
      { type:"heading", text:"Setting your valuation method" },
      { type:"step", step:1, text:"Go to **Reports → Stock Valuation**." },
      { type:"step", step:2, text:"Toggle between **FIFO** and **Weighted Average** on the report itself." },
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
      { type:"tip", text:"You'll receive an email confirmation whenever your payment method is updated. If you didn't make this change, contact support immediately at support@finovaos.app." },
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
      { type:"step", step:1, text:"Go to **Billing** in your dashboard and open the **Invoices** tab." },
      { type:"step", step:2, text:"You'll see a list of all charges with date, amount, and status." },
      { type:"step", step:3, text:"Click **Download** next to any invoice to save it." },
      { type:"tip", text:"These invoices can be used for expense claims or tax deductions." },
      { type:"warning", text:"There's no separate billing-profile screen for the name/address shown on these invoices yet — contact support if you need it changed." },
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
    time: "2 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"There's no single \"export everything\" screen yet, but you can get your data out in two ways." },
      { type:"heading", text:"Export individual reports" },
      { type:"list", items:[
        "Most reports (cash flow, stock, and others) have their own Export CSV button on the report page.",
        "Reports without a CSV option (like Profit & Loss and Balance Sheet) can be printed to PDF from the browser's Print dialog.",
      ]},
      { type:"heading", text:"Request a full data export" },
      { type:"para", text:"For a complete export of your account data — all invoices, ledger entries, contacts and inventory — contact support and ask for a data export. This is handled as a data request and the file is provided directly to you." },
      { type:"tip", text:"If you're closing your account, request the export before you cancel — see the account cancellation guide for the full sequence." },
    ],
    related: [
      { title:"Cancelling your subscription", slug:"cancel-subscription", category:"Account & Billing", categorySlug:"account" },
      { title:"Deleting your account", slug:"delete-account", category:"Account & Billing", categorySlug:"account" },
    ],
  },

  "delete-account": {
    title: "Wiping your company data",
    category: "Account & Billing", categorySlug: "account",
    time: "3 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"The Danger Zone action wipes your company's data — it does not delete your account, plan, or logins, which stay intact." },
      { type:"warning", text:"This cannot be undone. Invoices, transactions, reports and contacts are permanently erased. There is no recovery after this." },
      { type:"heading", text:"Before you wipe your data" },
      { type:"list", items:[
        "Request a full data export from support — see the data export guide",
        "Download any invoices you need for tax purposes",
        "Inform your team members before their working data disappears",
      ]},
      { type:"heading", text:"How to wipe your data" },
      { type:"step", step:1, text:"Go to **Settings → Danger Zone**." },
      { type:"step", step:2, text:"Confirm with your **company name** and **password**." },
      { type:"step", step:3, text:"Enter the 6-digit code sent to your email." },
      { type:"para", text:"Your company, plan and user logins remain — only the transactional data is erased." },
      { type:"tip", text:"If what you actually want is to stop being billed, cancel your subscription instead — see the cancellation guide." },
    ],
    related: [
      { title:"Data export and backup", slug:"data-export", category:"Account & Billing", categorySlug:"account" },
      { title:"Cancelling your subscription", slug:"cancel-subscription", category:"Account & Billing", categorySlug:"account" },
    ],
  },

  "getting-started": {
    title: "Getting started with FinovaOS",
    category: "Getting Started", categorySlug: "getting-started",
    time: "4 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"This guide helps you launch FinovaOS quickly: set up your company, add your first users, and start recording transactions." },
      { type:"step", step:1, text:"Sign in and complete the company profile with your business name, address, and base currency." },
      { type:"step", step:2, text:"Invite your team and assign roles so the right people can access accounting, sales, or payroll features." },
      { type:"step", step:3, text:"Add your first customers, suppliers, and bank accounts." },
      { type:"step", step:4, text:"Create your first invoice or payment voucher to begin posting transactions." },
      { type:"tip", text:"Start with the dashboard overview — it shows your cash position, receivables, and top action items in one place." },
    ],
    related: [
      { title:"Create your account", slug:"create-account", category:"Getting Started", categorySlug:"getting-started" },
      { title:"Connecting your bank account", slug:"connect-bank", category:"Getting Started", categorySlug:"getting-started" },
      { title:"How bank reconciliation works", slug:"bank-reconciliation", category:"Banking & Reconciliation", categorySlug:"banking" },
    ],
  },

  "chart-of-accounts": {
    title: "Chart of accounts overview",
    category: "Accounting & Ledger", categorySlug: "accounting",
    time: "4 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"The chart of accounts is the backbone of your business books. It organizes assets, liabilities, revenue, and expenses for accurate reporting." },
      { type:"step", step:1, text:"Review the default accounts FinovaOS creates for your business type." },
      { type:"step", step:2, text:"Add or rename accounts to match your local chart of accounts and reporting needs." },
      { type:"step", step:3, text:"Use account groups such as Assets, Liabilities, Equity, Income, and Expenses to keep your ledger structured." },
      { type:"tip", text:"Keep account names clear and avoid duplicate accounts. This makes financial statements easier to read and reconcile." },
    ],
    related: [
      { title:"Journal entries & JVs", slug:"journal-entries", category:"Accounting & Ledger", categorySlug:"accounting" },
      { title:"Profit & Loss statement", slug:"pl-statement", category:"Reports & Analytics", categorySlug:"reports" },
      { title:"Balance sheet walkthrough", slug:"balance-sheet", category:"Reports & Analytics", categorySlug:"reports" },
    ],
  },

  "journal-entries": {
    title: "Journal entries & JVs",
    category: "Accounting & Ledger", categorySlug: "accounting",
    time: "4 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"Journal entries record business activity in your ledger. Every debit has a matching credit, keeping your books balanced." },
      { type:"step", step:1, text:"Go to **Journal Voucher (JV)** in the sidebar. Use it for adjustments, opening balances, and transactions that don't come from sales or expenses." },
      { type:"step", step:2, text:"Select the accounts to debit and credit, enter the amount, and add a clear description." },
      { type:"tip", text:"Use journal entries to correct posting errors, record depreciation, or allocate shared costs across departments." },
    ],
    related: [
      { title:"Chart of accounts overview", slug:"chart-of-accounts", category:"Accounting & Ledger", categorySlug:"accounting" },
      { title:"Trial balance", slug:"trial-balance", category:"Accounting & Ledger", categorySlug:"accounting" },
    ],
  },

  "period-locking": {
    title: "Period locking & audit trails",
    category: "Accounting & Ledger", categorySlug: "accounting",
    time: "2 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"A formal period-close/lock feature — freezing a month or year so it can't be edited — isn't available yet." },
      { type:"warning", text:"For now, treat a closed period as closed by convention: finish reconciling, run your trial balance, and avoid backdating entries into it. Every transaction is still timestamped and kept in the activity log, so any change made after the fact is traceable even without a hard lock." },
    ],
    related: [
      { title:"Trial balance", slug:"trial-balance", category:"Accounting & Ledger", categorySlug:"accounting" },
      { title:"Balance sheet walkthrough", slug:"balance-sheet", category:"Reports & Analytics", categorySlug:"reports" },
    ],
  },

  "trial-balance": {
    title: "Trial balance",
    category: "Accounting & Ledger", categorySlug: "accounting",
    time: "3 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"The trial balance lists account totals to confirm debits equal credits before final reports are prepared." },
      { type:"step", step:1, text:"Run the trial balance after posting all transactions for the period." },
      { type:"step", step:2, text:"Review accounts with unexpected balances and investigate any differences." },
      { type:"tip", text:"If debits and credits do not match, check recent journal entries and reconciliations for missing or incorrect postings." },
    ],
    related: [
      { title:"Chart of accounts overview", slug:"chart-of-accounts", category:"Accounting & Ledger", categorySlug:"accounting" },
      { title:"Balance sheet walkthrough", slug:"balance-sheet", category:"Reports & Analytics", categorySlug:"reports" },
    ],
  },

  "grn": {
    title: "Goods received notes (GRN)",
    category: "Inventory & Stock", categorySlug: "inventory",
    time: "3 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"A GRN records goods received from suppliers and updates stock levels in FinovaOS." },
      { type:"step", step:1, text:"Go to **Inventory → GRN** and select the supplier." },
      { type:"step", step:2, text:"Add the products received, quantities, and purchase costs." },
      { type:"step", step:3, text:"Save the GRN to update inventory and trigger a purchase ledger entry." },
      { type:"tip", text:"Use GRNs for incoming stock deliveries so your inventory stays accurate and purchase costs are tracked properly." },
    ],
    related: [
      { title:"Adding products and services", slug:"add-products", category:"Inventory & Stock", categorySlug:"inventory" },
      { title:"Purchase orders", slug:"purchase-orders", category:"Inventory & Stock", categorySlug:"inventory" },
    ],
  },

  "purchase-orders": {
    title: "Purchase orders",
    category: "Inventory & Stock", categorySlug: "inventory",
    time: "3 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"Purchase orders help you order supplies, track expected receipts, and compare against actual deliveries." },
      { type:"step", step:1, text:"Go to **Purchase Order** — it's under the Sales & Purchase section, not Inventory." },
      { type:"step", step:2, text:"Select the vendor and add the items you want to purchase." },
      { type:"step", step:3, text:"Send the PO to your supplier and receive materials against the GRN when they arrive." },
      { type:"tip", text:"Match each GRN to the original purchase order to keep your inventory and accounts aligned." },
    ],
    related: [
      { title:"Goods received notes (GRN)", slug:"grn", category:"Inventory & Stock", categorySlug:"inventory" },
      { title:"Stock transfer between branches", slug:"stock-transfer", category:"Inventory & Stock", categorySlug:"inventory" },
    ],
  },

  "crv": {
    title: "Cash receipt vouchers (CRV)",
    category: "Banking & Reconciliation", categorySlug: "banking",
    time: "3 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"A CRV records money received into cash or bank accounts, keeping your receipts and ledger balanced." },
      { type:"step", step:1, text:"Go to **Banking → Payment Vouchers → New CRV**." },
      { type:"step", step:2, text:"Select the receiving account and enter the payer, date, and amount." },
      { type:"step", step:3, text:"Choose the income or receivable account to credit and save the voucher." },
      { type:"tip", text:"Use CRVs for customer receipts, loan recoveries, or any cash/bank inflow that isn't from an invoice." },
    ],
    related: [
      { title:"How bank reconciliation works", slug:"bank-reconciliation", category:"Banking & Reconciliation", categorySlug:"banking" },
      { title:"Recording payments & receipts", slug:"record-payment", category:"Invoicing & Billing", categorySlug:"invoicing" },
    ],
  },

  "add-employees": {
    title: "Adding employees & departments",
    category: "HR & Payroll", categorySlug: "payroll",
    time: "4 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"Add employees and departments so payroll, attendance, and HR records are linked correctly in FinovaOS." },
      { type:"step", step:1, text:"Go to **HR → Employees → Add Employee**." },
      { type:"step", step:2, text:"Fill in personal details, salary structure, and department assignment." },
      { type:"step", step:3, text:"Save the employee profile and repeat for your team members." },
      { type:"tip", text:"Group employees into departments to run payroll and attendance reports by team." },
    ],
    related: [
      { title:"Attendance & timesheets", slug:"attendance", category:"HR & Payroll", categorySlug:"payroll" },
      { title:"Run monthly payroll", slug:"run-payroll", category:"HR & Payroll", categorySlug:"payroll" },
    ],
  },

  "attendance": {
    title: "Attendance & timesheets",
    category: "HR & Payroll", categorySlug: "payroll",
    time: "3 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"Track employee attendance, check-ins, and work hours to calculate payroll accurately." },
      { type:"step", step:1, text:"Go to **HR → Attendance** and select the month or date range." },
      { type:"step", step:2, text:"Review employee entries, add missing times, and approve the final timesheet." },
      { type:"tip", text:"Approve attendance before payroll is processed so salaries reflect the correct hours worked." },
    ],
    related: [
      { title:"Leave management", slug:"leave-management", category:"HR & Payroll", categorySlug:"payroll" },
      { title:"Run monthly payroll", slug:"run-payroll", category:"HR & Payroll", categorySlug:"payroll" },
    ],
  },

  "leave-management": {
    title: "Leave management",
    category: "HR & Payroll", categorySlug: "payroll",
    time: "2 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"There's no dedicated leave-management module yet — no leave types, quotas, or an approval workflow." },
      { type:"step", step:1, text:"Go to **Attendance** and mark an employee's day as **Leave** on the day it happens." },
      { type:"step", step:2, text:"Filter the Attendance view by the Leave status to see who's been marked on leave over a period." },
      { type:"warning", text:"Leave doesn't automatically reduce salary — if a leave day should affect pay, account for it manually when you run payroll." },
    ],
    related: [
      { title:"Attendance & timesheets", slug:"attendance", category:"HR & Payroll", categorySlug:"payroll" },
      { title:"Run monthly payroll", slug:"run-payroll", category:"HR & Payroll", categorySlug:"payroll" },
    ],
  },

  "run-payroll": {
    title: "Run monthly payroll",
    category: "HR & Payroll", categorySlug: "payroll",
    time: "4 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"Process payroll each month and generate salary payments, deductions, and payslips." },
      { type:"step", step:1, text:"Go to **HR → Payroll → Run Payroll**." },
      { type:"step", step:2, text:"Verify employee salary details, allowances, and deductions." },
      { type:"step", step:3, text:"Approve the payroll run and post the salary journal entry." },
      { type:"tip", text:"Run payroll after attendance and leave are finalized so amounts are accurate." },
    ],
    related: [
      { title:"Payslips & PDF export", slug:"payslips", category:"HR & Payroll", categorySlug:"payroll" },
      { title:"Salary advance management", slug:"salary-advance", category:"HR & Payroll", categorySlug:"payroll" },
    ],
  },

  "payslips": {
    title: "Payslips & PDF export",
    category: "HR & Payroll", categorySlug: "payroll",
    time: "3 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"Payslips are printed one employee at a time — there's no batch generation for a whole month yet." },
      { type:"step", step:1, text:"Open **Payroll** and find the employee's row for the month you've run." },
      { type:"step", step:2, text:"Click **Slip** on that row — it opens a browser print window with the payslip." },
      { type:"step", step:3, text:"Print it or save it as a PDF from the print dialog." },
      { type:"tip", text:"There's no in-app email delivery for payslips yet — share the saved PDF with the employee directly." },
    ],
    related: [
      { title:"Run monthly payroll", slug:"run-payroll", category:"HR & Payroll", categorySlug:"payroll" },
      { title:"Salary advance management", slug:"salary-advance", category:"HR & Payroll", categorySlug:"payroll" },
    ],
  },

  "salary-advance": {
    title: "Salary advance management",
    category: "HR & Payroll", categorySlug: "payroll",
    time: "3 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"Record salary advances paid to employees and deduct them from future payrolls." },
      { type:"step", step:1, text:"Go to **HR → Payroll → Salary Advances**." },
      { type:"step", step:2, text:"Select the employee and enter the advance amount and date." },
      { type:"step", step:3, text:"Save the advance and allow FinovaOS to apply it during the next payroll run." },
      { type:"tip", text:"Keep advance records current so payroll net pay reflects outstanding employee advances." },
    ],
    related: [
      { title:"Run monthly payroll", slug:"run-payroll", category:"HR & Payroll", categorySlug:"payroll" },
      { title:"Payslips & PDF export", slug:"payslips", category:"HR & Payroll", categorySlug:"payroll" },
    ],
  },

  "add-branch": {
    title: "Add a new branch / location",
    category: "Multi-Branch & Companies", categorySlug: "account",
    time: "3 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"Create a new branch or location in FinovaOS to track transactions separately by site." },
      { type:"step", step:1, text:"Go to **Settings → Branches** and click **Add Branch**." },
      { type:"step", step:2, text:"Enter the branch name, address, and contact details." },
      { type:"step", step:3, text:"Save the branch and assign users or cost centers as needed." },
      { type:"tip", text:"Use branch-level tracking to compare performance and inventory across locations." },
    ],
    related: [
      { title:"Stock transfer between branches", slug:"stock-transfer", category:"Inventory & Stock", categorySlug:"inventory" },
      { title:"Per-branch roles & permissions", slug:"branch-roles", category:"Multi-Branch & Companies", categorySlug:"account" },
    ],
  },

  "consolidated-pl": {
    title: "Consolidated P&L report",
    category: "Multi-Branch & Companies", categorySlug: "account",
    time: "2 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"A single report that automatically combines P&L across branches or companies isn't available yet." },
      { type:"step", step:1, text:"Run **Profit & Loss** for each branch or company individually." },
      { type:"step", step:2, text:"Combine the figures yourself for a group-level view — export each one to a spreadsheet if that's easier." },
      { type:"tip", text:"If group-level consolidation is important for how you report to a board or ownership, mention it to support — it helps us prioritise what to build next." },
    ],
    related: [
      { title:"Trial balance", slug:"trial-balance", category:"Accounting & Ledger", categorySlug:"accounting" },
      { title:"Multi-company setup", slug:"multi-company", category:"Multi-Branch & Companies", categorySlug:"account" },
    ],
  },

  "branch-roles": {
    title: "Per-branch roles & permissions",
    category: "Multi-Branch & Companies", categorySlug: "account",
    time: "3 min", updatedAt: "July 18, 2026",
    content: [
      { type:"intro", text:"Assign different access levels to users for each branch — so employees only see the locations they work with." },
      { type:"warning", text:"This is currently available for Retail businesses only, under **Branch Users**, not a general Settings menu." },
      { type:"step", step:1, text:"Go to **Branch Users** in the sidebar." },
      { type:"step", step:2, text:"Select the user and enable access to the required branches." },
      { type:"step", step:3, text:"Save permissions and verify that the user can only switch to allowed branches." },
    ],
    related: [
      { title:"Add a new branch / location", slug:"add-branch", category:"Multi-Branch & Companies", categorySlug:"account" },
      { title:"Multi-company setup", slug:"multi-company", category:"Multi-Branch & Companies", categorySlug:"account" },
    ],
  },

  "multi-company": {
    title: "Multi-company setup",
    category: "Multi-Branch & Companies", categorySlug: "account",
    time: "2 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"Every plan covers one company. There's no self-service \"Add Company\" flow yet." },
      { type:"para", text:"If you need to run a genuinely separate legal entity — its own ledger, invoices and reports, not just another branch — contact support and we'll set it up for you." },
      { type:"tip", text:"If what you actually need is separate tracking within the same legal entity (a second location, a different city), that's branches, not a second company — see the guide on adding a branch instead." },
    ],
    related: [
      { title:"Switching between companies", slug:"switch-company", category:"Multi-Branch & Companies", categorySlug:"account" },
      { title:"Consolidated P&L report", slug:"consolidated-pl", category:"Multi-Branch & Companies", categorySlug:"account" },
    ],
  },

  "switch-company": {
    title: "Switching between companies",
    category: "Multi-Branch & Companies", categorySlug: "account",
    time: "1 min", updatedAt: "September 25, 2026",
    content: [
      { type:"intro", text:"There's no in-app company switcher yet." },
      { type:"para", text:"If support has set up more than one company for you, each one is reached by logging in with the account tied to it. See the multi-company guide for how a second company gets set up in the first place." },
    ],
    related: [
      { title:"Multi-company setup", slug:"multi-company", category:"Multi-Branch & Companies", categorySlug:"account" },
      { title:"Consolidated P&L report", slug:"consolidated-pl", category:"Multi-Branch & Companies", categorySlug:"account" },
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

  if (!article) notFound();

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#080c1e 0%,#0c0f2e 30%,#080c1e 100%)", color:"white", fontFamily:"'Outfit','DM Sans',sans-serif" }}>
      <style>{`
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
          <a href="https://mail.google.com/mail/?view=cm&fs=1&to=support@finovaos.app" className="hc-mail">
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
