import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { resolvePricingRegion } from "@/lib/geoCountry";

// Reads request headers to pick the audience, so it can never be prerendered
// or cached as one shared answer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/public/plan-features
 *
 * The tick/cross state of every row in the /pricing comparison table.
 *
 * Two audiences, two admin screens:
 *   Pakistan  → Plans → PKR Permissions   (PKR_PLAN_CONFIG.planPermissions)
 *   Elsewhere → Plans → Permissions       (PLAN_CONFIG.planPermissions)
 *
 * Which one a visitor gets is decided by the same IP resolver that decides
 * their currency and that /api/billing/checkout charges on, so the table and
 * the price always describe the same offer.
 */

// Maps each permission key → which plans have it by default.
// Admin overrides (saved via /api/admin/plan-config or /api/admin/pkr-plan-config)
// replace these.
const DEFAULT_PLAN_PERMISSIONS = {
  STARTER:    PLAN_DEFAULT_PERMISSIONS.STARTER    as string[],
  PRO:        PLAN_DEFAULT_PERMISSIONS.PRO        as string[],
  ENTERPRISE: PLAN_DEFAULT_PERMISSIONS.ENTERPRISE as string[],
};

function readPlanPermissions(details: string | null | undefined) {
  if (!details) return null;
  try {
    const saved = JSON.parse(details);
    if (!saved?.planPermissions) return null;
    return { ...DEFAULT_PLAN_PERMISSIONS, ...saved.planPermissions } as typeof DEFAULT_PLAN_PERMISSIONS;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const region = resolvePricingRegion(req);
    const isPakistan = region.isPakistan;

    // Only the config this visitor needs. A Pakistani visitor never falls back
    // to the world list on a miss — an unconfigured PKR screen means "same as
    // the recommended defaults", not "whatever the world screen happens to say",
    // because the two are edited independently and would silently diverge.
    const configAction = isPakistan ? "PKR_PLAN_CONFIG" : "PLAN_CONFIG";
    const latest = await prisma.activityLog.findFirst({
      where: { action: configAction },
      orderBy: { createdAt: "desc" },
    });

    const planPermissions = readPlanPermissions(latest?.details) ?? DEFAULT_PLAN_PERMISSIONS;

    // Return as a simple map: permissionKey → { starter, pro, enterprise }
    //
    // Built over every known permission, NOT over the union of the three saved
    // lists. With the union, a permission the admin unticked on all three plans
    // dropped out of the map entirely — and the pricing table treats a missing
    // key as "no override" and falls back to its hardcoded row. So unticking a
    // feature everywhere made its ticks reappear on the public page, which is
    // the exact opposite of what the admin asked for.
    const allKeys = Array.from(new Set([
      ...Object.values(PERMISSIONS) as string[],
      ...planPermissions.STARTER,
      ...planPermissions.PRO,
      ...planPermissions.ENTERPRISE,
    ]));

    const featureMap: Record<string, { starter: boolean; pro: boolean; enterprise: boolean }> = {};
    for (const key of allKeys) {
      featureMap[key] = {
        starter:    planPermissions.STARTER.includes(key),
        pro:        planPermissions.PRO.includes(key),
        enterprise: planPermissions.ENTERPRISE.includes(key),
      };
    }

    // Per-visitor answer now, so it must not be shared from a CDN cache the way
    // the old single-audience response was — a Pakistani visitor's table would
    // otherwise be served to everyone behind the same edge node.
    return NextResponse.json({ featureMap, region: isPakistan ? "PK" : "WORLD" }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ featureMap: {} });
  }
}
