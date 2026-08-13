import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Canonical prices — monthly and yearly (annual plan total, with 20% discount baked in)
// yearly = per-month-yearly-price × 12
// e.g. Starter: $39/mo × 12 = $468/yr (vs $588 if paying monthly)
const DEFAULT_PRICING = {
  starter:    { monthly: 49, yearly: 468  },   // $39/mo × 12
  pro:        { monthly: 99, yearly: 948  },   // $79/mo × 12
  enterprise: { monthly: 249, yearly: 2388 },  // $199/mo × 12
};

const DEFAULT_PLAN_LIMITS = {
  starter: 3,
  pro: 10,
  enterprise: 25,
};
const DEFAULT_BRANCH_LIMITS = {
  starter: 1,
  pro: 3,
  enterprise: 10,
};
const DEFAULT_SEAT_PRICING = {
  monthly: 7,
  yearly: 72, // yearly annual total (6/mo equivalent)
};

// Keep in step with DEFAULT_HIGHLIGHTS in app/(marketing)/pricing/page.tsx and
// with PLAN_DEFAULT_PERMISSIONS in lib/planPermissions.ts — a bullet here that
// the plan does not actually grant is a promise we bill for and then lock.
// Exception: Starter's "🤖 Ask AI" is granted per-tenant from /admin/permissions
// rather than by PLAN_DEFAULT_PERMISSIONS.
//
// "Unlimited users" used to sit on Enterprise while getMaxUsersForPlan capped
// it at 25.
const DEFAULT_PLAN_HIGHLIGHTS = {
  starter: [
    "Up to 3 users",
    "Sales & purchase invoices",
    "Basic accounting & chart of accounts",
    "Ledger & trial balance",
    "Basic inventory",
    "Expense management",
    "Basic financial reports",
    "Receivables & payables",
    "🤖 Ask AI",
    "Email support",
  ],
  pro: [
    "Up to 10 users",
    "Everything in Starter",
    "Advanced inventory & barcode",
    "Bank reconciliation",
    // "CRM & sales analytics",
    "HR & Payroll",
    "Trading control",
    "Advanced & strategic reports",
    "Multi-branch (up to 3)",
    "🤖 AI Assistant (ask anything)",
    "🤖 Smart invoice & expense AI",
  ],
  enterprise: [
    "Up to 25 users",
    "Everything in Professional",
    "Multi-branch (up to 10)",
    "Custom roles & approval workflows",
    "Audit trail & system logs",
    "Cost centers & multi-currency",
    "API access, webhooks & custom integrations",
    "Backup & restore",
    "🤖 AI Business Operator — runs tasks for you",
    "🤖 Forecasting, anomaly detection & cash-flow AI",
    "Priority support 24/7 + dedicated account manager",
  ],
};

function normalizePlanHighlights(saved: unknown) {
  const savedHighlights = (saved && typeof saved === "object")
    ? saved as Partial<Record<keyof typeof DEFAULT_PLAN_HIGHLIGHTS, unknown>>
    : {};

  return Object.fromEntries(
    Object.entries(DEFAULT_PLAN_HIGHLIGHTS).map(([plan, defaults]) => {
      const savedList = Array.isArray(savedHighlights[plan as keyof typeof DEFAULT_PLAN_HIGHLIGHTS])
        ? (savedHighlights[plan as keyof typeof DEFAULT_PLAN_HIGHLIGHTS] as unknown[])
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];

      if (!savedList.length) return [plan, defaults];

      const merged = [...savedList];
      for (const item of defaults) {
        if (!merged.includes(item)) merged.push(item);
      }
      return [plan, merged];
    })
  ) as typeof DEFAULT_PLAN_HIGHLIGHTS;
}

// `standalone: true` means the module is a complete product on its own — it is
// offered as a single-app subscription on /pricing. Keep in sync with
// STANDALONE_MODULE_IDS in lib/customPlanPricing.ts.
const DEFAULT_CUSTOM_PLAN = {
  basePrice: 0,
  yearlyDiscount: 20,
  modules: [
    { id: "accounting",          name: "Accounting & Invoicing",  price: 15, desc: "Ledger, invoices, vouchers, P&L, balance sheet",        icon: "📒", enabled: true,  category: "core", standalone: true },
    { id: "inventory",           name: "Inventory Management",    price: 12, desc: "Stock tracking, GRN, barcode, low-stock alerts",         icon: "📦", enabled: true,  category: "core", standalone: true },
    { id: "crm",                 name: "CRM",                     price: 15, desc: "Contacts, sales pipeline, interaction logs",             icon: "👥", enabled: true,  category: "core", standalone: true },
    { id: "hr_payroll",          name: "HR & Payroll",            price: 20, desc: "Employees, attendance, payroll, advance salary",         icon: "👨‍💼", enabled: true,  category: "core", standalone: true },
    { id: "trading",             name: "Trading Desk",            price: 18, desc: "Order desk, procurement, dispatch, outstandings",        icon: "🔄", enabled: true,  category: "core", standalone: true },
    { id: "bank_reconciliation", name: "Bank Reconciliation",     price: 10, desc: "Statement import, discrepancy flagging, closing",        icon: "🏦", enabled: true,  category: "finance", standalone: true },
    // The five layered modules (Tax & Compliance, Advanced Reports,
    // Multi-Branch, WhatsApp & SMS, API Access) were removed from the menu —
    // each needs a base module underneath to mean anything, and nothing stopped
    // a buyer picking one on its own. Keep in step with CUSTOM_PLAN_MODULES in
    // lib/customPlanPricing.ts, which is what actually prices and validates a
    // selection. Existing subscriptions are untouched.
  ],
};

// A saved PLAN_CONFIG carries the module list as it looked when the admin last
// hit save, so modules added to the catalog afterwards would never reach the
// pricing page. Admin-edited entries win; anything new is appended.
function mergeCustomPlan(saved: unknown) {
  const savedPlan = saved as { basePrice?: number; yearlyDiscount?: number; modules?: unknown } | null | undefined;
  if (!savedPlan) return DEFAULT_CUSTOM_PLAN;
  const savedModules = Array.isArray(savedPlan.modules) ? savedPlan.modules : [];
  if (!savedModules.length) return { ...DEFAULT_CUSTOM_PLAN, ...savedPlan, modules: DEFAULT_CUSTOM_PLAN.modules };

  const byId = new Map<string, Record<string, unknown>>();
  for (const m of savedModules as Record<string, unknown>[]) {
    if (m && typeof m.id === "string") byId.set(m.id, m);
  }
  const merged = DEFAULT_CUSTOM_PLAN.modules.map((def) => {
    const override = byId.get(def.id);
    byId.delete(def.id);
    // `standalone` is a catalog fact, not a price — never let a stale saved
    // entry drop it.
    return override ? { ...def, ...override, standalone: def.standalone } : def;
  });
  return { ...DEFAULT_CUSTOM_PLAN, ...savedPlan, modules: [...merged, ...Array.from(byId.values())] };
}

export async function GET() {
  try {
    const [latest, pkrLatest] = await Promise.all([
      prisma.activityLog.findFirst({
        where: { action: "PLAN_CONFIG" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.activityLog.findFirst({
        where: { action: "PKR_PLAN_CONFIG" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // PKR pricing — admin-set PKR prices (null if not configured yet)
    const pkrPricing = pkrLatest?.details
      ? (() => {
          const p = JSON.parse(pkrLatest.details)?.pricing;
          if (!p) return null;
          return {
            starter:    { monthly: p.starter?.monthly    ?? 4999,  yearly: (p.starter?.yearly    ?? 3999)  * 12 },
            pro:        { monthly: p.pro?.monthly        ?? 9999,  yearly: (p.pro?.yearly        ?? 7999)  * 12 },
            enterprise: { monthly: p.enterprise?.monthly ?? 24999, yearly: (p.enterprise?.yearly ?? 19999) * 12 },
          };
        })()
      : null;

    if (!latest?.details) {
      return NextResponse.json({
        pricing: DEFAULT_PRICING,
        planLimits: DEFAULT_PLAN_LIMITS,
        branchLimits: DEFAULT_BRANCH_LIMITS,
        seatPricing: DEFAULT_SEAT_PRICING,
        customPlan: DEFAULT_CUSTOM_PLAN,
        planHighlights: DEFAULT_PLAN_HIGHLIGHTS,
        features: null,
        featureMatrix: null,
        pkrPricing,
        updatedAt: null,
      });
    }

    const payload = JSON.parse(latest.details);
    const adminPricing = payload?.pricing;

    if (adminPricing) {
      // Admin stores per-month yearly price → convert to annual total for public API
      const pricing = {
        starter:    { monthly: adminPricing.starter?.monthly    ?? 49,  yearly: (adminPricing.starter?.yearly    ?? 39)  * 12 },
        pro:        { monthly: adminPricing.pro?.monthly        ?? 99,  yearly: (adminPricing.pro?.yearly        ?? 79)  * 12 },
        enterprise: { monthly: adminPricing.enterprise?.monthly ?? 249, yearly: (adminPricing.enterprise?.yearly ?? 199) * 12 },
      };
      return NextResponse.json({
        pricing,
        planLimits: payload?.planLimits ?? DEFAULT_PLAN_LIMITS,
        branchLimits: payload?.branchLimits ?? DEFAULT_BRANCH_LIMITS,
        seatPricing: payload?.seatPricing
          ? {
              monthly: Number(payload.seatPricing?.monthly ?? DEFAULT_SEAT_PRICING.monthly),
              yearly: Number(payload.seatPricing?.yearly ?? 6) * 12,
            }
          : DEFAULT_SEAT_PRICING,
        customPlan: mergeCustomPlan(payload?.customPlan),
        planHighlights: normalizePlanHighlights(payload?.planHighlights),
        features: payload?.features ?? null,
        featureMatrix: payload?.featureMatrix ?? null,
        pkrPricing,
        updatedAt: latest.createdAt,
      });
    }

    return NextResponse.json({
      pricing: DEFAULT_PRICING,
      planLimits: DEFAULT_PLAN_LIMITS,
      branchLimits: DEFAULT_BRANCH_LIMITS,
      seatPricing: DEFAULT_SEAT_PRICING,
      customPlan: DEFAULT_CUSTOM_PLAN,
      planHighlights: DEFAULT_PLAN_HIGHLIGHTS,
      features: null,
      featureMatrix: null,
      pkrPricing,
      updatedAt: latest.createdAt,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { pricing: DEFAULT_PRICING, planLimits: DEFAULT_PLAN_LIMITS, branchLimits: DEFAULT_BRANCH_LIMITS, seatPricing: DEFAULT_SEAT_PRICING, customPlan: DEFAULT_CUSTOM_PLAN, planHighlights: DEFAULT_PLAN_HIGHLIGHTS, pkrPricing: null, error: e instanceof Error ? e.message : "unknown" },
      { status: 200 },
    );
  }
}
