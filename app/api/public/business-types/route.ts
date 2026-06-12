import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BUSINESS_PHASE_CONFIG } from "@/lib/businessModules";

const ACTION_KEY = "BUSINESS_MODULE_CONFIG";

export async function GET() {
  // Load admin overrides (same storage as admin panel)
  let overrides: Record<string, string> = {};
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: ACTION_KEY },
      orderBy: { createdAt: "desc" },
    });
    if (log?.details) overrides = JSON.parse(log.details);
  } catch {}

  // export_company is an alias of import_company (both = "Import / Export") — hide from selection
  const HIDDEN_IDS = new Set(["export_company"]);

  const types = Object.entries(BUSINESS_PHASE_CONFIG)
    .filter(([id]) => !HIDDEN_IDS.has(id))
    .map(([id, cfg]) => {
      const overrideStatus = overrides[id];
      const effectiveStatus = overrideStatus || cfg.status;
      const isLive = effectiveStatus === "live";

      return {
        id,
        label: cfg.label,
        icon: cfg.emoji,
        phase: cfg.phase,
        category: cfg.category,
        description: cfg.description,
        isLive,
      };
    });

  const liveIds = types.filter(t => t.isLive).map(t => t.id);

  return NextResponse.json({ types, liveIds }, {
    headers: { "Cache-Control": "no-store" },
  });
}
