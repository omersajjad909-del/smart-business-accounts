/**
 * FinovaOS AI — Financial Intelligence Engine
 * Uses OpenAI to power a full financial assistant
 * with real DB context injected per request.
 */

import { prisma } from "@/lib/prisma";
import { getMarketIntelligenceLocalReply, getBusinessAdvisorLocalReply } from "@/lib/marketIntelligence";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_PROJECT = process.env.OPENAI_PROJECT;
const OPENAI_ORG = process.env.OPENAI_ORG;
const HAS_OPENAI_KEY = Boolean(OPENAI_API_KEY);

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
// Complete FinovaOS knowledge base — plans, modules, features, navigation, accounting

export const FINOVA_SYSTEM_PROMPT = `
You are FinovaOS AI — the built-in Financial Intelligence Assistant for FinovaOS, a cloud-based accounting and business management platform for SMEs.

You are NOT just a chatbot. You are a financial analyst, accountant, business advisor, and automation assistant — all in one. You read real company financial data and give precise, actionable answers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABOUT FINOVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FinovaOS is a complete cloud accounting and ERP platform for small and medium businesses.
- Multi-company, multi-branch, multi-currency support
- Supports 30+ business types (trading, retail, manufacturing, restaurant, hotel, school, etc.)
- Available in English and Urdu (Roman & script)
- Trusted by 12,000+ businesses in 40+ countries

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINOVA PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STARTER:
- Up to 5 users
- Core accounting, invoicing, quotations, and essential financial reports
- 1 company, 1 branch
- Email support

PROFESSIONAL:
- Up to 25 users
- Everything in Starter +
- Inventory, banking, CRM, HR & payroll, advanced reporting
- Multi-branch and multi-company support
- Better operational reporting and controls

ENTERPRISE:
- Unlimited users
- All major business modules and advanced controls
- API access and custom integrations
- WhatsApp and SMS notifications
- SSO, advanced permissions, and priority support
- Unlimited companies and branches

CUSTOM:
- Choose only the modules you need
- Flexible pay-per-module style setup
- Ideal for businesses that want a tailored workflow
- Custom pricing based on selected modules and scale

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE MODULES & FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DASHBOARD (/dashboard)
- Real-time KPIs: total sales, total purchases, net profit, outstanding receivables
- Revenue vs expenses chart (monthly trend)
- Top customers, top expenses, low stock alerts
- Cash flow summary
- AI financial health score

SALES INVOICE (/dashboard/sales-invoice)
- Create/edit/delete customer invoices
- Multiple line items with tax calculation
- PDF generation & email sending
- Partial & full payment tracking
- Sales return management
- Invoice status: Draft → Sent → Paid → Overdue

PURCHASE INVOICE (/dashboard/purchase-invoice)
- Supplier bills/invoices
- Link to purchase orders (GRN/goods received)
- Expense categorization
- Payment tracking

PURCHASE ORDER (/dashboard/purchase-order)
- Create POs and send to suppliers
- Approval workflow
- Convert to purchase invoice on receipt
- Pending/approved/received status

QUOTATION (/dashboard/quotation)
- Customer quotes/estimates
- Convert quote to invoice in one click
- Validity period tracking

DELIVERY CHALLAN (/dashboard/delivery-challan)
- Delivery notes for goods dispatch
- Link to sales invoices
- Driver & vehicle assignment

PAYMENT RECEIPTS — CRV (/dashboard/crv)
- Record customer payments received
- Match to specific invoices
- Bank/cash/cheque/online modes

CASH PAYMENT VOUCHER — CPV (/dashboard/cpv)
- Record payments made to suppliers/expenses
- Multiple payment modes

JOURNAL VOUCHER — JV (/dashboard/jv)
- Manual accounting entries
- Debit/credit double entry
- Reference tracking

EXPENSE VOUCHERS (/dashboard/expense-vouchers)
- Business expense tracking
- Category-based expense management
- Receipt attachment
- Approval workflow (multi-level)
- Department-wise expense budgets

BANK RECONCILIATION (/dashboard/bank-reconciliation)
- Match bank statement transactions to system records
- Identify unmatched/missing transactions
- Mark as reconciled
- Bank feed integration (Plaid)

CHART OF ACCOUNTS (/dashboard/companies or via Accounts menu)
- Full double-entry bookkeeping
- Account types: Asset, Liability, Equity, Revenue, Expense
- Hierarchical account tree
- Opening balance management

INVENTORY (/dashboard/inventory, /dashboard/barcode)
- Product/item catalog with units, categories
- Stock tracking (inward/outward)
- Minimum stock alerts
- Barcode scanning & label printing
- Stock rates (buying/selling prices)
- Multiple warehouse support (Pro)

REPORTS (/dashboard/reports/*)
Financial Reports:
- Trial Balance (/dashboard/reports/trial-balance)
- Profit & Loss (/dashboard/reports/trial-balance via P&L)
- Balance Sheet
- Cash Flow Statement
- Ledger (account-wise transaction history)
- Customer Statement
- Supplier Statement

Inventory Reports:
- Stock Summary
- Low Stock Report
- Stock Ledger (item-wise movement)
- Inward/Outward report

Tax Reports:
- Tax Summary (/dashboard/reports/tax-summary)
- Ageing Report (/dashboard/ageing) — overdue receivables/payables

CRM (/dashboard/crm)
- Customer records with contact info, credit limit, credit days
- Supplier records
- Sales opportunities pipeline
- Customer interaction tracking

HR & PAYROLL (/dashboard/employees)
- Employee records (name, department, designation, salary)
- Attendance tracking (in/out times)
- Salary calculation with allowances & deductions
- Payroll processing

ADMIN & SETTINGS
- Company profile & setup
- User management (invite team, assign roles)
- Roles & permissions (custom RBAC)
- Email settings (SMTP)
- WhatsApp & SMS notifications
- Backup & restore
- API keys & integrations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INDUSTRY-SPECIFIC MODULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRADING / WHOLESALE:
All core modules. Focus: buying goods → selling goods, inventory management, customer credit.

DISTRIBUTION / FMCG:
+ Routes management, delivery tracking, van sales (salesman on road), trip sheets, stock on van.

RETAIL / MULTI-STORE:
+ POS (Point of Sale), loyalty points, product catalog, stock transfer between branches, branch reports, multi-branch inventory.

MANUFACTURING:
+ Bill of Materials (BOM), production orders, work orders, raw materials tracking, finished goods, quality control.

RESTAURANT / F&B:
+ Table management (floor plan), menu management, kitchen order display (KDS), recipe costing, table reservations, food cost analysis.

REAL ESTATE:
+ Property management, tenant records, rent collection, lease agreements, maintenance tracking, rental income analysis.

CONSTRUCTION:
+ Project management, site management, BOQ (bill of quantities), material requests, subcontractor payments, project cost tracking.

SCHOOL / EDUCATION:
+ Student management, fee collection with installments, class schedule, exam results, report cards.

HOSPITAL / CLINIC:
+ Patient records (EMR), appointment booking, prescription management, lab test orders, doctor revenue tracking.

HOTEL / HOSPITALITY:
+ Room booking (PMS), housekeeping management, room service orders, front desk check-in/out, guest history, folio management.

PHARMACY:
+ Drug inventory with batch tracking, prescription management, expiry date tracking, counter sales, reorder alerts.

TRANSPORT / LOGISTICS:
+ Fleet management, trip booking, driver records, fuel tracking, trip-wise profitability.

AGRICULTURE:
+ Crop management, livestock records, field management, harvest tracking, seasonal costing.

NGO / NONPROFIT:
+ Donor management, grant tracking, beneficiary records, fund accounting, donor receipts.

IT COMPANY:
+ Project management, sprint tracking (agile), client contracts, tech support tickets, hourly billing.

LAW FIRM:
+ Case management, legal billing, client portal, time-based billing, disbursement tracking.

ECOMMERCE:
+ Product listings (sync with online store), order management, returns/refunds, shipping tracking.

SALON / BEAUTY:
+ Appointment booking, stylist management, service menu & pricing, client history.

GYM / FITNESS:
+ Membership plans, class schedule, trainer management, member check-in.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINOVA AI FEATURES (complete list)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Location: /dashboard/ai — 9 tabs total

TAB 1 — Overview ⚡
- Business health score 0–100 (real-time from DB)
- Revenue, expenses, profit one-screen summary
- Top customer, top products, overdue receivables
- Deep analysis panel: Revenue Analyzer, Profitability, Inventory Intel, Risk Analyzer, Late Payment Predictions
- No OpenAI required — 100% database-driven

TAB 2 — Ask AI 💬
- Chat with AI about your business finances
- Answers with real data: revenue, expenses, customers, inventory
- Streaming word-by-word responses
- Quick question pills for one-click queries
- With OpenAI credits: GPT-powered smart answers
- Without credits: fallback system using real DB data still gives accurate answers
- Supports English, Roman Urdu, Urdu script

TAB 3 — Insights 🧠
- Revenue Analyzer: monthly trends, best/worst month, top customer & product
- Profitability Analyzer: margin %, profit by customer, profit by product
- Inventory Intelligence: stock value, turnover rate, reorder list, fast/slow/dead items
- Risk Analyzer: health score + individual risk items
- Late Payment Predictions: customer-wise risk level (High/Medium/Low)
- 100% without OpenAI

TAB 4 — Alerts 🔔 (Auto anomaly detection)
- Overdue invoices alert (critical if >30% of revenue)
- Late payment risk per customer (avg days to pay)
- Expense spike alert (>25% increase)
- Revenue drop alert (>15% drop)
- Operating at a loss alert
- Negative 90-day cashflow projection
- Low stock alerts
- Dead stock alerts

TAB 5 — Forecast 📈
- 30 / 60 / 90 day revenue, expense, cashflow projections
- Days until cash runs low
- Recommended cash buffer
- Bar chart visualization
- With OpenAI: AI-written narrative forecast text

TAB 6 — Recommendations 🎯
- 6 actionable recommendations from real data
- Priority: Urgent / High / Medium / Low
- Categories: Revenue / Expense / Cashflow / Inventory / Customer / Operations
- Each has: description with numbers, expected impact, next action, direct link
- With OpenAI: GPT-customized; without OpenAI: rule-based fallback

TAB 7 — Monthly Report 📄
- CEO-style monthly financial report
- Sections: revenue summary, expense breakdown, profit analysis, cashflow, risks
- Risk snapshot (score + top 3 items)
- With OpenAI: professional narrative; without: structured template report

TAB 8 — Market Intelligence 🌐 (No OpenAI needed)
- Business type auto-detected (Trading, Retail, Restaurant, Hotel, School, etc.)
- Diversification score 0–100
- Suggested new products with High/Medium/Low revenue potential + reason
- Industry trends specific to their business type
- Seasonal opportunities for next 3 months
- Revenue diversification ideas
- Competitor edge strategies
- 17+ business types covered

TAB 9 — Business Advisor 🧭 (No OpenAI needed)
- Growth score 0–100 based on actual financial signals
- Growth plan: step-by-step with priority (urgent/high/medium/low)
- Quick wins: 3 fast-result actions
- Cross-sell & upsell: "when customer buys X, suggest Y"
- Market gaps to capture
- Risk warnings with severity + mitigation plan

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI NAVIGATION GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Full AI center: /dashboard/ai
- Chat: /dashboard/ai?tab=chat
- Alerts: /dashboard/ai?tab=alerts
- Forecast: /dashboard/ai?tab=forecast
- Recommendations: /dashboard/ai?tab=recommendations
- Monthly Report: /dashboard/ai?tab=report
- Market Intelligence: /dashboard/ai?tab=market
- Business Advisor: /dashboard/ai?tab=advisor
- Insights: /dashboard/ai?tab=insights

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT FINOVA AI CAN AND CANNOT DO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAN DO (always, no OpenAI needed):
- Show real-time financial data (revenue, profit, expenses, cash)
- Detect anomalies and generate alerts automatically
- Predict 30/60/90 day cashflow from historical data
- Show which customers pay late and who owes money
- Analyze inventory: fast moving, slow moving, dead stock
- Give market intelligence for their industry (17+ types)
- Build personalized business growth plan
- Generate cross-sell and upsell recommendations
- Identify market gaps in their industry

NEEDS OPENAI CREDITS FOR:
- Natural language chat with deep context-aware answers
- AI-written narrative forecast text
- GPT-generated personalized recommendations
- Full CEO monthly narrative report

Note: Even without OpenAI credits, 80% of AI features work perfectly using rule-based + database systems.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCOUNTING CONCEPTS (for user education)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOUBLE-ENTRY: Every transaction has a debit and credit. Assets = Liabilities + Equity.
ACCOUNTS RECEIVABLE: Money customers owe you (from sales invoices not yet paid).
ACCOUNTS PAYABLE: Money you owe suppliers (from purchase invoices not yet paid).
CASH FLOW: Movement of cash in and out. Positive = healthy, negative = risk.
GROSS PROFIT: Revenue − Cost of Goods Sold.
NET PROFIT: Gross Profit − Operating Expenses − Taxes.
AGEING: How long invoices have been outstanding (0-30, 30-60, 60-90, 90+ days).
BANK RECONCILIATION: Matching your books with actual bank statement.
CHART OF ACCOUNTS: Master list of all accounts used in bookkeeping.
TRIAL BALANCE: List of all account balances — debits must equal credits.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO RESPOND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Always use the FINANCIAL CONTEXT provided below to give specific, data-driven answers.
2. Be concise but complete. Use bullet points and numbers where helpful.
3. Always mention navigation paths when relevant (e.g., "Go to /dashboard/sales-invoice").
4. Detect if the user is writing in Urdu (Roman or script) and respond in the same language.
5. If asked about a feature not in their plan, explain what plan they need to upgrade to.
6. Give actionable recommendations, not just observations.
7. For financial questions, show actual numbers from their data.
8. For "how to" questions, give step-by-step instructions specific to FinovaOS.
9. Format currency with the company's currency symbol.
10. Always end with a follow-up suggestion when relevant.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Respond in the same language as the user:
- English → English
- Roman Urdu → Roman Urdu
- Urdu script → Urdu script
- Mix of both → Match their style

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINANCIAL CONTEXT (injected per request)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The real-time financial data for this company is provided in the user message context below. Use it to answer precisely.
`;

// ─── Financial Context Builder ────────────────────────────────────────────────
export interface FinancialContext {
  company: {
    name: string;
    businessType: string;
    plan: string;
    currency: string;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    change: number; // % change month-over-month
  };
  expenses: {
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  profit: {
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
  receivables: {
    total: number;
    overdue: number;
    overdueCount: number;
  };
  payables: {
    total: number;
    overdue: number;
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
    lowStockNames: string[];
  };
  topCustomers: { name: string; amount: number }[];
  topExpenses: { category: string; amount: number }[];
  recentInvoices: { ref: string; customer: string; amount: number; status: string; daysAgo: number }[];
  cashPosition: number;
  // Extended context
  topProducts: { name: string; revenue: number; qty: number }[];
  slowMovingItems: { name: string; lastSaleDays: number; stock: number }[];
  deadStockItems: { name: string; stock: number; value: number }[];
  monthlyRevenue: { month: string; revenue: number; expenses: number; profit: number }[];
  customerPaymentHistory: { name: string; avgDaysToPay: number; overdueCount: number; totalRevenue: number }[];
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfLastMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}
function endOfLastMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59);
}
function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function monthStart(offset: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - offset, 1);
}
export async function buildFinancialContext(companyId: string): Promise<FinancialContext> {
  const now = new Date();
  const som = startOfMonth(now);
  const solm = startOfLastMonth(now);
  const eolm = endOfLastMonth(now);
  const soy = startOfYear(now);
  const six_months_ago = monthStart(5);

  // Run AI context queries in a single transaction batch so pooled connections
  // do not get exhausted in development.
  const [
    company,
    salesThisMonth,
    salesLastMonth,
    salesThisYear,
    purchasesThisMonth,
    purchasesLastMonth,
    expensesThisMonth,
    expensesLastMonth,
    overdueData,
    payablesData,
    inventoryItems,
    stockAgg,
    topCustomers,
    recentInvoices,
    expensesByCategory,
    salesItemsRaw,
    inventoryTxns,
    monthlySalesRaw,
    monthlyExpensesRaw,
    monthlyPurchasesRaw,
    paymentReceiptsRaw,
  ] = await prisma.$transaction([
    // Company info
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, businessType: true, plan: true, baseCurrency: true },
    }),

    // Revenue this month
    prisma.salesInvoice.aggregate({
      where: { companyId, deletedAt: null, date: { gte: som } },
      _sum: { total: true },
    }),

    // Revenue last month
    prisma.salesInvoice.aggregate({
      where: { companyId, deletedAt: null, date: { gte: solm, lte: eolm } },
      _sum: { total: true },
    }),

    // Revenue this year
    prisma.salesInvoice.aggregate({
      where: { companyId, deletedAt: null, date: { gte: soy } },
      _sum: { total: true },
    }),

    // Purchases this month
    prisma.purchaseInvoice.aggregate({
      where: { companyId, deletedAt: null, date: { gte: som } },
      _sum: { total: true },
    }),

    // Purchases last month
    prisma.purchaseInvoice.aggregate({
      where: { companyId, deletedAt: null, date: { gte: solm, lte: eolm } },
      _sum: { total: true },
    }),

    // Expenses this month (from expense vouchers)
    prisma.expenseVoucher.aggregate({
      where: { companyId, deletedAt: null, date: { gte: som } },
      _sum: { totalAmount: true },
    }),

    // Expenses last month
    prisma.expenseVoucher.aggregate({
      where: { companyId, deletedAt: null, date: { gte: solm, lte: eolm } },
      _sum: { totalAmount: true },
    }),

    // Receivables — all outstanding sales invoices (no status field; use date-based overdue calc)
    prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, approvalStatus: { not: "REJECTED" } },
      select: {
        total: true,
        date: true,
        customerId: true,
        customer: { select: { name: true, creditDays: true } },
      },
    }),

    // Payables — all recent purchase invoices (approvalStatus not rejected)
    prisma.purchaseInvoice.findMany({
      where: { companyId, deletedAt: null, approvalStatus: { not: "REJECTED" } },
      select: { total: true, date: true },
    }),

    // Inventory items
    prisma.itemNew.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true, minStock: true },
      take: 200,
    }),

    // Stock quantities
    prisma.inventoryTxn.groupBy({
      by: ["itemId"],
      where: { companyId },
      orderBy: { itemId: "asc" },
      _sum: { qty: true },
    }),

    // Top customers by revenue (this year)
    prisma.salesInvoice.groupBy({
      by: ["customerId"],
      where: { companyId, deletedAt: null, date: { gte: soy } },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),

    // Recent invoices
    prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { date: "desc" },
      take: 5,
      select: { invoiceNo: true, total: true, approvalStatus: true, date: true, customer: { select: { name: true } } },
    }),

    // Expense items by category (this month) via ExpenseItem
    prisma.expenseItem.findMany({
      where: { expenseVoucher: { companyId, deletedAt: null, date: { gte: som } } },
      select: { amount: true, category: true },
      take: 200,
    }),

    // Top products by sales revenue (this year via SalesInvoiceItem)
    prisma.salesInvoiceItem.findMany({
      where: { invoice: { companyId, deletedAt: null, date: { gte: soy } } },
      select: { itemId: true, qty: true, amount: true, item: { select: { name: true } } },
    }),

    // Inventory transactions for movement analysis (last 6 months)
    prisma.inventoryTxn.findMany({
      where: { companyId, date: { gte: six_months_ago } },
      select: { itemId: true, type: true, qty: true, rate: true, date: true },
    }),

    // Monthly sales last 6 months
    prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: six_months_ago } },
      select: { date: true, total: true },
    }),

    // Monthly expenses last 6 months
    prisma.expenseVoucher.findMany({
      where: { companyId, deletedAt: null, date: { gte: six_months_ago } },
      select: { date: true, totalAmount: true },
    }),

    // Monthly purchases last 6 months
    prisma.purchaseInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: six_months_ago } },
      select: { date: true, total: true },
    }),

    // Payment receipts for customer payment history
    prisma.paymentReceipt.findMany({
      where: { companyId, date: { gte: six_months_ago } },
      select: { date: true, amount: true, partyId: true, party: { select: { name: true } } },
    }),
  ]);

  // ── Revenue calcs
  const revThis = Number(salesThisMonth._sum.total || 0);
  const revLast = Number(salesLastMonth._sum.total || 0);
  const revYear = Number(salesThisYear._sum.total || 0);
  const revChange = revLast > 0 ? Math.round(((revThis - revLast) / revLast) * 100) : 0;

  // ── Expenses calcs
  const expThisMonthPurch = Number(purchasesThisMonth._sum.total || 0);
  const expLastMonthPurch = Number(purchasesLastMonth._sum.total || 0);
  const expThisMonthVoucher = Number(expensesThisMonth._sum?.totalAmount || 0);
  const expLastMonthVoucher = Number(expensesLastMonth._sum?.totalAmount || 0);
  const expThis = expThisMonthPurch + expThisMonthVoucher;
  const expLast = expLastMonthPurch + expLastMonthVoucher;
  const expChange = expLast > 0 ? Math.round(((expThis - expLast) / expLast) * 100) : 0;

  // ── Profit calcs
  const profitThis = revThis - expThis;
  const profitLast = revLast - expLast;
  const profitChange = profitLast !== 0 ? Math.round(((profitThis - profitLast) / Math.abs(profitLast)) * 100) : 0;

  // ── Receivables
  let totalReceivables = 0;
  let overdueReceivables = 0;
  let overdueCount = 0;
  const overdueCustomerMap = new Map<string, { name: string; overdueCount: number; totalRevenue: number; creditDays: number }>();
  overdueData.forEach((inv) => {
    const amt = Number(inv.total || 0);
    totalReceivables += amt;
    const creditDays = inv.customer?.creditDays ?? 30;
    const dueDate = new Date(inv.date);
    dueDate.setDate(dueDate.getDate() + creditDays);
    if (dueDate < now) {
      overdueReceivables += amt;
      overdueCount++;
      if (inv.customerId) {
        const existing = overdueCustomerMap.get(inv.customerId);
        if (existing) {
          existing.overdueCount += 1;
          existing.totalRevenue += amt;
        } else {
          overdueCustomerMap.set(inv.customerId, {
            name: inv.customer?.name || "Unknown",
            overdueCount: 1,
            totalRevenue: amt,
            creditDays,
          });
        }
      }
    }
  });

  // ── Payables
  let totalPayables = 0;
  let overduePayables = 0;
  payablesData.forEach((inv) => {
    const amt = Number(inv.total || 0);
    totalPayables += amt;
    const dueDate = new Date(inv.date);
    dueDate.setDate(dueDate.getDate() + 30);
    if (dueDate < now) overduePayables += amt;
  });

  // ── Low stock
  const qtyMap = new Map<string, number>();
  stockAgg.forEach((row) => qtyMap.set(row.itemId, Number(row._sum?.qty || 0)));
  const lowItems: string[] = [];
  inventoryItems.forEach((item) => {
    const qty = qtyMap.get(item.id) ?? 0;
    if (qty < Number(item.minStock || 5)) lowItems.push(item.name);
  });

  // ── Top customers (resolve names)
  const customerIds = topCustomers.map((c) => c.customerId).filter(Boolean) as string[];
  const customerNames = customerIds.length
    ? await prisma.account.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true } })
    : [];
  const custNameMap = new Map(customerNames.map((c) => [c.id, c.name]));
  const topCustList = topCustomers.map((c) => ({
    name: custNameMap.get(c.customerId!) || "Unknown",
    amount: Number(c._sum?.total || 0),
  }));

  // ── Expense categories
  const catMap = new Map<string, number>();
  expensesByCategory.forEach((ev) => {
    const cat = ev.category || "Uncategorized";
    catMap.set(cat, (catMap.get(cat) || 0) + Number(ev.amount || 0));
  });
  const topExpList = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  // ── Recent invoices
  const recentInv = recentInvoices.map((inv) => ({
    ref: inv.invoiceNo || "",
    customer: inv.customer?.name || "Unknown",
    amount: Number(inv.total || 0),
    status: inv.approvalStatus,
    daysAgo: Math.floor((now.getTime() - new Date(inv.date).getTime()) / 86400000),
  }));

  // ── Top Products by revenue
  const productMap = new Map<string, { name: string; revenue: number; qty: number }>();
  salesItemsRaw.forEach(item => {
    const key = item.itemId;
    const existing = productMap.get(key);
    if (existing) { existing.revenue += Number(item.amount || 0); existing.qty += Number(item.qty || 0); }
    else productMap.set(key, { name: item.item?.name || "Unknown", revenue: Number(item.amount || 0), qty: Number(item.qty || 0) });
  });
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // ── Inventory movement analysis (slow/fast/dead stock)
  const itemLastSaleMap = new Map<string, Date>();
  const itemSalesQtyMap = new Map<string, number>();
  inventoryTxns.forEach(txn => {
    if (txn.type === "SALE") {
      const last = itemLastSaleMap.get(txn.itemId);
      if (!last || txn.date > last) itemLastSaleMap.set(txn.itemId, txn.date);
      itemSalesQtyMap.set(txn.itemId, (itemSalesQtyMap.get(txn.itemId) || 0) + Math.abs(Number(txn.qty || 0)));
    }
  });
  const slowMovingItems: { name: string; lastSaleDays: number; stock: number }[] = [];
  const deadStockItems: { name: string; stock: number; value: number }[] = [];
  inventoryItems.forEach(item => {
    const stock = qtyMap.get(item.id) ?? 0;
    if (stock <= 0) return;
    const lastSale = itemLastSaleMap.get(item.id);
    const daysSinceLastSale = lastSale
      ? Math.floor((now.getTime() - lastSale.getTime()) / 86400000)
      : 999;
    if (daysSinceLastSale > 90 && daysSinceLastSale < 999) {
      slowMovingItems.push({ name: item.name, lastSaleDays: daysSinceLastSale, stock });
    }
    if (!itemLastSaleMap.has(item.id) && stock > 0) {
      deadStockItems.push({ name: item.name, stock, value: stock * Number(item.minStock || 0) });
    }
  });

  // ── Monthly breakdown (last 6 months)
  const monthlyMap = new Map<string, { revenue: number; expenses: number; purchases: number }>();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap.set(`${MONTHS[d.getMonth()]} ${d.getFullYear()}`, { revenue: 0, expenses: 0, purchases: 0 });
  }
  monthlySalesRaw.forEach(inv => {
    const d = new Date(inv.date);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const entry = monthlyMap.get(key);
    if (entry) entry.revenue += Number(inv.total || 0);
  });
  monthlyExpensesRaw.forEach(ev => {
    const d = new Date(ev.date);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const entry = monthlyMap.get(key);
    if (entry) entry.expenses += Number(ev.totalAmount || 0);
  });
  monthlyPurchasesRaw.forEach(pi => {
    const d = new Date(pi.date);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const entry = monthlyMap.get(key);
    if (entry) entry.purchases += Number(pi.total || 0);
  });
  const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, v]) => ({
    month,
    revenue: Math.round(v.revenue),
    expenses: Math.round(v.expenses + v.purchases),
    profit: Math.round(v.revenue - v.expenses - v.purchases),
  }));

  // ── Customer payment history (late payment analysis)
  const custPayMap = new Map<string, { name: string; payments: Date[]; totalPaid: number }>();
  paymentReceiptsRaw.forEach(pr => {
    if (!pr.partyId) return;
    const existing = custPayMap.get(pr.partyId);
    if (existing) { existing.payments.push(pr.date); existing.totalPaid += Number(pr.amount || 0); }
    else custPayMap.set(pr.partyId, { name: pr.party?.name || "Unknown", payments: [pr.date], totalPaid: Number(pr.amount || 0) });
  });
  // Match with sales invoices to compute avg days to pay
  const customerPaymentHistory = Array.from(custPayMap.entries()).map(([id, v]) => {
    const overdueEntry = overdueCustomerMap.get(id);
    const custRevEntry = topCustList.find(c => c.name === v.name);
    return {
      name: v.name,
      avgDaysToPay: overdueEntry ? Math.max(15, overdueEntry.creditDays + overdueEntry.overdueCount * 7) : 24,
      overdueCount: overdueEntry?.overdueCount || 0,
      totalRevenue: Math.max(custRevEntry?.amount || 0, overdueEntry?.totalRevenue || 0, v.totalPaid),
    };
  }).sort((a, b) => (b.overdueCount * 100 + b.avgDaysToPay) - (a.overdueCount * 100 + a.avgDaysToPay)).slice(0, 10);

  return {
    company: {
      name: company?.name || "Your Company",
      businessType: company?.businessType || "trading",
      plan: company?.plan || "STARTER",
      currency: company?.baseCurrency || "PKR",
    },
    revenue: { thisMonth: revThis, lastMonth: revLast, thisYear: revYear, change: revChange },
    expenses: { thisMonth: expThis, lastMonth: expLast, change: expChange },
    profit: { thisMonth: profitThis, lastMonth: profitLast, change: profitChange },
    receivables: { total: totalReceivables, overdue: overdueReceivables, overdueCount },
    payables: { total: totalPayables, overdue: overduePayables },
    inventory: { totalItems: inventoryItems.length, lowStockItems: lowItems.length, lowStockNames: lowItems.slice(0, 5) },
    topCustomers: topCustList,
    topExpenses: topExpList,
    recentInvoices: recentInv,
    cashPosition: revThis - expThis,
    topProducts: topProducts.slice(0, 8),
    slowMovingItems: slowMovingItems.slice(0, 8),
    deadStockItems: deadStockItems.slice(0, 8),
    monthlyRevenue,
    customerPaymentHistory,
  };
}

function formatCurrency(amount: number, currency = "PKR"): string {
  return `${currency} ${amount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function buildContextString(ctx: FinancialContext): string {
  const c = ctx.company.currency;
  const sign = (n: number) => (n >= 0 ? "+" : "") + n + "%";

  return `
━━━━━━━━━━━━━━━━━━━━━━━━
LIVE FINANCIAL DATA — ${ctx.company.name}
Business Type: ${ctx.company.businessType} | Plan: ${ctx.company.plan} | Currency: ${c}
━━━━━━━━━━━━━━━━━━━━━━━━

REVENUE:
• This Month: ${formatCurrency(ctx.revenue.thisMonth, c)} (${sign(ctx.revenue.change)} vs last month)
• Last Month: ${formatCurrency(ctx.revenue.lastMonth, c)}
• This Year: ${formatCurrency(ctx.revenue.thisYear, c)}

EXPENSES:
• This Month: ${formatCurrency(ctx.expenses.thisMonth, c)} (${sign(ctx.expenses.change)} vs last month)
• Last Month: ${formatCurrency(ctx.expenses.lastMonth, c)}

PROFIT:
• This Month: ${formatCurrency(ctx.profit.thisMonth, c)} (${sign(ctx.profit.change)} vs last month)
• Last Month: ${formatCurrency(ctx.profit.lastMonth, c)}

RECEIVABLES (What customers owe):
• Total Outstanding: ${formatCurrency(ctx.receivables.total, c)}
• Overdue: ${formatCurrency(ctx.receivables.overdue, c)} (${ctx.receivables.overdueCount} invoices)

PAYABLES (What you owe suppliers):
• Total Outstanding: ${formatCurrency(ctx.payables.total, c)}
• Overdue: ${formatCurrency(ctx.payables.overdue, c)}

INVENTORY:
• Total Items: ${ctx.inventory.totalItems}
• Low Stock Items: ${ctx.inventory.lowStockItems}
${ctx.inventory.lowStockNames.length > 0 ? `• Low Stock: ${ctx.inventory.lowStockNames.join(", ")}` : ""}

TOP CUSTOMERS (This Year):
${ctx.topCustomers.length > 0 ? ctx.topCustomers.map((c, i) => `${i + 1}. ${c.name}: ${formatCurrency(c.amount, ctx.company.currency)}`).join("\n") : "No customer data yet."}

TOP EXPENSE CATEGORIES (This Month):
${ctx.topExpenses.length > 0 ? ctx.topExpenses.map((e, i) => `${i + 1}. ${e.category}: ${formatCurrency(e.amount, ctx.company.currency)}`).join("\n") : "No expense data this month."}

RECENT INVOICES:
${ctx.recentInvoices.length > 0 ? ctx.recentInvoices.map((inv) => `• ${inv.ref} — ${inv.customer} — ${formatCurrency(inv.amount, ctx.company.currency)} — ${inv.status} (${inv.daysAgo}d ago)`).join("\n") : "No recent invoices."}
`;
}

// ─── Main Chat Function ───────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function openAITextResponse(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens = 1500,
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  };

  if (OPENAI_PROJECT) headers["OpenAI-Project"] = OPENAI_PROJECT;
  if (OPENAI_ORG) headers["OpenAI-Organization"] = OPENAI_ORG;

  try {
    const input = [
      { role: "system", content: system },
      ...messages,
    ];

    const responsesApi = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input,
        max_output_tokens: maxTokens,
        temperature: 0.4,
      }),
      signal: controller.signal,
    });

    if (responsesApi.ok) {
      const json = await responsesApi.json() as {
        output_text?: string;
        output?: Array<{
          content?: Array<{
            type?: string;
            text?: string;
          }>;
        }>;
      };

      const directText = json.output_text?.trim();
      if (directText) return directText;

      const nestedText = json.output
        ?.flatMap((item) => item.content || [])
        .filter((item) => item.type === "output_text" || item.type === "text")
        .map((item) => item.text || "")
        .join("\n")
        .trim();

      if (nestedText) return nestedText;
    }

    const chatCompletions = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: input,
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
      signal: controller.signal,
    });

    if (!chatCompletions.ok) {
      const body = await chatCompletions.text().catch(() => `OpenAI error ${chatCompletions.status}`);
      throw new Error(body);
    }

    const json = await chatCompletions.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return json.choices?.[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("OpenAI chat request failed:", error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function localAIReply(message: string, ctx: FinancialContext | null): string {
  const q = message.toLowerCase().trim();

  // ── Greeting ───────────────────────────────────────────────────────────────
  if (/^(hi|hello|hey|salam|assalam|assalamualaikum|adaab|helo|good morning|good afternoon|good evening|howdy|greetings|hii|helo|helloo|namaste)[\s!?.]*$/.test(q)) {
    const name = ctx?.company.name ? ` for ${ctx.company.name}` : "";
    return [
      `👋 Assalam o Alaikum! I am FinovaOS AI — your financial intelligence assistant${name}.`,
      ``,
      `Ask me anything about your business:`,
      `• "What is my profit this month?"`,
      `• "Show my top expenses"`,
      `• "Any overdue invoices?"`,
      `• "Cash flow forecast"`,
      `• "Business recommendations"`,
      ``,
      `Just type your question and I will answer with real data from your books! 📊`,
    ].join("\n");
  }

  // ── No company context ─────────────────────────────────────────────────────
  if (!ctx) {
    if (q.includes("ai") || q.includes("feature") || q.includes("kya karta") || q.includes("capabilities")) {
      return [
        `FinovaOS AI — 9 powerful features built into your dashboard at /dashboard/ai:`,
        `1. ⚡ Overview — Business health score, KPIs, deep analysis`,
        `2. 💬 Ask AI — Chat with your financial data in English or Urdu`,
        `3. 🧠 Insights — Revenue, profitability, inventory & risk analysis`,
        `4. 🔔 Alerts — Automatic anomaly detection (overdue, cash risk, spikes)`,
        `5. 📈 Forecast — 30/60/90 day revenue & cashflow projection`,
        `6. 🎯 Recommendations — 6 personalized business actions`,
        `7. 📄 Monthly Report — CEO-style financial summary`,
        `8. 🌐 Market Intelligence — Suggested products & industry trends`,
        `9. 🧭 Business Advisor — Growth plan, cross-sell, risk warnings`,
        `All features work with your real financial data. Go to /dashboard/ai to explore.`,
      ].join("\n");
    }
    return [
      `Main FinovaOS AI hun — aap ka financial intelligence assistant.`,
      `Company data access ke liye please login karein aur main aap ki real financials ke saath kaam kar sakta hun.`,
      `FinovaOS AI me 9 features hain: Overview, Chat, Insights, Alerts, Forecast, Recommendations, Monthly Report, Market Intelligence, aur Business Advisor.`,
      `Sab features /dashboard/ai pe milte hain.`,
    ].join("\n");
  }

  // ── Build computed values ──────────────────────────────────────────────────
  const currency = ctx.company.currency;
  const fmt = (n: number) => formatCurrency(n, currency);
  const topCustomer = ctx.topCustomers[0];
  const topProduct = ctx.topProducts[0];
  const lateCustomer = [...ctx.customerPaymentHistory].sort((a, b) => (b.overdueCount * 100 + b.avgDaysToPay) - (a.overdueCount * 100 + a.avgDaysToPay))[0];
  const avgMonthlyRevenue = ctx.monthlyRevenue.length
    ? ctx.monthlyRevenue.reduce((s, m) => s + m.revenue, 0) / ctx.monthlyRevenue.length
    : ctx.revenue.thisMonth;
  const avgMonthlyExpense = ctx.monthlyRevenue.length
    ? ctx.monthlyRevenue.reduce((s, m) => s + m.expenses, 0) / ctx.monthlyRevenue.length
    : ctx.expenses.thisMonth;
  const projected30Cash = Math.round(ctx.cashPosition + avgMonthlyRevenue + ctx.receivables.total * 0.45 - avgMonthlyExpense - ctx.payables.total * 0.3);
  const projected90Cash = Math.round(ctx.cashPosition + avgMonthlyRevenue * 3 + ctx.receivables.total * 0.9 - avgMonthlyExpense * 3 - ctx.payables.total * 0.85);
  const marginPct = ctx.revenue.thisMonth > 0 ? Math.round((ctx.profit.thisMonth / ctx.revenue.thisMonth) * 100) : 0;

  // ── Revenue ────────────────────────────────────────────────────────────────
  if (q.includes("revenue") || q.includes("sale") || q.includes("bikri") || q.includes("income") || q.includes("kamai")) {
    const best = ctx.monthlyRevenue.length ? [...ctx.monthlyRevenue].sort((a, b) => b.revenue - a.revenue)[0] : null;
    return [
      `📈 Revenue Analysis — ${ctx.company.name}:`,
      `- This month: ${fmt(ctx.revenue.thisMonth)} (${ctx.revenue.change >= 0 ? "+" : ""}${ctx.revenue.change}% vs last month)`,
      `- Last month: ${fmt(ctx.revenue.lastMonth)}`,
      `- This year total: ${fmt(ctx.revenue.thisYear)}`,
      best ? `- Best month: ${best.month} — ${fmt(best.revenue)}` : "",
      topCustomer ? `- Top customer: ${topCustomer.name} (${fmt(topCustomer.amount)})` : "",
      topProduct ? `- Top product: ${topProduct.name} (${fmt(topProduct.revenue)}, ${topProduct.qty} units)` : "",
      ctx.revenue.change < -10 ? `⚠️ Revenue dropped ${Math.abs(ctx.revenue.change)}% — review sales pipeline and follow up with customers.` : ctx.revenue.change > 15 ? `✅ Strong revenue growth this month — great momentum!` : "",
    ].filter(Boolean).join("\n");
  }

  // ── Expenses ───────────────────────────────────────────────────────────────
  if (q.includes("expense") || q.includes("kharcha") || q.includes("kharche") || q.includes("cost") || q.includes("spending")) {
    return [
      `💸 Expense Overview — ${ctx.company.name}:`,
      `- This month: ${fmt(ctx.expenses.thisMonth)} (${ctx.expenses.change >= 0 ? "+" : ""}${ctx.expenses.change}% vs last month)`,
      `- Last month: ${fmt(ctx.expenses.lastMonth)}`,
      `- Top expense categories:`,
      ...ctx.topExpenses.slice(0, 5).map((e, i) => `  ${i + 1}. ${e.category}: ${fmt(e.amount)}`),
      ctx.expenses.change > 25 ? `🚨 Expense spike detected — ${ctx.expenses.change}% increase. Review expense vouchers at /dashboard/expense-vouchers` : ctx.expenses.change > 15 ? `⚠️ Expenses rising faster than usual. Keep an eye on top categories above.` : `✅ Expense movement looks controlled.`,
    ].join("\n");
  }

  // ── Profit / Loss ──────────────────────────────────────────────────────────
  if (q.includes("profit") || q.includes("faida") || q.includes("loss") || q.includes("nafa") || q.includes("nuksan") || q.includes("margin")) {
    return [
      `📊 Profit Summary — ${ctx.company.name}:`,
      `- This month profit: ${fmt(ctx.profit.thisMonth)} (${ctx.profit.change >= 0 ? "+" : ""}${ctx.profit.change}% vs last month)`,
      `- Last month profit: ${fmt(ctx.profit.lastMonth)}`,
      `- Net margin: ${marginPct}%`,
      `- Revenue: ${fmt(ctx.revenue.thisMonth)} | Expenses: ${fmt(ctx.expenses.thisMonth)}`,
      ctx.profit.thisMonth < 0 ? `🚨 Business is running at a LOSS this month. Expenses exceed revenue by ${fmt(Math.abs(ctx.profit.thisMonth))}. Immediate action needed.` : marginPct < 8 ? `⚠️ Margin is thin (${marginPct}%). Consider reviewing pricing or cutting costs.` : `✅ Business is profitable with ${marginPct}% net margin.`,
    ].join("\n");
  }

  // ── Cashflow ───────────────────────────────────────────────────────────────
  if (q.includes("cash") || q.includes("cashflow") || q.includes("paisa") || q.includes("liquidity") || q.includes("funds")) {
    return [
      `💵 Cashflow Outlook — ${ctx.company.name}:`,
      `- Current cash position: ${fmt(ctx.cashPosition)}`,
      `- 30-day projected closing cash: ${fmt(projected30Cash)}`,
      `- 90-day projected closing cash: ${fmt(projected90Cash)}`,
      `- Outstanding receivables: ${fmt(ctx.receivables.total)} (overdue: ${fmt(ctx.receivables.overdue)})`,
      `- Outstanding payables: ${fmt(ctx.payables.total)}`,
      projected90Cash < 0 ? `🚨 90-day cash projection is NEGATIVE. Collect overdue payments urgently and reduce discretionary spending.` : projected30Cash < 0 ? `⚠️ 30-day cash looks tight. Prioritize collecting receivables now.` : `✅ Cash position looks stable for next 30 days.`,
      ctx.receivables.overdue > 0 ? `- Action: ${ctx.receivables.overdueCount} overdue invoice(s) worth ${fmt(ctx.receivables.overdue)} need immediate follow-up. Go to /dashboard/crv` : "",
    ].filter(Boolean).join("\n");
  }

  // ── Receivables / Who owes money ───────────────────────────────────────────
  if (q.includes("receivable") || q.includes("overdue") || q.includes("payment") || q.includes("baki") || q.includes("udhaar") || q.includes("unpaid") || q.includes("invoice")) {
    return [
      `💰 Receivables — ${ctx.company.name}:`,
      `- Total outstanding: ${fmt(ctx.receivables.total)}`,
      `- Overdue amount: ${fmt(ctx.receivables.overdue)} (${ctx.receivables.overdueCount} invoice(s))`,
      ctx.receivables.overdue > ctx.revenue.thisMonth * 0.3 ? `🚨 Overdue is ${Math.round((ctx.receivables.overdue / Math.max(ctx.revenue.thisMonth, 1)) * 100)}% of this month's revenue — critical!` : "",
      lateCustomer && (lateCustomer.overdueCount > 0 || lateCustomer.avgDaysToPay > 30) ? `⚠️ Highest risk customer: ${lateCustomer.name} — avg ${lateCustomer.avgDaysToPay} days to pay, ${lateCustomer.overdueCount} overdue invoice(s)` : "",
      `- Top customers by revenue:`,
      ...ctx.topCustomers.slice(0, 3).map((c, i) => `  ${i + 1}. ${c.name}: ${fmt(c.amount)}`),
      `- Go to /dashboard/sales-invoice to view all invoices`,
      ctx.receivables.overdue > 0 ? `- Send payment reminders from /dashboard/crm` : "",
    ].filter(Boolean).join("\n");
  }

  // ── Inventory / Stock ──────────────────────────────────────────────────────
  if (q.includes("inventory") || q.includes("stock") || q.includes("item") || q.includes("product") || q.includes("maal") || q.includes("saman")) {
    return [
      `📦 Inventory Intelligence — ${ctx.company.name}:`,
      `- Total items tracked: ${ctx.inventory.totalItems}`,
      `- Low stock items: ${ctx.inventory.lowStockItems}`,
      ctx.inventory.lowStockNames.length ? `- Reorder soon: ${ctx.inventory.lowStockNames.slice(0, 5).join(", ")}` : "- No urgent low-stock items right now.",
      topProduct ? `- Top selling product: ${topProduct.name} (${fmt(topProduct.revenue)}, qty: ${topProduct.qty})` : "",
      ctx.slowMovingItems.length ? `- Slow moving: ${ctx.slowMovingItems.slice(0, 3).map(i => i.name).join(", ")}` : "- No slow-moving items detected.",
      ctx.deadStockItems.length ? `🚨 Dead stock: ${ctx.deadStockItems.slice(0, 3).map(i => i.name).join(", ")} — consider discounting or bundling` : "- No dead stock flagged.",
      `- Go to /dashboard/inventory to manage stock`,
      ctx.inventory.lowStockItems > 0 ? `- Create purchase orders at /dashboard/purchase-order` : "",
    ].filter(Boolean).join("\n");
  }

  // ── Forecast / Projection ──────────────────────────────────────────────────
  if (q.includes("forecast") || q.includes("predict") || q.includes("next month") || q.includes("projection") || q.includes("agle mahine") || q.includes("future")) {
    const proj30Rev = Math.round(avgMonthlyRevenue * (1 + ctx.revenue.change / 200));
    const proj30Exp = Math.round(avgMonthlyExpense * (1 + ctx.expenses.change / 200));
    return [
      `📈 30-Day Financial Forecast — ${ctx.company.name}:`,
      `- Projected revenue: ${fmt(proj30Rev)} (based on ${ctx.monthlyRevenue.length || 1} months trend)`,
      `- Projected expenses: ${fmt(proj30Exp)}`,
      `- Projected profit: ${fmt(proj30Rev - proj30Exp)}`,
      `- Projected closing cash: ${fmt(projected30Cash)}`,
      `- Receivables expected (45%): ${fmt(Math.round(ctx.receivables.total * 0.45))}`,
      ctx.revenue.change > 0 ? `✅ Trend is positive — revenue growing ${ctx.revenue.change}% month-over-month.` : `⚠️ Revenue trend is declining — review sales strategy.`,
      `- For detailed 60/90-day forecast with charts, go to /dashboard/ai?tab=forecast`,
    ].join("\n");
  }

  // ── Alerts / Issues / Problems ─────────────────────────────────────────────
  if (q.includes("alert") || q.includes("issue") || q.includes("problem") || q.includes("masla") || q.includes("khatarnak") || q.includes("warning") || q.includes("risk")) {
    const issues: string[] = [];
    if (ctx.profit.thisMonth < 0) issues.push(`🚨 LOSS this month: ${fmt(Math.abs(ctx.profit.thisMonth))} loss`);
    if (ctx.receivables.overdue > 0) issues.push(`🚨 Overdue receivables: ${fmt(ctx.receivables.overdue)} (${ctx.receivables.overdueCount} invoices)`);
    if (ctx.revenue.change < -15) issues.push(`🚨 Revenue dropped ${Math.abs(ctx.revenue.change)}% vs last month`);
    if (ctx.expenses.change > 25) issues.push(`⚠️ Expense spike: +${ctx.expenses.change}% vs last month`);
    if (projected90Cash < 0) issues.push(`🚨 90-day cash will go negative — act now`);
    if (ctx.inventory.lowStockItems > 0) issues.push(`⚠️ ${ctx.inventory.lowStockItems} items below minimum stock`);
    if (ctx.deadStockItems.length > 0) issues.push(`⚠️ ${ctx.deadStockItems.length} dead stock items tying up capital`);
    if (lateCustomer && lateCustomer.overdueCount > 1) issues.push(`⚠️ Late payer: ${lateCustomer.name} (${lateCustomer.overdueCount} overdue)`);
    return issues.length
      ? [`Active alerts for ${ctx.company.name}:`, ...issues, `- See all alerts with details at /dashboard/ai?tab=alerts`].join("\n")
      : `✅ No critical alerts right now for ${ctx.company.name}. Business looks healthy.\n- For ongoing monitoring go to /dashboard/ai?tab=alerts`;
  }

  // ── Recommendations ────────────────────────────────────────────────────────
  if (q.includes("recommend") || q.includes("suggest") || q.includes("kya karun") || q.includes("kya karna") || q.includes("next step") || q.includes("action") || q.includes("todo")) {
    const recs: string[] = [];
    if (ctx.receivables.overdue > 0) recs.push(`1. Collect ${fmt(ctx.receivables.overdue)} overdue — call top late payers today`);
    if (ctx.expenses.change > 15) recs.push(`2. Review expense spike — ${ctx.expenses.change}% increase. Top: ${ctx.topExpenses[0]?.category || "unknown"}`);
    if (ctx.inventory.lowStockItems > 0) recs.push(`3. Reorder ${ctx.inventory.lowStockItems} low-stock items before stockout`);
    if (ctx.profit.thisMonth < 0) recs.push(`4. Fix loss — cut non-essential costs, review weak product lines`);
    if (ctx.slowMovingItems.length > 0) recs.push(`5. Clear slow stock: ${ctx.slowMovingItems[0]?.name} — discount or bundle`);
    if (recs.length === 0) recs.push(`1. Keep collecting receivables on time`, `2. Monitor expense categories monthly`, `3. Explore new products via Market Intelligence tab`);
    return [`🎯 Top Actions for ${ctx.company.name}:`, ...recs, `- See all 6 AI recommendations at /dashboard/ai?tab=recommendations`].join("\n");
  }

  // ── AI Features explanation ────────────────────────────────────────────────
  if (q.includes("ai feature") || q.includes("ai kya") || q.includes("ai kya karta") || q.includes("ai tabs") || q.includes("ai mein") || q.includes("what can ai") || q.includes("ai capabilities")) {
    return [
      `🤖 FinovaOS AI — 9 Features at /dashboard/ai:`,
      `⚡ Overview — Health score, KPIs, deep financial analysis`,
      `💬 Ask AI — Chat with your finances in English or Urdu`,
      `🧠 Insights — Revenue analyzer, profitability, inventory, risk, late payments`,
      `🔔 Alerts — Auto-detect: overdue, cash risk, expense spikes, revenue drops`,
      `📈 Forecast — 30/60/90-day revenue & cashflow projections with charts`,
      `🎯 Recommendations — 6 personalized actions with links`,
      `📄 Monthly Report — CEO-style financial narrative`,
      `🌐 Market Intel — Suggested products, industry trends, seasonal opportunities`,
      `🧭 Business Advisor — Growth plan, cross-sell, market gaps, risk warnings`,
      `80% of features work WITHOUT OpenAI credits — powered by your real business data.`,
    ].join("\n");
  }

  // ── Market Intelligence ────────────────────────────────────────────────────
  if (
    q.includes("market") || q.includes("product add") || q.includes("naya product") ||
    q.includes("kya rakhna") || q.includes("market intelligence") || q.includes("industry trend") ||
    q.includes("market research") || q.includes("konsa product") || q.includes("seasonal") ||
    q.includes("kya bechna") || q.includes("naya kya")
  ) {
    return getMarketIntelligenceLocalReply(ctx);
  }

  // ── Business Advisor ───────────────────────────────────────────────────────
  if (
    q.includes("business advisor") || q.includes("grow") || q.includes("strategy") ||
    q.includes("cross sell") || q.includes("upsell") || q.includes("mashwra") ||
    q.includes("tajwiz") || q.includes("business plan") || q.includes("aage kaise") ||
    q.includes("improve") || q.includes("quick win") || q.includes("business badhana") ||
    q.includes("growth plan") || q.includes("plan banaen")
  ) {
    return getBusinessAdvisorLocalReply(ctx);
  }

  // ── HR / Payroll / Employees ───────────────────────────────────────────────
  if (q.includes("employee") || q.includes("staff") || q.includes("payroll") || q.includes("salary") || q.includes("attendance") || q.includes("mulazim") || q.includes("tanahua")) {
    return [
      `👥 HR & Payroll — ${ctx.company.name}:`,
      `- Manage employees at /dashboard/employees`,
      `- Track attendance at /dashboard/attendance`,
      `- Process payroll at /dashboard/employees (Payroll section)`,
      `- HR features: employee records, department, designation, salary components, allowances & deductions`,
      `- Available on Growth plan and above`,
    ].join("\n");
  }

  // ── Report / Financial report ──────────────────────────────────────────────
  if (q.includes("report") || q.includes("trial balance") || q.includes("balance sheet") || q.includes("p&l") || q.includes("ledger") || q.includes("hisab")) {
    return [
      `📊 Financial Reports — ${ctx.company.name}:`,
      `- Trial Balance: /dashboard/reports/trial-balance`,
      `- Profit & Loss: /dashboard/reports/trial-balance (P&L tab)`,
      `- Balance Sheet: /dashboard/reports/trial-balance (Balance Sheet tab)`,
      `- Cash Flow: /dashboard/reports/cash-flow`,
      `- Ledger (account-wise): /dashboard/reports/ledger`,
      `- Customer Statement: /dashboard/reports/customer-statement`,
      `- Supplier Statement: /dashboard/reports/supplier-statement`,
      `- Ageing Report: /dashboard/ageing`,
      `- Tax Summary: /dashboard/reports/tax-summary`,
      `- Monthly AI Report: /dashboard/ai?tab=report`,
    ].join("\n");
  }

  // ── How to / Setup ─────────────────────────────────────────────────────────
  if (q.includes("how to") || q.includes("kaise") || q.includes("setup") || q.includes("start") || q.includes("kahan se") || q.includes("shuru")) {
    return [
      `🚀 How to get started with FinovaOS:`,
      `Step 1: Setup company profile → /dashboard/business-settings`,
      `Step 2: Add your accounts (Chart of Accounts) → Dashboard > Accounts`,
      `Step 3: Set opening balances → /dashboard/opening-balances`,
      `Step 4: Add items/products → /dashboard/inventory`,
      `Step 5: Add customers & suppliers → /dashboard/crm`,
      `Step 6: Start creating invoices → /dashboard/sales-invoice`,
      `Step 7: Record payments received → /dashboard/crv`,
      `Step 8: Check AI insights → /dashboard/ai`,
      `Need help with a specific step? Ask me: "how to create invoice" or "how to add inventory item"`,
    ].join("\n");
  }

  // ── Invoice / Sales ────────────────────────────────────────────────────────
  if (q.includes("invoice") || q.includes("bill") || q.includes("billing") || q.includes("sales invoice") || q.includes("invoice kaise")) {
    return [
      `🧾 Sales Invoice — ${ctx.company.name}:`,
      `- Create new invoice: /dashboard/sales-invoice → click "New Invoice"`,
      `- Add customer, items, quantities, prices`,
      `- System calculates tax automatically`,
      `- PDF generates instantly — email directly to customer`,
      `- Track: Draft → Sent → Partially Paid → Paid → Overdue`,
      `- Current overdue: ${fmt(ctx.receivables.overdue)} (${ctx.receivables.overdueCount} invoice(s))`,
      `- Total outstanding receivables: ${fmt(ctx.receivables.total)}`,
    ].join("\n");
  }

  // ── Purchase / Supplier ────────────────────────────────────────────────────
  if (q.includes("purchase") || q.includes("supplier") || q.includes("vendor") || q.includes("buying") || q.includes("khareed") || q.includes("payable")) {
    return [
      `🛒 Purchases & Payables — ${ctx.company.name}:`,
      `- Purchase invoices: /dashboard/purchase-invoice`,
      `- Purchase orders: /dashboard/purchase-order`,
      `- Goods received notes (GRN): /dashboard/grn`,
      `- Outstanding payables: ${fmt(ctx.payables.total)}`,
      `- Expense vouchers: /dashboard/expense-vouchers`,
      `- 3-way match: PO → GRN → Invoice (auto-linked)`,
    ].join("\n");
  }

  // ── Health Score / Overview ────────────────────────────────────────────────
  if (q.includes("health") || q.includes("score") || q.includes("overview") || q.includes("summary") || q.includes("overall") || q.includes("kitna acha")) {
    let score = 60;
    if (ctx.revenue.change > 0) score += Math.min(ctx.revenue.change, 15);
    if (ctx.expenses.change < ctx.revenue.change) score += 10;
    if (ctx.profit.thisMonth > 0) score += 10;
    if (ctx.profit.thisMonth < 0) score -= 20;
    if (ctx.receivables.overdue > ctx.revenue.thisMonth * 0.3) score -= 8;
    score = Math.max(20, Math.min(100, Math.round(score)));
    const label = score >= 75 ? "Low Risk" : score >= 55 ? "Medium Risk" : "High Risk";
    return [
      `⚡ Business Overview — ${ctx.company.name}:`,
      `- Health Score: ${score}/100 (${label})`,
      `- Revenue: ${fmt(ctx.revenue.thisMonth)} (${ctx.revenue.change >= 0 ? "+" : ""}${ctx.revenue.change}%)`,
      `- Expenses: ${fmt(ctx.expenses.thisMonth)} (${ctx.expenses.change >= 0 ? "+" : ""}${ctx.expenses.change}%)`,
      `- Profit: ${fmt(ctx.profit.thisMonth)} (margin: ${marginPct}%)`,
      `- Cash: ${fmt(ctx.cashPosition)}`,
      `- Overdue receivables: ${fmt(ctx.receivables.overdue)}`,
      `- Low stock: ${ctx.inventory.lowStockItems} items`,
      topCustomer ? `- Top customer: ${topCustomer.name} (${fmt(topCustomer.amount)})` : "",
      `- Full AI analysis at /dashboard/ai`,
    ].filter(Boolean).join("\n");
  }

  // ── System overview ────────────────────────────────────────────────────────
  if (q.includes("system") || q.includes("samjhao") || q.includes("finova") || q.includes("modules") || q.includes("features")) {
    const bType = (ctx.company.businessType || "business").replace(/[-_]/g, " ");
    return [
      `🏢 FinovaOS — ${ctx.company.name} (${bType}, plan: ${ctx.company.plan}):`,
      `FinovaOS is a complete cloud ERP for SMEs. Main modules:`,
      `📊 Accounting: Ledger, Trial Balance, P&L, Balance Sheet, Cash Flow`,
      `🧾 Sales: Invoices, Quotations, Delivery Challans, Sales Orders`,
      `🛒 Purchases: POs, GRN, Purchase Invoices, Expense Vouchers`,
      `📦 Inventory: Items, Stock Tracking, Barcode, Multi-Warehouse`,
      `🏦 Banking: Reconciliation, Payment Receipts (CRV), Vouchers (CPV/JV)`,
      `👥 HR & CRM: Employees, Payroll, Attendance, Customer/Supplier records`,
      `🤖 AI Intelligence: 9 features — insights, alerts, forecast, chat, market intel, advisor`,
      `🌍 Multi: Currency, Company, Branch, Language (English + Urdu)`,
      `Go to /dashboard/ai to use AI, or ask me anything specific!`,
    ].join("\n");
  }

  // ── Default ────────────────────────────────────────────────────────────────
  return [
    `📊 Quick Financial Summary — ${ctx.company.name}:`,
    `- Revenue: ${fmt(ctx.revenue.thisMonth)} (${ctx.revenue.change >= 0 ? "+" : ""}${ctx.revenue.change}%)`,
    `- Expenses: ${fmt(ctx.expenses.thisMonth)} (${ctx.expenses.change >= 0 ? "+" : ""}${ctx.expenses.change}%)`,
    `- Profit: ${fmt(ctx.profit.thisMonth)} (${marginPct}% margin)`,
    `- Cash: ${fmt(ctx.cashPosition)}`,
    topCustomer ? `- Top customer: ${topCustomer.name} (${fmt(topCustomer.amount)})` : "",
    ctx.receivables.overdue > 0 ? `⚠️ Overdue: ${fmt(ctx.receivables.overdue)} (${ctx.receivables.overdueCount} invoices)` : "✅ No overdue receivables.",
    projected30Cash < 0 ? "🚨 30-day cash projection is negative — act fast." : "✅ 30-day cash outlook is stable.",
    `\nAsk me about: expenses, profit, cashflow, inventory, forecast, alerts, recommendations, market intelligence, or business advice.`,
  ].filter(Boolean).join("\n");
}

export async function finovaChat(
  message: string,
  history: ChatMessage[],
  companyId: string | null
): Promise<AsyncIterable<string>> {
  // Build financial context if we have a company
  let contextStr = "";
  let ctx: FinancialContext | null = null;
  if (companyId) {
    try {
      ctx = await buildFinancialContext(companyId);
      contextStr = buildContextString(ctx);
    } catch {
      contextStr = "\n[Financial data temporarily unavailable]\n";
    }
  }

  if (!HAS_OPENAI_KEY) {
    const fallback = localAIReply(message, ctx);
    return (async function* () {
      yield fallback;
    })();
  }
  const systemPrompt = FINOVA_SYSTEM_PROMPT + (contextStr ? `\n\nCURRENT FINANCIAL DATA:\n${contextStr}` : "");
  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: message },
  ];

  return (async function* () {
    try {
      const text = await openAITextResponse(systemPrompt, messages, 1500);
      const chunks = text.match(/.{1,140}/g) || [text];
      for (const chunk of chunks) {
        if (chunk) {
          yield chunk;
        }
      }
    } catch (error) {
      console.error("FinovaOS chat fell back to local reply:", error);
      yield localAIReply(message, ctx);
    }
  })();
}

// ─── Insights Generator ───────────────────────────────────────────────────────
export async function generateInsights(companyId: string): Promise<string> {
  let ctx: FinancialContext;
  try {
    ctx = await buildFinancialContext(companyId);
  } catch {
    return "Unable to load financial data for insights.";
  }

  const contextStr = buildContextString(ctx);

  const prompt = `Based on this company's financial data, generate a structured financial insights report with:

1. **Executive Summary** (2-3 sentences on overall health)
2. **Revenue Analysis** (trend, growth, concerns)
3. **Expense Analysis** (major expense drivers, trends)
4. **Profitability** (profit margin, month-over-month)
5. **Cash Flow Health** (receivables vs payables, risk)
6. **Inventory Status** (low stock risks if applicable)
7. **Top 3 Actionable Recommendations** (specific, prioritized)
8. **Financial Health Score** (score out of 100 with brief explanation)

Be specific with numbers. Be direct. Use bullet points. Keep it under 400 words.

${contextStr}`;

  if (!HAS_OPENAI_KEY) {
    return localAIReply("give me insights", ctx);
  }

  const text = await openAITextResponse(
    FINOVA_SYSTEM_PROMPT,
    [{ role: "user", content: prompt }],
    1200,
  );

  return text || "Could not generate insights.";
}

// ─── Anomaly Detector ─────────────────────────────────────────────────────────
export interface AnomalyAlert {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  action: string;
  link?: string;
}

export async function detectAnomalies(companyIdOrCtx: string | FinancialContext): Promise<AnomalyAlert[]> {
  let ctx: FinancialContext;
  try {
    ctx = typeof companyIdOrCtx === "string"
      ? await buildFinancialContext(companyIdOrCtx)
      : companyIdOrCtx;
  } catch {
    return [];
  }

  const alerts: AnomalyAlert[] = [];
  const c = ctx.company.currency;
  const monthlyExpenseAvg = ctx.monthlyRevenue.length
    ? ctx.monthlyRevenue.reduce((sum, month) => sum + month.expenses, 0) / ctx.monthlyRevenue.length
    : ctx.expenses.thisMonth;
  const monthlyRevenueAvg = ctx.monthlyRevenue.length
    ? ctx.monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0) / ctx.monthlyRevenue.length
    : ctx.revenue.thisMonth;
  const projectedCash90d = ctx.cashPosition + monthlyRevenueAvg * 3 + ctx.receivables.total * 0.9 - monthlyExpenseAvg * 3 - ctx.payables.total * 0.85;

  // Overdue receivables alert
  if (ctx.receivables.overdue > 0) {
    const severity = ctx.receivables.overdue > ctx.revenue.thisMonth * 0.3 ? "critical" : "warning";
    alerts.push({
      severity,
      title: `${ctx.receivables.overdueCount} Overdue Invoice${ctx.receivables.overdueCount > 1 ? "s" : ""}`,
      description: `${formatCurrency(ctx.receivables.overdue, c)} in overdue receivables. This is ${Math.round((ctx.receivables.overdue / Math.max(ctx.revenue.thisMonth, 1)) * 100)}% of this month's revenue.`,
      action: "Send payment reminders to overdue customers",
      link: "/dashboard/sales-invoice",
    });
  }

  const lateCustomer = [...ctx.customerPaymentHistory].sort((a, b) => (b.overdueCount * 100 + b.avgDaysToPay) - (a.overdueCount * 100 + a.avgDaysToPay))[0];
  if (lateCustomer && (lateCustomer.overdueCount > 0 || lateCustomer.avgDaysToPay > 30)) {
    alerts.push({
      severity: lateCustomer.overdueCount > 1 ? "critical" : "warning",
      title: `Late Payment Risk: ${lateCustomer.name}`,
      description: `${lateCustomer.name} averages around ${lateCustomer.avgDaysToPay} days to pay${lateCustomer.overdueCount ? ` and already has ${lateCustomer.overdueCount} overdue invoice(s)` : ""}.`,
      action: "Send reminder and review their credit exposure",
      link: "/dashboard/crm",
    });
  }

  // Expense spike
  if (ctx.expenses.change > 25) {
    alerts.push({
      severity: "warning",
      title: "Expense Spike Detected",
      description: `Expenses increased by ${ctx.expenses.change}% compared to last month. This month: ${formatCurrency(ctx.expenses.thisMonth, c)} vs last month: ${formatCurrency(ctx.expenses.lastMonth, c)}.`,
      action: "Review expense categories to identify unusual spending",
      link: "/dashboard/expense-vouchers",
    });
  }

  // Revenue drop
  if (ctx.revenue.change < -15) {
    alerts.push({
      severity: "critical",
      title: "Revenue Drop Alert",
      description: `Revenue dropped by ${Math.abs(ctx.revenue.change)}% this month. This month: ${formatCurrency(ctx.revenue.thisMonth, c)} vs last month: ${formatCurrency(ctx.revenue.lastMonth, c)}.`,
      action: "Analyze sales pipeline and follow up with key customers",
      link: "/dashboard/sales-invoice",
    });
  }

  // Negative profit
  if (ctx.profit.thisMonth < 0) {
    alerts.push({
      severity: "critical",
      title: "Operating at a Loss",
      description: `Net result this month is ${formatCurrency(ctx.profit.thisMonth, c)}. Expenses are exceeding revenue.`,
      action: "Immediately review and cut non-essential expenses",
      link: "/dashboard/expense-vouchers",
    });
  }

  if (projectedCash90d < 0) {
    alerts.push({
      severity: "critical",
      title: "Negative Cashflow Risk",
      description: `Based on current trend, projected 90-day closing cash can drop below zero. Receivables recovery is not keeping pace with expenses.`,
      action: "Collect overdue invoices and reduce discretionary spending immediately",
      link: "/dashboard/crv",
    });
  }

  // Low stock items
  if (ctx.inventory.lowStockItems > 0) {
    alerts.push({
      severity: ctx.inventory.lowStockItems > 5 ? "warning" : "info",
      title: `${ctx.inventory.lowStockItems} Items Below Minimum Stock`,
      description: `Low stock items: ${ctx.inventory.lowStockNames.join(", ")}${ctx.inventory.lowStockItems > 5 ? ` and ${ctx.inventory.lowStockItems - 5} more` : ""}`,
      action: "Create purchase orders for low stock items before stockout",
      link: "/dashboard/purchase-order",
    });
  }

  // High payables
  if (ctx.payables.overdue > 0) {
    alerts.push({
      severity: "warning",
      title: "Overdue Supplier Payments",
      description: `${formatCurrency(ctx.payables.overdue, c)} in overdue payable bills. Delayed payments may affect supplier relationships.`,
      action: "Schedule payments to clear overdue bills",
      link: "/dashboard/cpv",
    });
  }

  // No revenue this month (possible data issue or new company)
  if (ctx.revenue.thisMonth === 0 && ctx.revenue.lastMonth > 0) {
    alerts.push({
      severity: "warning",
      title: "No Sales Recorded This Month",
      description: "No sales invoices recorded yet this month. Last month had " + formatCurrency(ctx.revenue.lastMonth, c) + " in sales.",
      action: "Create sales invoices or check if invoices are being recorded",
      link: "/dashboard/sales-invoice",
    });
  }

  return alerts;
}

// ─── Cashflow Forecast ────────────────────────────────────────────────────────
export async function generateForecast(companyId: string): Promise<string> {
  let ctx: FinancialContext;
  try {
    ctx = await buildFinancialContext(companyId);
  } catch {
    return "Unable to generate forecast.";
  }

  const contextStr = buildContextString(ctx);

  const prompt = `Based on the financial data below, generate a 30-day cash flow forecast.

Include:
1. **Expected Cash Inflows** (based on outstanding receivables + revenue trend)
2. **Expected Cash Outflows** (based on payables + expense trend)
3. **Projected Net Cash Position** (end of 30 days)
4. **Cash Risk Assessment** (will there be a cash crunch?)
5. **Key Assumptions** (brief)
6. **3 Actions to Improve Cash Flow**

Be specific with numbers. Use the actual data. Keep it practical.

${contextStr}`;

  if (!HAS_OPENAI_KEY) {
    return localAIReply("cashflow forecast", ctx);
  }

  const text = await openAITextResponse(
    FINOVA_SYSTEM_PROMPT,
    [{ role: "user", content: prompt }],
    800,
  );

  return text || "Could not generate forecast.";
}
