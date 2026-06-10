/**
 * /api/public/business-module-status
 *
 * Public (no auth required) — returns which business types are currently enabled/live.
 * Used by the dashboard sidebar to show/hide industry-specific module sections.
 *
 * Response: { enabledTypes: string[], statusMap: Record<string, "live"|"coming_soon"> }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BUSINESS_PHASE_CONFIG } from "@/lib/businessModules";

const ACTION_KEY = "BUSINESS_MODULE_CONFIG";

async function loadOverrides(): Promise<Record<string, string>> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: ACTION_KEY },
      orderBy: { createdAt: "desc" },
    });
    if (log?.details) return JSON.parse(log.details) as Record<string, string>;
  } catch {}
  return {};
}

export async function GET(_req: NextRequest) {
  const overrides = await loadOverrides();

  const statusMap: Record<string, "live" | "coming_soon"> = {};
  const enabledTypes: string[] = [];

  for (const [id, cfg] of Object.entries(BUSINESS_PHASE_CONFIG)) {
    const effective = (overrides[id] || cfg.status) as "live" | "coming_soon" | "beta";
    const isLive = effective === "live" || effective === "beta";
    statusMap[id] = isLive ? "live" : "coming_soon";
    if (isLive) enabledTypes.push(id);
  }

  return NextResponse.json(
    { enabledTypes, statusMap },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
