import fs from "fs";
import {
  DASHBOARD_FEATURE_IDS,
  createDefaultDashboardFeatureFlags,
  readSavedDashboardFeatureFlags,
  resolveDashboardFeaturesForCompany,
  healSavedFeatureList,
  healSavedPlanFeatureFlags,
  dashboardFeaturesForBusinessType,
} from "@/lib/dashboardFeatureRegistry";

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Mirrors app/api/me/bootstrap/route.ts
function resolveFlags(savedFlags: Record<string, string[]>) {
  const defaults = createDefaultDashboardFeatureFlags();
  const saved = healSavedPlanFeatureFlags(savedFlags);
  const clean = (list: string[] | undefined, fallback: string[], plan: any) =>
    Array.isArray(list)
      ? healSavedFeatureList(list.filter((id) => DASHBOARD_FEATURE_IDS.includes(id)), plan)
      : fallback;
  const get = (k: string) => saved[k] || saved[k.toLowerCase()];
  return {
    STARTER: clean(get("STARTER"), defaults.STARTER, "STARTER"),
    PRO: clean(get("PRO"), defaults.PRO, "PRO"),
    ENTERPRISE: clean(get("ENTERPRISE"), defaults.ENTERPRISE, "ENTERPRISE"),
    CUSTOM: clean(get("CUSTOM"), defaults.CUSTOM, "CUSTOM"),
  };
}

(async () => {
  const BT = "import_company";
  const row = await prisma.activityLog.findFirst({
    where: { action: "PLAN_CONFIG" },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });
  const savedFlags = readSavedDashboardFeatureFlags(row?.details) || {};
  const map = resolveFlags(savedFlags as any);

  const owned = dashboardFeaturesForBusinessType(BT);
  console.log("pages owned by import_company:", owned.length);

  for (const planCode of ["STARTER", "PRO", "ENTERPRISE"]) {
    const resolved = resolveDashboardFeaturesForCompany({
      businessType: BT,
      planCode,
      planFlags: map as any,
      businessFlags: null,          // no WORLD grid row exists
      fallbackBusinessFlags: null,  // OM company, so no PKR fallback
    });
    const granted = new Set(resolved || []);
    const missing = owned.filter((f) => !granted.has(f.id));
    console.log(
      `${planCode}: resolved=${resolved ? resolved.length : null}  owned=${owned.length}  ownedGranted=${owned.length - missing.length}  ownedMissing=${missing.length}`,
    );
  }

  // Which of the 15 trade pages land on STARTER?
  const starter = new Set(
    resolveDashboardFeaturesForCompany({
      businessType: BT, planCode: "STARTER", planFlags: map as any,
      businessFlags: null, fallbackBusinessFlags: null,
    }) || [],
  );
  const trade = owned.filter((f) => f.id.startsWith("TRADE_"));
  console.log("\nTRADE pages:", trade.length, "granted on STARTER:", trade.filter((f) => starter.has(f.id)).length);
  for (const f of trade) console.log("  ", starter.has(f.id) ? "ON " : "OFF", f.id, "|", f.label);

  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
