import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";
import { DASHBOARD_FEATURE_IDS, createDefaultDashboardFeatureFlags } from "@/lib/dashboardFeatureRegistry";

const DEFAULT_PRICING = {
  starter:    { monthly: 49,  yearly: 39  },
  pro:        { monthly: 99,  yearly: 79  },
  enterprise: { monthly: 249, yearly: 199 },
};
const DEFAULT_SEAT_PRICING = {
  monthly: 7,
  yearly: 6,
};

const DEFAULT_FEATURES = [
  "Sales Invoices","Purchase Invoices","Ledger & Trial Balance","Chart of Accounts",
  "Bank Reconciliation","Payment Receipts","Expense Management","Credit & Debit Notes",
  "Inventory Management","Inventory Reports","Purchase Orders","Goods Receipt Notes",
  "Advanced Reports","Financial Statements","Audit Logs","Recurring Transactions",
  "CRM","HR & Payroll","Multi-Branch","Department Budgets",
  "Backup & Restore","API Access","Priority Support","Custom Integrations",
];

const DEFAULT_FEATURE_MATRIX = {
  starter: [
    "Sales Invoices","Purchase Invoices","Ledger & Trial Balance","Chart of Accounts",
    "Bank Reconciliation","Payment Receipts","Expense Management","Credit & Debit Notes",
  ],
  pro: [
    "Sales Invoices","Purchase Invoices","Ledger & Trial Balance","Chart of Accounts",
    "Bank Reconciliation","Payment Receipts","Expense Management","Credit & Debit Notes",
    "Inventory Management","Inventory Reports","Purchase Orders","Goods Receipt Notes",
    "Advanced Reports","Financial Statements","Audit Logs","Recurring Transactions",
    "CRM","Multi-Branch","Department Budgets","Backup & Restore","Priority Support",
  ],
  enterprise: [...DEFAULT_FEATURES],
};

function normalizePlanPermissions(savedPlanPermissions?: Record<string, string[]>) {
  const saved = savedPlanPermissions || {};
  const hasAnySaved =
    Array.isArray(saved.STARTER) ||
    Array.isArray(saved.starter) ||
    Array.isArray(saved.PRO) ||
    Array.isArray(saved.pro) ||
    Array.isArray(saved.ENTERPRISE) ||
    Array.isArray(saved.enterprise) ||
    Array.isArray(saved.CUSTOM) ||
    Array.isArray(saved.custom);

  if (!hasAnySaved) {
    return {
      STARTER: PLAN_DEFAULT_PERMISSIONS.STARTER,
      PRO: PLAN_DEFAULT_PERMISSIONS.PRO,
      ENTERPRISE: PLAN_DEFAULT_PERMISSIONS.ENTERPRISE,
      CUSTOM: [],
    };
  }

  return {
    STARTER: Array.isArray(saved.STARTER) ? saved.STARTER : Array.isArray(saved.starter) ? saved.starter : [],
    PRO: Array.isArray(saved.PRO) ? saved.PRO : Array.isArray(saved.pro) ? saved.pro : [],
    ENTERPRISE: Array.isArray(saved.ENTERPRISE) ? saved.ENTERPRISE : Array.isArray(saved.enterprise) ? saved.enterprise : [],
    CUSTOM: Array.isArray(saved.CUSTOM) ? saved.CUSTOM : Array.isArray(saved.custom) ? saved.custom : [],
  };
}

function normalizeDashboardFeatureFlags(savedFlags?: Record<string, string[]>) {
  const defaults = createDefaultDashboardFeatureFlags();
  const saved = savedFlags || {};
  const clean = (list: string[] | undefined, fallback: string[]) =>
    Array.isArray(list) ? list.filter((id) => DASHBOARD_FEATURE_IDS.includes(id)) : fallback;

  return {
    STARTER: clean(saved.STARTER || saved.starter, defaults.STARTER),
    PRO: clean(saved.PRO || saved.pro, defaults.PRO),
    ENTERPRISE: clean(saved.ENTERPRISE || saved.enterprise, defaults.ENTERPRISE),
    CUSTOM: clean(saved.CUSTOM || saved.custom, defaults.CUSTOM),
  };
}

async function loadGloballyHiddenDashboardFeatures(): Promise<Set<string>> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: "PAGE_VISIBILITY_CONFIG" },
      orderBy: { createdAt: "desc" },
    });
    return new Set(log?.details ? JSON.parse(log.details) as string[] : []);
  } catch {
    return new Set();
  }
}

function applyGlobalVisibility(flags: Record<string, string[]>, hidden: Set<string>) {
  if (hidden.size === 0) return flags;
  return Object.fromEntries(
    Object.entries(flags).map(([plan, ids]) => [plan, ids.filter((id) => !hidden.has(id))])
  );
}

export async function GET(req: NextRequest) {
  try {
    const latest = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG" },
      orderBy: { createdAt: "desc" },
    });

    if (latest?.details) {
      const saved = JSON.parse(latest.details);

      // Ensure planLimits always present
      if (!saved.planLimits) saved.planLimits = { starter: 5, pro: 20, enterprise: null };
      if (!saved.seatPricing) saved.seatPricing = DEFAULT_SEAT_PRICING;

      // Ensure features + featureMatrix always present (may be missing in old saves)
      if (!saved.features || saved.features.length === 0) saved.features = DEFAULT_FEATURES;
      if (!saved.featureMatrix) saved.featureMatrix = DEFAULT_FEATURE_MATRIX;

      // Fix any plan where monthly/yearly was accidentally saved as 0
      if (saved.pricing) {
        for (const plan of ["starter", "pro", "enterprise"] as const) {
          if (!saved.pricing[plan]) saved.pricing[plan] = DEFAULT_PRICING[plan];
          if (!saved.pricing[plan].monthly) saved.pricing[plan].monthly = DEFAULT_PRICING[plan].monthly;
          if (!saved.pricing[plan].yearly)  saved.pricing[plan].yearly  = DEFAULT_PRICING[plan].yearly;
        }
      } else {
        saved.pricing = DEFAULT_PRICING;
      }

      const hiddenDashboardFeatures = await loadGloballyHiddenDashboardFeatures();
      saved.dashboardFeatureFlags = applyGlobalVisibility(
        normalizeDashboardFeatureFlags(saved.dashboardFeatureFlags),
        hiddenDashboardFeatures
      );

      saved.planPermissions = normalizePlanPermissions(saved.planPermissions);

      return NextResponse.json(saved);
    }

    // No saved config — return full defaults
    const hiddenDashboardFeatures = await loadGloballyHiddenDashboardFeatures();
    return NextResponse.json({
      pricing: DEFAULT_PRICING,
      seatPricing: DEFAULT_SEAT_PRICING,
      features: DEFAULT_FEATURES,
      featureMatrix: DEFAULT_FEATURE_MATRIX,
      planLimits: { starter: 5, pro: 20, enterprise: null },
      planPermissions: {
        ...normalizePlanPermissions(),
      },
      dashboardFeatureFlags: applyGlobalVisibility(normalizeDashboardFeatureFlags(), hiddenDashboardFeatures),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
