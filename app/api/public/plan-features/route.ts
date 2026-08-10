import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_DEFAULT_PERMISSIONS } from "@/lib/planPermissions";
import { PERMISSIONS } from "@/lib/permissions";

// Maps each permission key → which plans have it by default
// Admin overrides (saved via /api/admin/plan-config) will override these defaults

const DEFAULT_PLAN_PERMISSIONS = {
  STARTER:    PLAN_DEFAULT_PERMISSIONS.STARTER    as string[],
  PRO:        PLAN_DEFAULT_PERMISSIONS.PRO        as string[],
  ENTERPRISE: PLAN_DEFAULT_PERMISSIONS.ENTERPRISE as string[],
};

export async function GET(_req: NextRequest) {
  try {
    // Try to load admin overrides
    const latest = await prisma.activityLog.findFirst({
      where: { action: "PLAN_CONFIG" },
      orderBy: { createdAt: "desc" },
    });

    let planPermissions = DEFAULT_PLAN_PERMISSIONS;
    if (latest?.details) {
      const saved = JSON.parse(latest.details);
      if (saved?.planPermissions) {
        planPermissions = { ...DEFAULT_PLAN_PERMISSIONS, ...saved.planPermissions };
      }
    }

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

    return NextResponse.json({ featureMap }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ featureMap: {} });
  }
}
