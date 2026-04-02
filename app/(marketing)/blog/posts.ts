export type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  categoryLabel: string;
  color: string;
  author: string;
  authorRole: string;
  authorAvatar: string;
  authorGradient: string;
  date: string;
  readTime: string;
  content: unknown[];
};

export const ALL_POSTS: Record<string, BlogPost> = {
  "bank-reconciliation-guide": {
    id: "bank-reconciliation-guide",
    title: "The Complete Guide to Bank Reconciliation for SMEs in 2025",
    excerpt: "Bank reconciliation doesn't have to take days. Learn how modern businesses close their books in hours using automation, smart matching, and real-time data.",
    category: "accounting",
    categoryLabel: "Accounting Tips",
    color: "#818cf8",
    author: "Nadia Qureshi",
    authorRole: "Head of Finance",
    authorAvatar: "NQ",
    authorGradient: "linear-gradient(135deg,#be185d,#ec4899)",
    date: "March 10, 2025",
    readTime: "8 min read",
    content: [
      { type: "intro", text: "Bank reconciliation is one of the most important — and most dreaded — tasks in accounting. For many SMEs, it means hours of manually comparing spreadsheets, hunting down discrepancies, and hoping the numbers eventually match. But it doesn't have to be this way." },
      { type: "h2", text: "What is Bank Reconciliation?" },
      { type: "p", text: "Bank reconciliation is the process of comparing your internal financial records (your accounting software, ledger, or spreadsheets) with your bank statement to ensure they match. Any differences — called discrepancies — need to be investigated and resolved." },
      { type: "p", text: "A simple example: your records show a payment of $1,200 to a supplier on March 5th. But your bank statement shows $1,250 on March 6th. That $50 difference and 1-day gap needs to be explained — was it a bank fee? A timing difference? An error?" },
      { type: "h2", text: "Why Does It Matter?" },
      { type: "list", items: ["Catch fraud early — unauthorised transactions show up in reconciliation", "Identify errors before they compound — small mistakes become big problems", "Accurate cash position — know exactly how much cash you actually have", "Required for audits and tax filing — clean books prevent penalties", "Investor confidence — accurate financials are non-negotiable for funding"] },
      { type: "h2", text: "The Traditional Way (And Why It's Broken)" },
      { type: "p", text: "Most small businesses still reconcile manually: download a bank CSV, open the accounting software, compare line by line. A business processing 200 transactions a month spends 8–12 hours per month just on reconciliation. That's time that should be spent growing the business." },
      { type: "p", text: "Common manual reconciliation mistakes include missed transactions, wrong date matches, duplicate entries, and currency conversion errors for multi-currency businesses." },
      { type: "h2", text: "Auto-Reconciliation: How It Works" },
      { type: "p", text: "Modern accounting software like Finova automatically matches your bank transactions to your recorded entries using intelligent algorithms. Here's the process:" },
      { type: "numbered", items: ["Connect your bank account or import your bank statement (CSV/PDF supported)", "The system scans your existing transactions and attempts to match each bank entry", "Matched transactions are marked green — no action needed", "Unmatched or mismatched transactions are flagged for your review", "You review flagged items, add missing transactions, or correct errors", "Once all items are resolved, you mark the period as reconciled"] },
      { type: "h2", text: "Reconciliation Best Practices" },
      { type: "list", items: ["Reconcile monthly at minimum — weekly for high-volume businesses", "Never skip a month — gaps make the next reconciliation exponentially harder", "Keep a reconciliation log — document what you fixed and why", "Set up bank feeds — automatic daily import eliminates manual CSV downloads", "Investigate every discrepancy — no matter how small", "Use a checklist — consistency reduces errors"] },
      { type: "h2", text: "Common Discrepancies and How to Handle Them" },
      { type: "p", text: "Outstanding cheques: A cheque you've issued that hasn't cleared the bank yet. These appear in your books but not your bank statement. Note them and they'll clear in the next period." },
      { type: "p", text: "Bank charges: Fees charged by your bank (wire fees, service charges) that you haven't recorded. Add these to your books when you find them." },
      { type: "p", text: "Timing differences: Transactions that appear on different dates in your books vs. the bank. Usually resolves in the next period." },
      { type: "p", text: "Errors: Genuine mistakes — wrong amounts, duplicate entries, missing transactions. These must be corrected immediately." },
      { type: "h2", text: "How Finova Makes Reconciliation Effortless" },
      { type: "p", text: "Finova's bank reconciliation module automatically imports your bank transactions daily through bank feeds or CSV upload. Our matching engine uses amount, date, and reference number to match 85–95% of transactions automatically. What used to take a full day now takes 20 minutes." },
      { type: "quote", text: "We process 200+ invoices a day. Finova's reconciliation used to be our biggest headache. Now it's the first thing we tick off on Monday morning.", author: "Tariq Mahmood, CEO — Mahmood Trading Co." },
      { type: "h2", text: "Getting Started" },
      { type: "p", text: "If you're a Finova user, navigate to Banking → Reconciliation in your dashboard. Connect your bank account or upload your latest statement. The system does the rest. For new users, our 14-day free trial includes full access to bank reconciliation." },
    ],
  },

  "1": {
    id: "1",
    title: "How to Set Up Multi-Currency Invoicing for Your Global Business",
    excerpt: "Step-by-step guide to invoicing clients in 150+ currencies with automatic exchange rate updates.",
    category: "guides",
    categoryLabel: "How-to Guides",
    color: "#34d399",
    author: "Sara Malik",
    authorRole: "Chief Product Officer",
    authorAvatar: "SM",
    authorGradient: "linear-gradient(135deg,#059669,#34d399)",
    date: "March 8, 2025",
    readTime: "5 min read",
    content: [
      { type: "intro", text: "If you work with clients in multiple countries, you know the pain of currency conversion — wrong rates, manual calculations, and invoices that confuse clients. Multi-currency invoicing solves all of this automatically." },
      { type: "h2", text: "Why Multi-Currency Invoicing Matters" },
      { type: "p", text: "When you invoice a UK client in GBP, a UAE client in AED, and a US client in USD — and you need to report everything in PKR — the manual work is staggering. Exchange rates change daily. Errors are common. And your accounting can be a mess." },
      { type: "h2", text: "Step 1: Enable Multi-Currency in Finova" },
      { type: "p", text: "Go to Settings → Company → Currency. Select your base currency (the currency your books are kept in). Then enable 'Multi-currency invoicing'. You can add as many currencies as you need." },
      { type: "h2", text: "Step 2: Set Up Client Currencies" },
      { type: "p", text: "For each client, set their preferred currency in their contact profile. When you create an invoice for that client, Finova automatically uses their currency and applies the current exchange rate." },
      { type: "h2", text: "Step 3: Configure Exchange Rate Source" },
      { type: "p", text: "Finova fetches live exchange rates from the European Central Bank (ECB) daily. You can also manually set a rate if you've agreed a fixed rate with a client, or if you want to add a small margin." },
      { type: "h2", text: "Step 4: Invoice and Receive Payment" },
      { type: "p", text: "Create the invoice as normal. The client sees the amount in their currency. When payment arrives, Finova records both the foreign currency amount and the base currency equivalent at the rate on that day. Any exchange gain or loss is automatically posted to the correct account." },
      { type: "list", items: ["150+ currencies supported", "Live rates from ECB updated daily", "Manual rate override available", "Automatic gain/loss calculation", "Multi-currency balance sheet and P&L"] },
      { type: "quote", text: "We invoice clients in 8 different currencies. With Finova, it's as easy as invoicing in one.", author: "Omar F., CFO — Global Logistics Ltd." },
    ],
  },

  "2": {
    id: "2",
    title: "5 Signs Your Business Has Outgrown Spreadsheets",
    excerpt: "When Excel starts costing you more than it saves — and what to do about it.",
    category: "business",
    categoryLabel: "Business Growth",
    color: "#fbbf24",
    author: "Tariq Mirza",
    authorRole: "VP Sales",
    authorAvatar: "TM",
    authorGradient: "linear-gradient(135deg,#7c3aed,#a78bfa)",
    date: "March 6, 2025",
    readTime: "4 min read",
    content: [
      { type: "intro", text: "Spreadsheets are the duct tape of business finance. They work — until they don't. Here are five unmistakable signs that Excel is no longer good enough for your business." },
      { type: "h2", text: "Sign 1: You've Had a 'Spreadsheet Disaster'" },
      { type: "p", text: "Every business that relies on spreadsheets eventually has one: a formula that was wrong for 3 months, a file that got corrupted, a version conflict that meant two people were working on different data. If it hasn't happened to you yet — it will." },
      { type: "h2", text: "Sign 2: Month-End Takes More Than 2 Days" },
      { type: "p", text: "If closing your books requires manual data transfer between multiple spreadsheets, reconciling data from different sources, and chasing colleagues for their figures — you've outgrown spreadsheets. A modern accounting system should close in hours, not days." },
      { type: "h2", text: "Sign 3: You Have More Than 3 People Touching Financial Data" },
      { type: "p", text: "'What's our cash position right now?' 'Which customer owes us the most?' 'What was our profit margin last month?' If answering these questions requires digging through spreadsheets for 20 minutes, you're flying blind." },
      { type: "quote", text: "We waited too long to switch. The spreadsheet disaster cost us 3 weeks of work and nearly lost us a major client.", author: "Asim Rana, CEO — Rana Group" },
    ],
  },

  "3": {
    id: "3",
    title: "Finova Q1 2025 Product Recap",
    excerpt: "Everything we shipped in Q1 — multi-currency, HR module, custom plans, and 47 smaller improvements.",
    category: "product",
    categoryLabel: "Product Updates",
    color: "#a78bfa",
    author: "Product Team",
    authorRole: "Finova",
    authorAvatar: "FT",
    authorGradient: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    date: "March 2, 2025",
    readTime: "6 min read",
    content: [
      { type: "intro", text: "Q1 was packed. Here’s what we shipped: multi-currency invoicing, HR improvements, custom plans, and dozens of performance upgrades across the platform." },
      { type: "h2", text: "Highlights" },
      { type: "list", items: ["Multi-currency invoicing", "Custom plan builder", "Improved reconciliation matching", "Faster dashboards"] },
    ],
  },
};

export const RELATED_BY_CATEGORY: Record<string, string[]> = {
  accounting: ["bank-reconciliation-guide", "1", "2"],
  guides: ["1", "bank-reconciliation-guide", "2"],
  business: ["2", "1", "bank-reconciliation-guide"],
  product: ["3"],
};

export function getBlogPost(slug: string): BlogPost | undefined {
  return ALL_POSTS[slug];
}

export function getAllBlogPosts(): BlogPost[] {
  return Object.values(ALL_POSTS);
}

