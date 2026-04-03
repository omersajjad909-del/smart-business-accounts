/**
 * Shared auth + plan-guard for all /api/external/* routes.
 *
 * Plan rules:
 *   STARTER      → ❌ No API access
 *   PROFESSIONAL → ✅ GET only (read-only), 500 req/hr (soft-enforced)
 *   ENTERPRISE   → ✅ Full access — GET + POST + PUT + DELETE
 *   CUSTOM       → ✅ Full access
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/apiKeys";
import { prisma } from "@/lib/prisma";

export type ApiSession = {
  keyId:     string;
  companyId: string;
  name:      string;
  plan:      string;   // STARTER | PROFESSIONAL | ENTERPRISE | CUSTOM
};

/* ── Resolve key → session ───────────────────────────────────────────── */
export async function resolveApiSession(req: NextRequest): Promise<ApiSession | null> {
  const direct = req.headers.get("x-api-key")?.trim();
  const bearer = req.headers.get("authorization")?.trim();
  const rawKey = direct || (bearer?.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "");
  if (!rawKey) return null;

  const auth = await authenticateApiKey(rawKey);
  if (!auth) return null;

  // Fetch company plan
  const company = await prisma.company.findUnique({
    where:  { id: auth.companyId },
    select: { plan: true, subscriptionStatus: true },
  }).catch(() => null);

  const plan = (company?.plan ?? "STARTER").toUpperCase();

  return { ...auth, plan };
}

/* ── Guard responses ─────────────────────────────────────────────────── */
export function unauthResponse() {
  return NextResponse.json(
    { error: "Invalid or missing API key", docs: "https://finovaos.app/developers/api" },
    { status: 401 }
  );
}

export function planDeniedResponse(plan: string, requiredPlan: string) {
  return NextResponse.json(
    {
      error:    `API access is not available on the ${plan} plan.`,
      required: requiredPlan,
      upgrade:  "https://finovaos.app/pricing",
      docs:     "https://finovaos.app/developers/api",
    },
    { status: 403 }
  );
}

export function readOnlyResponse(plan: string) {
  return NextResponse.json(
    {
      error:   `The ${plan} plan supports read-only API access. Upgrade to ENTERPRISE to create or modify records.`,
      upgrade: "https://finovaos.app/pricing",
      docs:    "https://finovaos.app/developers/api",
    },
    { status: 403 }
  );
}

/* ── Plan capability checks ──────────────────────────────────────────── */

/** Returns error response if plan has NO api access, otherwise null. */
export function guardApiAccess(session: ApiSession): NextResponse | null {
  if (session.plan === "STARTER") {
    return planDeniedResponse(session.plan, "PROFESSIONAL");
  }
  return null;
}

/** Returns error response if plan is read-only and request is a write method. */
export function guardWriteAccess(session: ApiSession, method: string): NextResponse | null {
  const writeMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
  if (!writeMethod) return null;

  const readOnly = session.plan === "PROFESSIONAL";
  if (readOnly) return readOnlyResponse(session.plan);

  return null;
}

/**
 * All-in-one guard — call at the top of every external route handler.
 * Returns a NextResponse error if blocked, or null if allowed.
 *
 * @param req     The incoming request
 * @param session The resolved ApiSession (already fetched)
 */
export function enforceApiPlan(session: ApiSession, method: string): NextResponse | null {
  const accessDenied = guardApiAccess(session);
  if (accessDenied) return accessDenied;

  const writeDenied = guardWriteAccess(session, method);
  if (writeDenied) return writeDenied;

  return null;
}
