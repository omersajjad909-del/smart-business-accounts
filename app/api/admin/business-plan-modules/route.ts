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
import {
  readSavedDashboardFeatureFlags,
  resolvePlanWideFeatureFlags,
} from "@/lib/dashboardFeatureRegistry";
import { requireAdmin } from "@/lib/adminAuth";

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
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const [log, planLog] = await Promise.all([
      prisma.activityLog.findFirst({
        where: { action: ACTION_KEYS[scopeFrom(req)] },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }),
      // The plan-wide grid lives in PLAN_CONFIG for both scopes — PKR_PLAN_CONFIG
      // stores pricing and permissions only, never a page grid.
      prisma.activityLog.findFirst({
        where: { action: "PLAN_CONFIG" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      }).catch(() => null),
    ]);
    const parsed = log?.details ? JSON.parse(log.details) : {};
    const wrapped =
      parsed && typeof parsed === "object" &&
      ("config" in parsed || "pageConfig" in parsed);

    return NextResponse.json({
      config: wrapped ? (parsed.config || {}) : parsed,
      pageConfig: wrapped ? (parsed.pageConfig || {}) : {},
      // What a business type with no override actually gets. The grid renders
      // this instead of ticking every box, so it stops promising pages the
      // plan does not grant.
      planFallback: resolvePlanWideFeatureFlags(
        readSavedDashboardFeatureFlags(planLog?.details) || {},
      ),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { config, pageConfig, removed } = await req.json();
    if (!config || typeof config !== "object") {
      return NextResponse.json({ error: "Invalid config" }, { status: 400 });
    }
    if (pageConfig !== undefined && (pageConfig === null || typeof pageConfig !== "object")) {
      return NextResponse.json({ error: "Invalid pageConfig" }, { status: 400 });
    }

    const action = ACTION_KEYS[scopeFrom(req)];

    /* Merge per business type instead of replacing the whole document.
       The grid POSTs the entire map it loaded on mount, so a second tab left
       open on an older snapshot used to overwrite everything saved since —
       one Save in a stale tab silently wiped another business type's whole
       page config back to "all on". Only the types present in this request
       move; everything else keeps whatever was saved last. */
    const prevLog = await prisma.activityLog.findFirst({
      where: { action },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    let prevConfig: Record<string, any> = {};
    let prevPageConfig: Record<string, any> = {};
    try {
      const parsed = prevLog?.details ? JSON.parse(prevLog.details) : {};
      const wrapped = parsed && typeof parsed === "object" &&
        ("config" in parsed || "pageConfig" in parsed);
      prevConfig     = (wrapped ? parsed.config : parsed) || {};
      prevPageConfig = (wrapped ? parsed.pageConfig : {}) || {};
    } catch { /* unreadable row — treat as empty and let this save stand */ }

    const mergedConfig     = { ...prevConfig, ...config };
    const mergedPageConfig = { ...prevPageConfig, ...(pageConfig || {}) };

    // "Reset to Defaults" drops a type's override entirely. A merge can't tell
    // that apart from "not edited", so the client names those types explicitly.
    for (const id of Array.isArray(removed) ? removed : []) {
      delete mergedConfig[String(id)];
      delete mergedPageConfig[String(id)];
    }

    await prisma.activityLog.create({
      data: {
        action,
        details: JSON.stringify({ config: mergedConfig, pageConfig: mergedPageConfig }),
        userId: null,
        companyId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
