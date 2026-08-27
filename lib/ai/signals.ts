/**
 * lib/ai/signals.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One pass over the database that produces the per-customer usage picture four
 * different AI pages need: Churn Radar, Upgrade Finder, Onboarding Assistant and
 * Data Anomaly Watch.
 *
 * They are built on one loader rather than four because they were about to
 * disagree. "Active" meant a login inside 30 days on one screen and an invoice
 * inside 30 days on another, so the same customer could sit in the churn list
 * and the upgrade list on the same afternoon. One definition, computed once.
 *
 * Everything here is aggregate — counts and maxima grouped by company. No page
 * pulls the invoice rows of a customer into the console, and none of this is
 * sent to a model beyond the shape in `signalLine`: a company name, a plan, and
 * counts. The founder can already see all of it in /admin/companies; the ledger
 * contents behind it never leave the database.
 */

import { prisma } from "@/lib/prisma";

const db = prisma as any;

const DAY = 86400_000;

export type CompanySignal = {
  companyId: string;
  name: string;
  plan: string;
  country: string | null;
  businessType: string;
  subscriptionStatus: string | null;
  /** From the Subscription row when there is one — the billed truth. */
  billedPlan: string | null;
  billingStatus: string | null;
  pricePerMonth: number;
  failedPayments: number;
  currentPeriodEnd: string | null;
  createdAt: string;
  /** Whole days since the company row was created. */
  ageDays: number;
  setupDone: boolean;
  userCount: number;
  /** Null when nobody on this company has ever logged in. */
  lastLoginAt: string | null;
  daysSinceLogin: number | null;
  loginsLast30: number;
  invoicesLast30: number;
  invoicesPrev30: number;
  salesLast30: number;
  salesPrev30: number;
  vouchersLast30: number;
  accountCount: number;
  itemCount: number;
  /** Branches and employees — the two counts plan seats are actually sold on. */
  branchCount: number;
  employeeCount: number;
  /** invoicesLast30 vs invoicesPrev30 as a percentage, null when no baseline. */
  invoiceTrendPct: number | null;
};

/** Companies that are not customers: demo sandboxes and internal test spaces. */
const REAL_COMPANY = { isDemo: false, isInternalTest: false };

async function safeGroup(fn: () => Promise<any[]>): Promise<any[]> {
  try {
    return await fn();
  } catch (err) {
    console.warn("[signals] aggregate failed:", err);
    return [];
  }
}

function indexBy(rows: any[], key = "companyId"): Map<string, any> {
  const m = new Map<string, any>();
  for (const r of rows) if (r?.[key]) m.set(r[key], r);
  return m;
}

/**
 * Load signals for every real company, or a named subset.
 *
 * @param companyIds Restrict to these ids. Omit for the whole customer base.
 */
export async function loadCompanySignals(companyIds?: string[]): Promise<CompanySignal[]> {
  const now = Date.now();
  const d30 = new Date(now - 30 * DAY);
  const d60 = new Date(now - 60 * DAY);

  const companyWhere: any = { ...REAL_COMPANY };
  if (companyIds?.length) companyWhere.id = { in: companyIds };

  const companies = await db.company.findMany({
    where: companyWhere,
    select: {
      id: true, name: true, plan: true, country: true, businessType: true,
      subscriptionStatus: true, businessSetupDone: true, createdAt: true,
      subscription: {
        select: {
          plan: true, status: true, pricePerMonth: true,
          failedPayments: true, currentPeriodEnd: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  }).catch(() => []);

  if (!companies.length) return [];

  const ids: string[] = companies.map((c: any) => c.id);
  const scope = { companyId: { in: ids } };

  // Every aggregate below is grouped by company in the database. Doing this per
  // company in a loop is what made the first version of the churn page take
  // eleven seconds against four customers.
  const [
    lastLogins, logins30, users, inv30, inv60, vouchers30, accounts, items,
    branches, employees,
  ] = await Promise.all([
    safeGroup(() => db.loginLog.groupBy({ by: ["companyId"], where: scope, _max: { loginAt: true } })),
    safeGroup(() => db.loginLog.groupBy({ by: ["companyId"], where: { ...scope, loginAt: { gte: d30 } }, _count: { _all: true } })),
    safeGroup(() => db.userCompany.groupBy({ by: ["companyId"], where: scope, _count: { _all: true } })),
    safeGroup(() => db.salesInvoice.groupBy({
      by: ["companyId"],
      where: { ...scope, deletedAt: null, date: { gte: d30 } },
      _count: { _all: true }, _sum: { total: true },
    })),
    safeGroup(() => db.salesInvoice.groupBy({
      by: ["companyId"],
      where: { ...scope, deletedAt: null, date: { gte: d60, lt: d30 } },
      _count: { _all: true }, _sum: { total: true },
    })),
    safeGroup(() => db.voucher.groupBy({ by: ["companyId"], where: { ...scope, date: { gte: d30 } }, _count: { _all: true } })),
    safeGroup(() => db.account.groupBy({ by: ["companyId"], where: { ...scope, deletedAt: null }, _count: { _all: true } })),
    safeGroup(() => db.itemNew.groupBy({ by: ["companyId"], where: { ...scope, deletedAt: null }, _count: { _all: true } })),
    safeGroup(() => db.branch.groupBy({ by: ["companyId"], where: { ...scope, isActive: true }, _count: { _all: true } })),
    safeGroup(() => db.employee.groupBy({ by: ["companyId"], where: scope, _count: { _all: true } })),
  ]);

  const mLastLogin = indexBy(lastLogins);
  const mLogins30 = indexBy(logins30);
  const mUsers = indexBy(users);
  const mInv30 = indexBy(inv30);
  const mInv60 = indexBy(inv60);
  const mVou30 = indexBy(vouchers30);
  const mAcc = indexBy(accounts);
  const mItem = indexBy(items);
  const mBranch = indexBy(branches);
  const mEmp = indexBy(employees);

  return companies.map((c: any): CompanySignal => {
    const lastLogin: Date | null = mLastLogin.get(c.id)?._max?.loginAt ?? null;
    const invoicesLast30 = mInv30.get(c.id)?._count?._all ?? 0;
    const invoicesPrev30 = mInv60.get(c.id)?._count?._all ?? 0;
    const sub = c.subscription;

    return {
      companyId: c.id,
      name: c.name,
      plan: c.plan,
      country: c.country ?? null,
      businessType: c.businessType,
      subscriptionStatus: c.subscriptionStatus ?? null,
      billedPlan: sub?.plan ?? null,
      billingStatus: sub?.status ?? null,
      pricePerMonth: sub?.pricePerMonth ?? 0,
      failedPayments: sub?.failedPayments ?? 0,
      currentPeriodEnd: sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : null,
      createdAt: new Date(c.createdAt).toISOString(),
      ageDays: Math.floor((now - new Date(c.createdAt).getTime()) / DAY),
      setupDone: Boolean(c.businessSetupDone),
      userCount: mUsers.get(c.id)?._count?._all ?? 0,
      lastLoginAt: lastLogin ? new Date(lastLogin).toISOString() : null,
      daysSinceLogin: lastLogin ? Math.floor((now - new Date(lastLogin).getTime()) / DAY) : null,
      loginsLast30: mLogins30.get(c.id)?._count?._all ?? 0,
      invoicesLast30,
      invoicesPrev30,
      salesLast30: Math.round(mInv30.get(c.id)?._sum?.total ?? 0),
      salesPrev30: Math.round(mInv60.get(c.id)?._sum?.total ?? 0),
      vouchersLast30: mVou30.get(c.id)?._count?._all ?? 0,
      accountCount: mAcc.get(c.id)?._count?._all ?? 0,
      itemCount: mItem.get(c.id)?._count?._all ?? 0,
      branchCount: mBranch.get(c.id)?._count?._all ?? 0,
      employeeCount: mEmp.get(c.id)?._count?._all ?? 0,
      // A customer with no invoices last month has no baseline to fall from.
      // Reporting that as "-100%" would put every brand-new signup at the top
      // of the churn list on their second day.
      invoiceTrendPct: invoicesPrev30 > 0
        ? Math.round(((invoicesLast30 - invoicesPrev30) / invoicesPrev30) * 100)
        : null,
    };
  });
}

/** One company as a single compact line of prompt context. */
export function signalLine(s: CompanySignal): string {
  return [
    `${s.name} (${s.companyId.slice(0, 8)})`,
    `plan=${s.billedPlan || s.plan}`,
    `billing=${s.billingStatus || s.subscriptionStatus || "none"}`,
    `price=${s.pricePerMonth}/mo`,
    `age=${s.ageDays}d`,
    `users=${s.userCount}`,
    `lastLogin=${s.daysSinceLogin === null ? "never" : `${s.daysSinceLogin}d ago`}`,
    `logins30=${s.loginsLast30}`,
    `invoices30=${s.invoicesLast30}`,
    `invoicesPrev30=${s.invoicesPrev30}`,
    `trend=${s.invoiceTrendPct === null ? "n/a" : `${s.invoiceTrendPct}%`}`,
    `sales30=${s.salesLast30}`,
    `vouchers30=${s.vouchersLast30}`,
    `accounts=${s.accountCount}`,
    `items=${s.itemCount}`,
    `branches=${s.branchCount}`,
    `employees=${s.employeeCount}`,
    `setupDone=${s.setupDone}`,
    `country=${s.country || "?"}`,
    `type=${s.businessType}`,
    `failedPayments=${s.failedPayments}`,
  ].join(" | ");
}

/** The whole set as prompt context. */
export function signalsToPrompt(signals: CompanySignal[]): string {
  return signals.map(signalLine).join("\n");
}
