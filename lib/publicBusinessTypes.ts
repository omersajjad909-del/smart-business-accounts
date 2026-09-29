import { prisma } from "@/lib/prisma";
import { BUSINESS_PHASE_CONFIG } from "@/lib/businessModules";

const ACTION_KEY = "BUSINESS_MODULE_CONFIG";

export type PublicBusinessType = {
  id: string;
  label: string;
  icon: string;
  phase: 1 | 2 | 3 | 4;
  category: string;
  description: string;
  isLive: boolean;
};

// export_company is an alias of import_company (both = "Import / Export") — hide from selection
const HIDDEN_IDS = new Set(["export_company"]);

// Shared by app/api/public/business-types (client refetch) and the
// industries page's server component (initial render) so both agree on the
// same admin overrides instead of computing them twice.
export async function getPublicBusinessTypes(): Promise<PublicBusinessType[]> {
  let overrides: Record<string, string> = {};
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: ACTION_KEY },
      orderBy: { createdAt: "desc" },
    });
    if (log?.details) overrides = JSON.parse(log.details);
  } catch {}

  return Object.entries(BUSINESS_PHASE_CONFIG)
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
}
