import { DASHBOARD_FEATURE_DEFS, dashboardFeaturesForBusinessType } from "./lib/dashboardFeatureRegistry";

const targets = ["trading","wholesale","retail","distribution","import_company","clearing_forwarding","pharmacy","salon"];
console.log("total defs:", DASHBOARD_FEATURE_DEFS.length);
console.log("pages | business type | of which AI");
for (const t of targets) {
  const owned = dashboardFeaturesForBusinessType(t);
  const ai = owned.filter(f => f.businessLabel === "AI Intelligence").length;
  console.log(String(owned.length).padStart(5), "|", t.padEnd(22), "|", ai);
}
