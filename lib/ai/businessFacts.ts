/**
 * lib/ai/businessFacts.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The state of the business, assembled once, as text a model can reason over.
 *
 * The obvious way to build a "chat with your data" page is to let the model
 * write SQL. That is not done here, for two reasons that both matter more than
 * the flexibility it would buy:
 *
 *   A model with query access to this database has query access to every
 *   customer ledger in it. There is no safe subset — the interesting tables are
 *   the confidential ones.
 *
 *   Generated SQL fails silently in the way that matters. A query that joins
 *   wrongly returns a number, not an error, and a number is exactly what the
 *   page will render with confidence.
 *
 * So the facts are computed here in code that can be read and checked, and the
 * model is handed the finished figures. It answers questions about them, which
 * is the part it is genuinely good at. The cost is that a question nobody
 * anticipated cannot be answered — and the page says so rather than guessing,
 * which is the right failure.
 *
 * Nothing customer-identifying beyond company name and country goes in. No
 * invoice line, no ledger balance, no contact detail.
 */

import { prisma } from "@/lib/prisma";

const db = prisma as any;
const DAY = 86400_000;

export type MonthRow = {
  month: string;
  invoices: number;
  gross: number;
  refunds: number;
  net: number;
  newCompanies: number;
  cancellations: number;
};

export type BusinessFacts = {
  generatedAt: string;
  currency: string;
  mrr: number;
  activeSubscriptions: number;
  payingCompanies: number;
  totalCompanies: number;
  planMix: Record<string, number>;
  providerMix: Record<string, number>;
  countryMix: Record<string, number>;
  months: MonthRow[];
  lifetimeRevenue: number;
  refundedLifetime: number;
  pastDue: number;
  cancelledLast90: Array<{ name: string; plan: string; when: string; monthsHeld: number }>;
  topCustomers: Array<{ name: string; plan: string; lifetime: number; country: string | null }>;
  /** Anything that makes these numbers less trustworthy than they look. */
  caveats: string[];
};

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function bump(obj: Record<string, number>, key: string | null | undefined, by = 1) {
  const k = String(key || "unknown");
  obj[k] = (obj[k] || 0) + by;
}

/** Read the whole picture. One call, used by the analyst and the case studies. */
export async function loadBusinessFacts(monthsBack = 12): Promise<BusinessFacts> {
  const now = new Date();
  const from = new Date(now.getTime() - monthsBack * 31 * DAY);

  const [invoices, subs, companies] = await Promise.all([
    db.platformInvoice.findMany({
      where: { issuedAt: { gte: from } },
      select: {
        companyId: true, companyName: true, provider: true, plan: true,
        currency: true, total: true, refundedAmount: true, status: true,
        customerCountry: true, issuedAt: true,
      },
      orderBy: { issuedAt: "asc" },
      take: 5000,
    }).catch(() => []),
    db.subscription.findMany({
      select: {
        companyId: true, plan: true, status: true, provider: true,
        pricePerMonth: true, totalPaid: true, failedPayments: true,
        billingCycle: true, createdAt: true, canceledAt: true, currentPeriodEnd: true,
      },
      take: 2000,
    }).catch(() => []),
    db.company.findMany({
      where: { isDemo: false, isInternalTest: false },
      select: { id: true, name: true, plan: true, country: true, createdAt: true, cancelledAt: true },
      take: 3000,
    }).catch(() => []),
  ]);

  const caveats: string[] = [];

  // Currency. These invoices can carry more than one, and adding PKR to USD
  // would produce a headline number that is simply wrong. If the data is mixed,
  // the totals are restricted to the dominant currency and the caveat says so.
  const currencyCount: Record<string, number> = {};
  for (const i of invoices) bump(currencyCount, i.currency || "USD");
  const currencies = Object.keys(currencyCount);
  const currency = currencies.sort((a, b) => currencyCount[b] - currencyCount[a])[0] || "USD";
  if (currencies.length > 1) {
    caveats.push(
      `Invoices exist in ${currencies.length} currencies (${currencies.join(", ")}). ` +
      `All revenue figures below count ${currency} invoices only — the others are excluded, ` +
      `not converted.`
    );
  }

  const inCurrency = invoices.filter((i: any) => (i.currency || "USD") === currency);

  // Monthly rows, seeded so a month with no revenue still appears as a zero
  // rather than vanishing from the series.
  const monthMap = new Map<string, MonthRow>();
  for (let k = monthsBack - 1; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    monthMap.set(ym(d), {
      month: ym(d), invoices: 0, gross: 0, refunds: 0, net: 0,
      newCompanies: 0, cancellations: 0,
    });
  }

  for (const i of inCurrency) {
    const row = monthMap.get(ym(new Date(i.issuedAt)));
    if (!row) continue;
    if (i.status === "VOID") continue;
    row.invoices += 1;
    row.gross += i.total || 0;
    row.refunds += i.refundedAmount || 0;
  }
  for (const c of companies) {
    const row = monthMap.get(ym(new Date(c.createdAt)));
    if (row) row.newCompanies += 1;
    if (c.cancelledAt) {
      const cr = monthMap.get(ym(new Date(c.cancelledAt)));
      if (cr) cr.cancellations += 1;
    }
  }
  const months = [...monthMap.values()].map((m) => ({
    ...m,
    gross: Math.round(m.gross),
    refunds: Math.round(m.refunds),
    net: Math.round(m.gross - m.refunds),
  }));

  const activeSubs = subs.filter((s: any) => String(s.status).toUpperCase() === "ACTIVE");
  // `pricePerMonth` is taken at its name for every billing cycle. A yearly
  // subscription that stored its annual price in that field would inflate MRR
  // twelvefold and there is no way to tell from the row which it did, so the
  // assumption is stated in the caveats rather than guessed at here.
  const mrr = activeSubs.reduce((sum: number, s: any) => sum + (s.pricePerMonth || 0), 0);
  if (activeSubs.some((s: any) => String(s.billingCycle).toUpperCase() === "YEARLY")) {
    caveats.push(
      "MRR treats Subscription.pricePerMonth as a monthly figure for yearly plans too. " +
      "If a yearly subscription stored its annual price in that field, MRR is overstated for it."
    );
  }

  const planMix: Record<string, number> = {};
  const providerMix: Record<string, number> = {};
  const countryMix: Record<string, number> = {};
  for (const s of activeSubs) { bump(planMix, s.plan); bump(providerMix, s.provider); }
  for (const c of companies) bump(countryMix, c.country);

  const nameOf = new Map<string, any>(companies.map((c: any) => [c.id, c]));

  const lifetimeByCompany: Record<string, number> = {};
  for (const i of inCurrency) {
    if (i.status === "VOID") continue;
    lifetimeByCompany[i.companyId] = (lifetimeByCompany[i.companyId] || 0) + (i.total || 0) - (i.refundedAmount || 0);
  }
  const topCustomers = Object.entries(lifetimeByCompany)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, total]) => {
      const c = nameOf.get(id);
      return {
        name: c?.name || invoices.find((i: any) => i.companyId === id)?.companyName || id.slice(0, 8),
        plan: c?.plan || "unknown",
        lifetime: Math.round(total),
        country: c?.country ?? null,
      };
    });

  const since90 = Date.now() - 90 * DAY;
  const cancelledLast90 = subs
    .filter((s: any) => s.canceledAt && new Date(s.canceledAt).getTime() >= since90)
    .map((s: any) => {
      const c = nameOf.get(s.companyId);
      const held = Math.max(
        0,
        Math.round((new Date(s.canceledAt).getTime() - new Date(s.createdAt).getTime()) / (30 * DAY)),
      );
      return {
        name: c?.name || s.companyId.slice(0, 8),
        plan: s.plan,
        when: new Date(s.canceledAt).toISOString().slice(0, 10),
        monthsHeld: held,
      };
    })
    .sort((a: any, b: any) => (a.when < b.when ? 1 : -1));

  const lifetimeRevenue = Math.round(
    inCurrency.filter((i: any) => i.status !== "VOID")
      .reduce((s: number, i: any) => s + (i.total || 0), 0),
  );
  const refundedLifetime = Math.round(
    inCurrency.reduce((s: number, i: any) => s + (i.refundedAmount || 0), 0),
  );

  if (invoices.length === 0) {
    caveats.push(
      "No platform invoices exist in this window. Revenue figures are all zero because nothing " +
      "has been billed, not because the query failed."
    );
  }
  if (monthsBack >= 12 && companies.length < 20) {
    caveats.push(
      `The whole customer base is ${companies.length} companies. Percentages and rates computed ` +
      `on numbers this small move enormously on a single account and should be read as counts.`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    currency,
    mrr: Math.round(mrr),
    activeSubscriptions: activeSubs.length,
    payingCompanies: Object.keys(lifetimeByCompany).length,
    totalCompanies: companies.length,
    planMix,
    providerMix,
    countryMix,
    months,
    lifetimeRevenue,
    refundedLifetime,
    pastDue: subs.filter((s: any) => String(s.status).toUpperCase() === "PAST_DUE").length,
    cancelledLast90,
    topCustomers,
    caveats,
  };
}

/** The same facts as prompt context. */
export function factsToPrompt(f: BusinessFacts): string {
  const lines: string[] = [];

  lines.push(`Reporting currency: ${f.currency}`);
  lines.push(`MRR right now: ${f.mrr} ${f.currency} across ${f.activeSubscriptions} active subscriptions`);
  lines.push(`Companies: ${f.totalCompanies} total, ${f.payingCompanies} have ever paid`);
  lines.push(`Lifetime billed: ${f.lifetimeRevenue} ${f.currency} (refunded: ${f.refundedLifetime})`);
  lines.push(`Subscriptions past due: ${f.pastDue}`);
  lines.push("");

  lines.push("Plan mix (active subscriptions):");
  for (const [k, v] of Object.entries(f.planMix)) lines.push(`  ${k}: ${v}`);
  lines.push("Payment providers (active subscriptions):");
  for (const [k, v] of Object.entries(f.providerMix)) lines.push(`  ${k}: ${v}`);
  lines.push("Companies by country:");
  for (const [k, v] of Object.entries(f.countryMix)) lines.push(`  ${k}: ${v}`);
  lines.push("");

  lines.push("Month by month (gross, refunds, net in " + f.currency + "):");
  lines.push("month | invoices | gross | refunds | net | new companies | cancellations");
  for (const m of f.months) {
    lines.push(`${m.month} | ${m.invoices} | ${m.gross} | ${m.refunds} | ${m.net} | ${m.newCompanies} | ${m.cancellations}`);
  }
  lines.push("");

  if (f.topCustomers.length) {
    lines.push("Largest customers by lifetime billed:");
    for (const c of f.topCustomers) {
      lines.push(`  ${c.name} (${c.plan}, ${c.country || "?"}): ${c.lifetime} ${f.currency}`);
    }
    lines.push("");
  }

  if (f.cancelledLast90.length) {
    lines.push("Cancellations in the last 90 days:");
    for (const c of f.cancelledLast90) {
      lines.push(`  ${c.name} (${c.plan}) cancelled ${c.when} after about ${c.monthsHeld} months`);
    }
  } else {
    lines.push("Cancellations in the last 90 days: none.");
  }
  lines.push("");

  if (f.caveats.length) {
    lines.push("Things that make these numbers less reliable than they look:");
    for (const c of f.caveats) lines.push(`  - ${c}`);
  }

  return lines.join("\n");
}
