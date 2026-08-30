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

/**
 * How far past a hand-granted access period we are.
 *
 * Only a manual grant — an offline deal paid by bank transfer — sets this
 * date, so a gateway subscriber is never touched by it: their renewal webhook
 * keeps billing moving and the column stays null. It exists because nothing
 * else ends a granted period. `subscriptionStatus` is what the guards read,
 * `currentPeriodEnd` is read by no guard at all, and platform-dunning only
 * reacts to failed payments — so a company granted three years stayed ACTIVE
 * for good.
 *
 * Expiry gets the same shape as a cancellation: writes stop at once, reads
 * survive 30 days so the customer can export what is theirs while a renewal
 * is being agreed, and after that the account is closed.
 */
function manualGrantState(until: Date | null | undefined): "ok" | "grace" | "expired" {
  if (!until) return "ok";
  const overdueMs = Date.now() - until.getTime();
  if (overdueMs <= 0) return "ok";
  return overdueMs <= 30 * 24 * 60 * 60 * 1000 ? "grace" : "expired";
}

function grantEndedMessage(until: Date, grace: boolean): string {
  const d = String(until.getDate()).padStart(2, "0");
  const m = String(until.getMonth() + 1).padStart(2, "0");
  const on = d + "-" + m + "-" + until.getFullYear();
  return grace
    ? "Your access period ended on " + on + ". Read-only export stays open for 30 days; renew to restore full access."
    : "Your access period ended on " + on + ". Please renew to continue.";
}

export async function requireEntitlement(req: Request, entitlement: string) {
  const companyId = await resolveCompanyId(req as any);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, subscriptionStatus: true, cancelledAt: true, accessGrantedUntil: true },
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

  // A hand-granted period that has run out ends access even though the status
  // still reads ACTIVE — nothing else moves it off ACTIVE.
  const grantedUntil = company?.accessGrantedUntil ?? null;
  const grantState = manualGrantState(grantedUntil);
  if (grantedUntil && grantState !== "ok") {
    if (grantState === "grace" && isReadOnlyRequest(req.method)) {
      return null;
    }
    return NextResponse.json(
      { error: grantEndedMessage(grantedUntil, grantState === "grace") },
      { status: 402 },
    );
  }

  // The per-plan feature ladder an admin edits in /admin/plans.
  //
  // The lookup used to carry `companyId: "system"`, which nothing in the
  // codebase ever writes — /api/admin/plan-config saves with `companyId: null`.
  // So the row was never found and the fallback table below silently decided
  // every entitlement, i.e. the admin's saved plans never took effect here.
  const latestConfig = await prisma.activityLog.findFirst({
    where: { action: "PLAN_CONFIG" },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });

  type EntitlementConfig = { plans: { code: string; name: string; features: Record<string, boolean> }[] };

  const defaultConfig: EntitlementConfig = {
    plans: [
      { code: "starter",    name: "Starter",      features: { viewDashboard: true, createSalesInvoice: true, createPurchaseInvoice: true, viewLedger: true, viewTrialBalance: true, advancedReports: false, bankReconciliation: true,  inventoryReports: false, crm: false, hrPayroll: false, backupRestore: false, prioritySupport: false, multiBranch: false, apiAccess: false } },
      { code: "pro",        name: "Professional", features: { viewDashboard: true, createSalesInvoice: true, createPurchaseInvoice: true, viewLedger: true, viewTrialBalance: true, advancedReports: true,  bankReconciliation: true,  inventoryReports: true,  crm: true,  hrPayroll: false, backupRestore: true,  prioritySupport: true,  multiBranch: true,  apiAccess: false } },
      { code: "enterprise", name: "Enterprise",   features: { viewDashboard: true, createSalesInvoice: true, createPurchaseInvoice: true, viewLedger: true, viewTrialBalance: true, advancedReports: true,  bankReconciliation: true,  inventoryReports: true,  crm: true,  hrPayroll: true,  backupRestore: true,  prioritySupport: true,  multiBranch: true,  apiAccess: true  } },
      { code: "custom",     name: "Custom",       features: { viewDashboard: true, createSalesInvoice: false, createPurchaseInvoice: false, viewLedger: true, viewTrialBalance: true, advancedReports: false, bankReconciliation: false, inventoryReports: false, crm: false, hrPayroll: false, backupRestore: false, prioritySupport: false, multiBranch: false, apiAccess: false } },
    ],
  };

  // A saved row that carries no usable `plans` array (an older save, or a
  // partial one) must not blank the ladder — that would 402 every gated route.
  let config = defaultConfig;
  try {
    const saved = latestConfig?.details ? JSON.parse(latestConfig.details) : null;
    if (Array.isArray(saved?.plans) && saved.plans.length > 0) config = saved as EntitlementConfig;
  } catch {}

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
    select: { subscriptionStatus: true, cancelledAt: true, accessGrantedUntil: true },
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

  // A hand-granted period that has run out ends access even though the status
  // still reads ACTIVE — nothing else moves it off ACTIVE.
  const grantedUntil = company?.accessGrantedUntil ?? null;
  const grantState = manualGrantState(grantedUntil);
  if (grantedUntil && grantState !== "ok") {
    if (grantState === "grace" && isReadOnlyRequest(req.method)) {
      return null;
    }
    return NextResponse.json(
      { error: grantEndedMessage(grantedUntil, grantState === "grace") },
      { status: 402 },
    );
  }
  return null;
}
