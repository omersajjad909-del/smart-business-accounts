import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askAI } from "@/lib/ai/adminAI";
import { buildFinancialContext, type FinancialContext } from "@/lib/finovaAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = prisma as any;

/**
 * Report Explainer — what a customer's numbers actually say, in three lines.
 *
 * The gap this closes is not a reporting gap. FinovaOS already produces a
 * profit and loss, a balance sheet, an ageing report. The gap is that the person
 * looking at them frequently cannot read them — a trader who knows exactly what
 * his business is doing still cannot say what "current ratio" means, and the
 * report tells him nothing he can act on.
 *
 * The figures come from `buildFinancialContext`, which is the same computation
 * the in-product AI assistant already uses. Reusing it rather than recomputing
 * matters: two different definitions of "receivables overdue" in one product is
 * how a customer is told two different numbers by two different screens.
 *
 * The model reads those figures and explains them. It computes nothing. Its job
 * is the sentence, not the arithmetic.
 *
 * Note on data: this reads one customer's real financial position, including
 * their largest customers by name. That is the same access the admin console
 * already grants over /admin/companies, and it goes no further — but it is real
 * customer data going into a model prompt, and that is worth knowing.
 */

type ReportId = "overview" | "profit-loss" | "receivables" | "payables" | "inventory" | "cash" | "customers";

const REPORTS: Array<{ id: ReportId; name: string; blurb: string }> = [
  { id: "overview", name: "Overall health", blurb: "Everything at once — where the business stands today" },
  { id: "profit-loss", name: "Profit & loss", blurb: "Revenue against expenses, this month against last" },
  { id: "receivables", name: "Money owed to them", blurb: "Receivables, what is overdue, who pays late" },
  { id: "payables", name: "Money they owe", blurb: "Payables and what has gone past its date" },
  { id: "inventory", name: "Stock", blurb: "Stock value, low stock, dead stock, slow movers" },
  { id: "cash", name: "Cash position", blurb: "Cash on hand against what is coming in and going out" },
  { id: "customers", name: "Customers", blurb: "Who the revenue actually comes from, and how they pay" },
];

const LANGUAGES = [
  { id: "en", name: "English" },
  { id: "roman-ur", name: "Roman Urdu" },
  { id: "ur", name: "Urdu (script)" },
];

/** The slice of the context each report needs, as prompt text. */
function slice(report: ReportId, c: FinancialContext): string {
  const cur = c.company.currency;
  const m = (n: number) => `${cur} ${Math.round(n).toLocaleString()}`;

  const lines: string[] = [
    `Business: ${c.company.name} (${c.company.businessType}, ${c.company.plan} plan)`,
    `Currency: ${cur}`,
    ``,
  ];

  const pl = () => [
    `Revenue this month: ${m(c.revenue.thisMonth)}`,
    `Revenue last month: ${m(c.revenue.lastMonth)} (change ${c.revenue.change}%)`,
    `Revenue this year: ${m(c.revenue.thisYear)}`,
    `Expenses this month: ${m(c.expenses.thisMonth)}`,
    `Expenses last month: ${m(c.expenses.lastMonth)} (change ${c.expenses.change}%)`,
    `Profit this month: ${m(c.profit.thisMonth)}`,
    `Profit last month: ${m(c.profit.lastMonth)} (change ${c.profit.change}%)`,
    ``,
    `Month by month:`,
    ...c.monthlyRevenue.map((r) => `  ${r.month}: revenue ${m(r.revenue)}, expenses ${m(r.expenses)}, profit ${m(r.profit)}`),
    ``,
    `Largest expense categories:`,
    ...c.topExpenses.map((e) => `  ${e.category}: ${m(e.amount)}`),
  ];

  const rec = () => [
    `Total owed to the business: ${m(c.receivables.total)}`,
    `Of which overdue: ${m(c.receivables.overdue)} across ${c.receivables.overdueCount} invoice(s)`,
    `Cash on hand: ${m(c.cashPosition)}`,
    ``,
    `How customers pay:`,
    ...c.customerPaymentHistory.map((p) =>
      `  ${p.name}: pays in about ${p.avgDaysToPay} days, ${p.overdueCount} overdue, lifetime ${m(p.totalRevenue)}`),
    ``,
    `Recent invoices:`,
    ...c.recentInvoices.map((i) => `  ${i.ref} to ${i.customer}: ${m(i.amount)}, ${i.status}, ${i.daysAgo} days ago`),
  ];

  const pay = () => [
    `Total the business owes: ${m(c.payables.total)}`,
    `Of which overdue: ${m(c.payables.overdue)}`,
    `Cash on hand: ${m(c.cashPosition)}`,
    `Owed to the business: ${m(c.receivables.total)} (overdue ${m(c.receivables.overdue)})`,
    `Expenses this month: ${m(c.expenses.thisMonth)}`,
  ];

  const inv = () => [
    `Stock items: ${c.inventory.totalItems}`,
    `Stock value: ${m(c.inventory.stockValue)}`,
    `Items at or below minimum: ${c.inventory.lowStockItems}`,
    c.inventory.lowStockNames.length ? `  ${c.inventory.lowStockNames.join(", ")}` : "",
    ``,
    `Best sellers:`,
    ...c.topProducts.map((p) => `  ${p.name}: ${m(p.revenue)} from ${p.qty} units`),
    ``,
    `Slow movers:`,
    ...c.slowMovingItems.map((s) => `  ${s.name}: last sold ${s.lastSaleDays} days ago, ${s.stock} in stock`),
    ``,
    `Dead stock:`,
    ...c.deadStockItems.map((d) => `  ${d.name}: ${d.stock} units worth ${m(d.value)}`),
  ];

  const cash = () => [
    `Cash on hand: ${m(c.cashPosition)}`,
    `Owed to the business: ${m(c.receivables.total)}, of which ${m(c.receivables.overdue)} is overdue`,
    `The business owes: ${m(c.payables.total)}, of which ${m(c.payables.overdue)} is overdue`,
    `Expenses this month: ${m(c.expenses.thisMonth)}, last month ${m(c.expenses.lastMonth)}`,
    `Profit this month: ${m(c.profit.thisMonth)}`,
    `Stock tied up: ${m(c.inventory.stockValue)}`,
    ``,
    `Month by month:`,
    ...c.monthlyRevenue.map((r) => `  ${r.month}: revenue ${m(r.revenue)}, expenses ${m(r.expenses)}, profit ${m(r.profit)}`),
  ];

  const cust = () => [
    `Revenue this month: ${m(c.revenue.thisMonth)}, this year ${m(c.revenue.thisYear)}`,
    ``,
    `Largest customers:`,
    ...c.topCustomers.map((t) => `  ${t.name}: ${m(t.amount)}`),
    ``,
    `Payment behaviour:`,
    ...c.customerPaymentHistory.map((p) =>
      `  ${p.name}: about ${p.avgDaysToPay} days to pay, ${p.overdueCount} overdue, lifetime ${m(p.totalRevenue)}`),
  ];

  switch (report) {
    case "profit-loss": lines.push(...pl()); break;
    case "receivables": lines.push(...rec()); break;
    case "payables": lines.push(...pay()); break;
    case "inventory": lines.push(...inv()); break;
    case "cash": lines.push(...cash()); break;
    case "customers": lines.push(...cust()); break;
    default:
      lines.push(...pl(), ``, ...rec(), ``, ...pay(), ``, ...inv());
  }

  // Blank strings are deliberate paragraph breaks in the fact sheet, so nothing
  // is filtered out here.
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const companies = await db.company.findMany({
      where: { isDemo: false, isInternalTest: false },
      select: { id: true, name: true, businessType: true, country: true, baseCurrency: true, plan: true },
      orderBy: { name: "asc" },
      take: 500,
    }).catch(() => []);

    return NextResponse.json({ aiConfigured: aiConfigured(), companies, reports: REPORTS, languages: LANGUAGES });
  } catch (err) {
    console.error("[report-explainer] GET failed:", err);
    return NextResponse.json({ error: "Could not load companies" }, { status: 500 });
  }
}

function systemFor(language: string): string {
  const languageRule = language === "roman-ur"
    ? "Write in Roman Urdu mixed with English, the way a trader in Pakistan actually talks. Accounting terms stay in English (profit, stock, receivable) because that is how they are said."
    : language === "ur"
      ? "Write in Urdu script. Keep accounting terms in English inside the Urdu sentence, because that is how they are used in practice."
      : "Write in plain English. Short sentences.";

  return `
You explain a small business's own numbers back to the person who runs it. They
know their business inside out and do not read financial statements.

${languageRule}

Structure your answer exactly like this and nothing else:

THE SHORT VERSION
Three lines maximum. What is happening, in words they would use. No jargon at
all — not "liquidity", not "margin", not "ratio". If you must name a figure,
say what it is: "customers owe you 4,20,000 and 1,80,000 of that is late".

WHAT STANDS OUT
Two to four bullets. Each one names a specific number from the data and says
what it means for them. Point at the thing that is unusual, not the thing that
is biggest.

WHAT I WOULD DO
Two or three actions, in the order to do them. Concrete: which customer to call,
which stock to move, which expense to look at. Not "improve cash flow".

Rules:
- Use only the numbers you are given. Never compute a ratio, a percentage or a
  projection that is not in the data.
- Where the data is thin or a figure is zero because nothing has been entered,
  say so. "There is no expense data yet" is more useful than an analysis of
  nothing.
- Never reassure. If the business is losing money or has too much owed to it,
  say so directly in the first line.
- No preamble, no closing summary, no offer to help further.
`.trim();
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const { companyId, report = "overview", language = "en" } =
      (await req.json().catch(() => ({}))) as { companyId?: string; report?: ReportId; language?: string };

    if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    if (!REPORTS.some((r) => r.id === report)) {
      return NextResponse.json({ error: "Unknown report" }, { status: 400 });
    }

    const context = await buildFinancialContext(companyId);
    const facts = slice(report as ReportId, context);

    const explanation = await askAI(systemFor(String(language)), facts, 1300);

    return NextResponse.json({
      companyId,
      report,
      language,
      explanation,
      // Returned so the page can show the figures beside the explanation. An
      // explanation you cannot check against the numbers is just an assertion.
      facts,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[report-explainer] POST failed:", err);
    return NextResponse.json({ error: "The report could not be explained" }, { status: 500 });
  }
}
