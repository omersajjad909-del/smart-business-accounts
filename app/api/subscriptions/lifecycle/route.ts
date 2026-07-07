/**
 * app/api/subscriptions/lifecycle/route.ts
 *
 * Subscription lifecycle management — plans, customer subscriptions, renewals.
 *
 * GET    /api/subscriptions/lifecycle                          — list subscriptions (?status=active)
 * GET    /api/subscriptions/lifecycle?action=plans             — list plans
 * GET    /api/subscriptions/lifecycle?action=stats             — MRR, ARR, counts
 * POST   /api/subscriptions/lifecycle                          — create subscription
 * POST   /api/subscriptions/lifecycle?action=create_plan       — create plan
 * POST   /api/subscriptions/lifecycle?action=process           — process renewals (cron)
 * PUT    /api/subscriptions/lifecycle?id=                      — update subscription
 * PUT    /api/subscriptions/lifecycle?action=update_plan&id=   — update plan
 * DELETE /api/subscriptions/lifecycle?id=                      — cancel subscription
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/apiError";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import {
  createPlan,
  updatePlan,
  getPlans,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  getSubscriptions,
  processRenewals,
  getSubscriptionStats,
} from "@/lib/subscriptionLifecycle";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function isCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

async function resolveAuth(
  req: NextRequest,
): Promise<{ companyId: string | null; isCron: boolean }> {
  if (isCronRequest(req)) {
    const companyId = req.headers.get("x-company-id") ?? null;
    return { companyId, isCron: true };
  }
  const companyId = await getAutomationCompanyId(req);
  return { companyId, isCron: false };
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { companyId } = await resolveAuth(req);
    if (!companyId) return apiError("Company ID required", 400);

    const url    = new URL(req.url);
    const action = url.searchParams.get("action");

    // Plans list
    if (action === "plans") {
      const plans = await getPlans(companyId);
      return apiOk({ plans });
    }

    // Stats
    if (action === "stats") {
      const stats = await getSubscriptionStats(companyId);
      return apiOk(stats);
    }

    // Default — subscription list
    const status        = url.searchParams.get("status") ?? undefined;
    const subscriptions = await getSubscriptions(companyId, status);
    return apiOk({ subscriptions });
  } catch (err) {
    console.error("[subscriptions/lifecycle GET]", err);
    return apiError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { companyId, isCron } = await resolveAuth(req);
    const url    = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── process renewals (cron) ─────────────────────────────────────────────
    if (action === "process") {
      if (!isCron && !companyId) return apiError("Unauthorized", 401);
      const result = await processRenewals(companyId ?? undefined);
      return apiOk({ ok: true, ...result });
    }

    // All remaining actions require a company id
    if (!companyId) return apiError("Company ID required", 400);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    // ── create plan ─────────────────────────────────────────────────────────
    if (action === "create_plan") {
      const { name, amount, currency, interval, trialDays, features, active } =
        body as Record<string, unknown>;

      if (!name)     return apiError("name is required",     400);
      if (!amount)   return apiError("amount is required",   400);
      if (!currency) return apiError("currency is required", 400);
      if (!interval) return apiError("interval is required", 400);

      const plan = await createPlan(companyId, {
        name:      String(name),
        amount:    Number(amount),
        currency:  String(currency),
        interval:  String(interval) as "monthly" | "quarterly" | "yearly",
        trialDays: Number(trialDays ?? 0),
        features:  Array.isArray(features) ? (features as string[]) : [],
        active:    active !== false,
      });

      return apiOk({ ok: true, plan }, 201);
    }

    // ── create subscription (default POST) ──────────────────────────────────
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      planId,
      startDate,
    } = body as Record<string, unknown>;

    if (!customerId)    return apiError("customerId is required",    400);
    if (!customerName)  return apiError("customerName is required",  400);
    if (!customerEmail) return apiError("customerEmail is required", 400);
    if (!planId)        return apiError("planId is required",        400);

    const subscription = await createSubscription(companyId, {
      customerId:    String(customerId),
      customerName:  String(customerName),
      customerEmail: String(customerEmail),
      customerPhone: customerPhone ? String(customerPhone) : undefined,
      planId:        String(planId),
      startDate:     startDate ? new Date(String(startDate)) : undefined,
    });

    return apiOk({ ok: true, subscription }, 201);
  } catch (err) {
    console.error("[subscriptions/lifecycle POST]", err);
    return apiError(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
}

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  try {
    const { companyId } = await resolveAuth(req);
    if (!companyId) return apiError("Company ID required", 400);

    const url    = new URL(req.url);
    const action = url.searchParams.get("action");
    const id     = url.searchParams.get("id");
    if (!id) return apiError("id is required", 400);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    // ── update plan ─────────────────────────────────────────────────────────
    if (action === "update_plan") {
      const { name, amount, currency, interval, trialDays, features, active } =
        body as Record<string, unknown>;

      const updated = await updatePlan(id, companyId, {
        ...(name      !== undefined ? { name:      String(name) }                                           : {}),
        ...(amount    !== undefined ? { amount:    Number(amount) }                                         : {}),
        ...(currency  !== undefined ? { currency:  String(currency) }                                       : {}),
        ...(interval  !== undefined ? { interval:  String(interval) as "monthly"|"quarterly"|"yearly" }    : {}),
        ...(trialDays !== undefined ? { trialDays: Number(trialDays) }                                      : {}),
        ...(features  !== undefined ? { features:  Array.isArray(features) ? (features as string[]) : [] } : {}),
        ...(active    !== undefined ? { active:    Boolean(active) }                                        : {}),
      });

      return apiOk({ ok: true, plan: updated });
    }

    // ── update subscription (default PUT) ───────────────────────────────────
    const { status, planId } = body as Record<string, unknown>;

    const updated = await updateSubscription(id, companyId, {
      ...(status !== undefined ? { status: String(status) } : {}),
      ...(planId !== undefined ? { planId: String(planId) } : {}),
    });

    return apiOk({ ok: true, subscription: updated });
  } catch (err) {
    console.error("[subscriptions/lifecycle PUT]", err);
    return apiError(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const { companyId } = await resolveAuth(req);
    if (!companyId) return apiError("Company ID required", 400);

    const url = new URL(req.url);
    const id  = url.searchParams.get("id");
    if (!id) return apiError("id is required", 400);

    let reason: string | undefined;
    try {
      const body = await req.json() as Record<string, unknown>;
      if (typeof body.reason === "string") reason = body.reason;
    } catch {
      // Body is optional for DELETE
    }

    await cancelSubscription(id, reason);
    return apiOk({ ok: true, id });
  } catch (err) {
    console.error("[subscriptions/lifecycle DELETE]", err);
    return apiError("Internal server error", 500);
  }
}
