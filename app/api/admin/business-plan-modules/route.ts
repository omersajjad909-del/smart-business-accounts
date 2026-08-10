/**
 * /api/admin/business-plan-modules
 *
 * GET  — returns saved per-business-per-plan module config
 * POST — saves per-business-per-plan module config
 *
 * Two maps, both keyed the same way —
 *   config     — module keys   Record<businessType, Record<Plan, ModuleKey[]>>
 *   pageConfig — dashboard page ids  Record<businessType, Record<Plan, FeatureId[]>>
 *
 * `pageConfig` was added so every page a business type owns — including the 24
 * AI tools and the per-industry control centres — can be assigned to a plan
 * from one screen. Before it, `/admin/permissions` only knew 114 coarse module
 * keys while the sidebar gated 289 pages through `/admin/plans`, so most pages
 * appeared nowhere in this screen.
 *
 * Stored in ActivityLog with action = "BUSINESS_PLAN_MODULES_CONFIG". Rows
 * written before `pageConfig` existed hold the bare `config` object, so GET
 * accepts both the wrapped and unwrapped shapes.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

// Two independent copies of this config, chosen by ?scope=.
//   WORLD — Plans → Pages & Modules       (every non-Pakistan company)
//   PKR   — Plans → PKR Pages & Modules   (Pakistan companies)
// Separate keys, never merged: an admin editing one screen must not silently
// move pages for the other audience.
const ACTION_KEYS = {
  WORLD: "BUSINESS_PLAN_MODULES_CONFIG",
  PKR:   "PKR_BUSINESS_PLAN_MODULES_CONFIG",
} as const;

export type PageScope = keyof typeof ACTION_KEYS;

function scopeFrom(req: NextRequest): PageScope {
  return String(new URL(req.url).searchParams.get("scope") || "").toUpperCase() === "PKR"
    ? "PKR"
    : "WORLD";
}

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try {
    const p = verifyJwt(getTokenFromRequest(req as any)!);
    return String(p?.role || "").toUpperCase() === "ADMIN";
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: ACTION_KEYS[scopeFrom(req)] },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    const parsed = log?.details ? JSON.parse(log.details) : {};
    const wrapped =
      parsed && typeof parsed === "object" &&
      ("config" in parsed || "pageConfig" in parsed);

    return NextResponse.json({
      config: wrapped ? (parsed.config || {}) : parsed,
      pageConfig: wrapped ? (parsed.pageConfig || {}) : {},
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { config, pageConfig } = await req.json();
    if (!config || typeof config !== "object") {
      return NextResponse.json({ error: "Invalid config" }, { status: 400 });
    }
    if (pageConfig !== undefined && (pageConfig === null || typeof pageConfig !== "object")) {
      return NextResponse.json({ error: "Invalid pageConfig" }, { status: 400 });
    }

    await prisma.activityLog.create({
      data: {
        action: ACTION_KEYS[scopeFrom(req)],
        details: JSON.stringify({ config, pageConfig: pageConfig || {} }),
        userId: null,
        companyId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
