import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";
import { createDefaultDashboardFeatureFlags } from "@/lib/dashboardFeatureRegistry";

const ADMIN_ONLY = "ADMIN";

// Canonical plan pricing — single source of truth
const DEFAULT_PRICING = {
  starter:    { monthly: 49,  yearly: 39  },
  pro:        { monthly: 99,  yearly: 79  },
  enterprise: { monthly: 249, yearly: 199 },
};
const DEFAULT_SEAT_PRICING = {
  monthly: 7,
  yearly: 6,
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

// Canonical default plan config returned when no admin override exists
const DEFAULT_CONFIG = {
  pricing: DEFAULT_PRICING,
  seatPricing: DEFAULT_SEAT_PRICING,
  planLimits: DEFAULT_PLAN_LIMITS,
  branchLimits: DEFAULT_BRANCH_LIMITS,
  plans: [
    {
      code: "starter", name: "Starter",
      features: {
        viewDashboard: true, createSalesInvoice: true, createPurchaseInvoice: true,
        viewLedger: true, viewTrialBalance: true,
        advancedReports: false, bankReconciliation: true, inventoryReports: false,
        crm: false, hrPayroll: false, backupRestore: false,
        prioritySupport: false, multiBranch: false, apiAccess: false,
        aiAssistant: false, aiBusinessOperator: false, aiSmartSuggestions: false,
        aiForecast: false, aiAnomalyDetection: false, aiExpenseCategorization: false,
        aiNaturalLanguage: false, aiCashFlowPrediction: false,
      },
    },
    {
      code: "pro", name: "Professional",
      features: {
        viewDashboard: true, createSalesInvoice: true, createPurchaseInvoice: true,
        viewLedger: true, viewTrialBalance: true,
        advancedReports: true, bankReconciliation: true, inventoryReports: true,
        crm: true, hrPayroll: false, backupRestore: true,
        prioritySupport: true, multiBranch: true, apiAccess: false,
        aiAssistant: true, aiBusinessOperator: false, aiSmartSuggestions: true,
        aiForecast: false, aiAnomalyDetection: false, aiExpenseCategorization: true,
        aiNaturalLanguage: false, aiCashFlowPrediction: false,
      },
    },
    {
      code: "enterprise", name: "Enterprise",
      features: {
        viewDashboard: true, createSalesInvoice: true, createPurchaseInvoice: true,
        viewLedger: true, viewTrialBalance: true,
        advancedReports: true, bankReconciliation: true, inventoryReports: true,
        crm: true, hrPayroll: true, backupRestore: true,
        prioritySupport: true, multiBranch: true, apiAccess: true,
        aiAssistant: true, aiBusinessOperator: true, aiSmartSuggestions: true,
        aiForecast: true, aiAnomalyDetection: true, aiExpenseCategorization: true,
        aiNaturalLanguage: true, aiCashFlowPrediction: true,
      },
    },
    {
      code: "custom", name: "Custom",
      features: {
        viewDashboard: true, createSalesInvoice: false, createPurchaseInvoice: false,
        viewLedger: true, viewTrialBalance: true,
        advancedReports: false, bankReconciliation: false, inventoryReports: false,
        crm: false, hrPayroll: false, backupRestore: false,
        prioritySupport: false, multiBranch: false, apiAccess: false,
        aiAssistant: false, aiBusinessOperator: false, aiSmartSuggestions: false,
        aiForecast: false, aiAnomalyDetection: false, aiExpenseCategorization: false,
        aiNaturalLanguage: false, aiCashFlowPrediction: false,
      },
    },
  ],
  planPermissions: {
    STARTER:    PLAN_DEFAULT_PERMISSIONS.STARTER,
    PRO:        PLAN_DEFAULT_PERMISSIONS.PRO,
    ENTERPRISE: PLAN_DEFAULT_PERMISSIONS.ENTERPRISE,
    CUSTOM:     [],
  },
  dashboardFeatureFlags: createDefaultDashboardFeatureFlags(),
};

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    if (userRole !== ADMIN_ONLY) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const latest = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG" },
      orderBy: { createdAt: "desc" },
    });

    if (latest?.details) {
      const saved = JSON.parse(latest.details);
      // Always merge pricing — ensure it's always present even in old saved configs
      return NextResponse.json({
        ...DEFAULT_CONFIG,
        ...saved,
        pricing: { ...DEFAULT_PRICING, ...(saved.pricing || {}) },
        seatPricing: { ...DEFAULT_SEAT_PRICING, ...(saved.seatPricing || {}) },
        dashboardFeatureFlags: {
          ...createDefaultDashboardFeatureFlags(),
          ...(saved.dashboardFeatureFlags || {}),
        },
      });
    }

    return NextResponse.json(DEFAULT_CONFIG);
  } catch (e) {
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");
    const userId   = req.headers.get("x-user-id");
    if (userRole !== ADMIN_ONLY) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // userId may be from AdminUser table (not User table) — use null to avoid FK error
    await prisma.activityLog.create({
      data: {
        action: "PLAN_CONFIG",
        details: JSON.stringify(body),
        userId: null,
        companyId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("plan-config save error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
