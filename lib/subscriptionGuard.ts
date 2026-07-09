import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// Statuses with full access
const ALLOWED_STATUSES = ["ACTIVE", "TRIALING"];

// Read-only phase (Privacy Policy Phase 1: Days 1-30 after cancel; ToS: 7-day
// read-only window after payment failure). During this window, GET requests
// succeed so users can log in and export data. Mutations are rejected with 402.
function isReadOnlyRequest(method: string): boolean {
  return method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD";
}

function inReadOnlyGracePeriod(status: string, cancelledAt: Date | null): boolean {
  // Platform dunning read-only phase (payment failed 7+ days ago, not yet suspended)
  if (status === "READ_ONLY") return true;
  // Cancellation grace period (Days 1-30 after cancel)
  if (status !== "CANCELLED") return false;
  if (!cancelledAt) return false;
  const daysSinceCancel = (Date.now() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCancel <= 30;
}

export async function requireEntitlement(req: Request, entitlement: string) {
  const companyId = await resolveCompanyId(req as any);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, subscriptionStatus: true, cancelledAt: true },
  });

  const plan   = (company?.plan || "STARTER").toUpperCase();
  const status = (company?.subscriptionStatus || "ACTIVE").toUpperCase();

  if (!ALLOWED_STATUSES.includes(status)) {
    // Phase 1 read-only: allow GET/HEAD for cancelled accounts within 30 days
    if (inReadOnlyGracePeriod(status, company?.cancelledAt ?? null) && isReadOnlyRequest(req.method)) {
      return null;
    }
    return NextResponse.json(
      {
        error: status === "CANCELLED"
          ? "Account cancelled. Read-only export is available for 30 days after cancellation; write operations are blocked."
          : "Subscription inactive. Please upgrade your plan.",
      },
      { status: 402 }
    );
  }

  // Fetch the latest plan configuration from the audit log
  const latestConfig = await prisma.activityLog.findFirst({
    where: { action: "PLAN_CONFIG", companyId: "system" },
    orderBy: { createdAt: "desc" },
  });

  const defaultConfig = {
    plans: [
      { code: "starter",    name: "Starter",      features: { viewDashboard: true, createSalesInvoice: true, createPurchaseInvoice: true, viewLedger: true, viewTrialBalance: true, advancedReports: false, bankReconciliation: true,  inventoryReports: false, crm: false, hrPayroll: false, backupRestore: false, prioritySupport: false, multiBranch: false, apiAccess: false } },
      { code: "pro",        name: "Professional", features: { viewDashboard: true, createSalesInvoice: true, createPurchaseInvoice: true, viewLedger: true, viewTrialBalance: true, advancedReports: true,  bankReconciliation: true,  inventoryReports: true,  crm: true,  hrPayroll: false, backupRestore: true,  prioritySupport: true,  multiBranch: true,  apiAccess: false } },
      { code: "enterprise", name: "Enterprise",   features: { viewDashboard: true, createSalesInvoice: true, createPurchaseInvoice: true, viewLedger: true, viewTrialBalance: true, advancedReports: true,  bankReconciliation: true,  inventoryReports: true,  crm: true,  hrPayroll: true,  backupRestore: true,  prioritySupport: true,  multiBranch: true,  apiAccess: true  } },
      { code: "custom",     name: "Custom",       features: { viewDashboard: true, createSalesInvoice: false, createPurchaseInvoice: false, viewLedger: true, viewTrialBalance: true, advancedReports: false, bankReconciliation: false, inventoryReports: false, crm: false, hrPayroll: false, backupRestore: false, prioritySupport: false, multiBranch: false, apiAccess: false } },
    ],
  };

  const config = latestConfig?.details ? JSON.parse(latestConfig.details) : defaultConfig;

  // PRO_PLUS is treated as Enterprise (legacy compatibility)
  const planCodeMap: Record<string, string> = {
    PRO_PLUS: "enterprise", PRO: "pro", ENTERPRISE: "enterprise", STARTER: "starter", CUSTOM: "custom",
  };
  const planCode   = planCodeMap[plan] ?? "starter";
  const currentPlan = Array.isArray(config?.plans)
    ? config.plans.find((p: any) => p.code === planCode)
    : null;

  const hasFeature = !!currentPlan?.features?.[entitlement];

  if (!hasFeature) {
    return NextResponse.json(
      { error: `Upgrade required to access this feature. (Required: ${currentPlan?.name || "Pro"})` },
      { status: 402 }
    );
  }

  return null;
}

export async function requireActiveSubscription(req: Request) {
  const companyId = await resolveCompanyId(req as any);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { subscriptionStatus: true, cancelledAt: true },
  });
  const status = (company?.subscriptionStatus || "ACTIVE").toUpperCase();
  if (!ALLOWED_STATUSES.includes(status)) {
    if (inReadOnlyGracePeriod(status, company?.cancelledAt ?? null) && isReadOnlyRequest(req.method)) {
      return null;
    }
    return NextResponse.json(
      {
        error: status === "CANCELLED"
          ? "Account cancelled. Read-only access is available for 30 days after cancellation; write operations are blocked."
          : "Subscription inactive. Please renew your plan.",
      },
      { status: 402 }
    );
  }
  return null;
}
