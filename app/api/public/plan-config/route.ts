import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";
import { createDefaultDashboardFeatureFlags } from "@/lib/dashboardFeatureRegistry";

const DEFAULT_PRICING = {
  starter:    { monthly: 49,  yearly: 39  },
  pro:        { monthly: 99,  yearly: 79  },
  enterprise: { monthly: 249, yearly: 199 },
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

      if (!saved.dashboardFeatureFlags || typeof saved.dashboardFeatureFlags !== "object") {
        saved.dashboardFeatureFlags = createDefaultDashboardFeatureFlags();
      } else {
        saved.dashboardFeatureFlags = {
          ...createDefaultDashboardFeatureFlags(),
          ...saved.dashboardFeatureFlags,
        };
      }

      return NextResponse.json(saved);
    }

    // No saved config — return full defaults
    return NextResponse.json({
      pricing: DEFAULT_PRICING,
      features: DEFAULT_FEATURES,
      featureMatrix: DEFAULT_FEATURE_MATRIX,
      planLimits: { starter: 5, pro: 20, enterprise: null },
      planPermissions: {
        STARTER:    PLAN_DEFAULT_PERMISSIONS.STARTER,
        PRO:        PLAN_DEFAULT_PERMISSIONS.PRO,
        ENTERPRISE: PLAN_DEFAULT_PERMISSIONS.ENTERPRISE,
        CUSTOM:     [],
      },
      dashboardFeatureFlags: createDefaultDashboardFeatureFlags(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
