/**
 * app/api/billing/dunning/route.ts
 *
 * GET  /api/billing/dunning                       — list entries (?status=active)
 * GET  /api/billing/dunning?action=stats          — stats summary
 * POST /api/billing/dunning                       — start dunning
 * POST /api/billing/dunning?action=process        — process due retries (cron)
 * POST /api/billing/dunning?action=resolve&id=    — mark resolved
 * POST /api/billing/dunning?action=cancel&id=     — cancel dunning
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/apiError";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import {
  startDunning,
  processDunningQueue,
  resolveDunning,
  cancelDunning,
  getDunningEntries,
  getDunningStats,
} from "@/lib/dunning";

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
    // Cron jobs may or may not supply a company id
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
    const { companyId, isCron } = await resolveAuth(req);
    const url    = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "stats") {
      if (!companyId) return apiError("Company ID required", 400);
      const stats = await getDunningStats(companyId);
      return apiOk(stats);
    }

    if (!companyId && !isCron) return apiError("Company ID required", 400);
    if (!companyId)            return apiError("Company ID required for list", 400);

    const status  = url.searchParams.get("status") ?? undefined;
    const entries = await getDunningEntries(companyId, status);
    return apiOk({ entries });
  } catch (err) {
    console.error("[billing/dunning GET]", err);
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

    // ── process (cron) ──────────────────────────────────────────────────────
    if (action === "process") {
      if (!isCron && !companyId) return apiError("Unauthorized", 401);
      // companyId may be undefined — processDunningQueue handles that (processes all)
      const result = await processDunningQueue(companyId ?? undefined);
      return apiOk({ ok: true, ...result });
    }

    // ── resolve ─────────────────────────────────────────────────────────────
    if (action === "resolve") {
      if (!companyId) return apiError("Company ID required", 400);
      const id = url.searchParams.get("id");
      if (!id) return apiError("Entry id required", 400);
      await resolveDunning(id);
      return apiOk({ ok: true, id });
    }

    // ── cancel ──────────────────────────────────────────────────────────────
    if (action === "cancel") {
      if (!companyId) return apiError("Company ID required", 400);
      const id = url.searchParams.get("id");
      if (!id) return apiError("Entry id required", 400);
      await cancelDunning(id);
      return apiOk({ ok: true, id });
    }

    // ── start dunning (default) ──────────────────────────────────────────────
    if (!companyId) return apiError("Company ID required", 400);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      invoiceId,
      amount,
      currency,
    } = body as Record<string, string | number>;

    if (!customerId)    return apiError("customerId is required",    400);
    if (!customerName)  return apiError("customerName is required",  400);
    if (!customerEmail) return apiError("customerEmail is required", 400);
    if (!invoiceId)     return apiError("invoiceId is required",     400);
    if (amount === undefined || amount === null || amount === "")
      return apiError("amount is required", 400);

    const entry = await startDunning(companyId, {
      companyId,
      customerId:    String(customerId),
      customerName:  String(customerName),
      customerEmail: String(customerEmail),
      customerPhone: String(customerPhone ?? ""),
      invoiceId:     String(invoiceId),
      amount:        Number(amount),
      currency:      String(currency ?? "USD"),
    });

    return apiOk({ ok: true, entry }, 201);
  } catch (err) {
    console.error("[billing/dunning POST]", err);
    return apiError("Internal server error", 500);
  }
}
