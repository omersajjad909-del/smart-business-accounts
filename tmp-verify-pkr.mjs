import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "pkr-"));
const out = join(dir, "b.mjs");
await build({
  stdin: {
    contents: `
      export * from "./lib/dashboardFeatureRegistry";
      export { applyCompanyPageOverrides } from "./lib/companyPageOverrides";
    `,
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
});
const M = await import(pathToFileURL(out).href);
const {
  createDefaultDashboardFeatureFlags, resolveDashboardFeaturesForCompany,
  resolvePlanWideFeatureFlags, applyCompanyPageOverrides, CORE_DASHBOARD_FEATURES,
  AI_TOOL_IDS, DASHBOARD_FEATURE_DEFS,
} = M;

const LEAKY = ["CORE_PURCHASE_ORDER", "CORE_GRN", "WHOLESALE_WAREHOUSES", "CORE_BARCODE", "CORE_REPORTS_STOCK_VALUATION"];
const KEEP = ["CORE_SALES_INVOICE", "CORE_PURCHASE_INVOICE", "CORE_QUOTATION", "CORE_REPORTS_PROFIT_LOSS", "CORE_PAYROLL"];

const worldDefaults = createDefaultDashboardFeatureFlags();
let fails = 0;
const check = (name, cond) => { if (!cond) { fails++; console.log(`  FAIL  ${name}`); } else console.log(`  ok    ${name}`); };

function resolve(opts) {
  return resolveDashboardFeaturesForCompany({ planCode: "ENTERPRISE", ...opts });
}

console.log("\n1. Plan-wide grid — world company vs PKR company (same grid, PKR reads it too)");
{
  // Bootstrap builds planFlags the same way for both; PKR only changes WHICH
  // saved blob is read, and the PKR blob carries no page grid, so both land on
  // the world grid. Same input here on purpose.
  const planFlags = resolvePlanWideFeatureFlags(worldDefaults);
  const world = resolve({ businessType: "travel", planFlags });
  const pkr = resolve({ businessType: "travel", planFlags, businessFlags: null, fallbackBusinessFlags: null });
  check("identical page sets", JSON.stringify(world) === JSON.stringify(pkr));
  check("no GRN / PO / warehouse / barcode", LEAKY.every(id => !world.includes(id)));
  check("keeps invoice, quotation, P&L, payroll", KEEP.every(id => world.includes(id)));
}

console.log("\n2. PKR per-business grid saved by an admin (its own pageConfig blob)");
{
  const planFlags = resolvePlanWideFeatureFlags(worldDefaults);
  // An admin ticks everything for travel in the PKR grid, GRN included.
  const allIds = DASHBOARD_FEATURE_DEFS.map(f => f.id);
  const pkrPageFlags = { travel: { ENTERPRISE: allIds } };
  const got = resolve({ businessType: "travel", planFlags, businessFlags: pkrPageFlags });
  check("PKR grid honoured (list is non-empty)", Array.isArray(got) && got.length > 0);
  check("pack still strips GRN / PO / warehouse", LEAKY.every(id => !got.includes(id)));
  check("travel's own pages survive", got.includes("TRAVEL_TICKETS") || got.some(id => id.startsWith("TRAVEL_")));
}

console.log("\n3. PKR grid silent for this trade → falls through to world grid, pack still applies");
{
  const planFlags = resolvePlanWideFeatureFlags(worldDefaults);
  const worldPageFlags = { travel: { ENTERPRISE: DASHBOARD_FEATURE_DEFS.map(f => f.id) } };
  const got = resolve({ businessType: "travel", planFlags, businessFlags: { trading: {} }, fallbackBusinessFlags: worldPageFlags });
  check("fallback grid used", Array.isArray(got) && got.length > 0);
  check("pack still strips stock pages", LEAKY.every(id => !got.includes(id)));
}

console.log("\n4. No saved grid at all (planFlags empty) → null, client pack gate covers it");
{
  const got = resolve({ businessType: "travel", planFlags: {} });
  check("returns null (means 'no plan gate configured')", got === null);
  console.log("        → layout.tsx hasDashboardFeature applies the pack before this line,");
  console.log("          so the sidebar is still trade-shaped when the grid is unset.");
}

console.log("\n5. Per-company override can still force a page back on");
{
  const planFlags = resolvePlanWideFeatureFlags(worldDefaults);
  const base = resolve({ businessType: "travel", planFlags });
  const withOverride = applyCompanyPageOverrides(base, { on: ["CORE_GRN"], off: [] }, "travel");
  check("escape hatch works", withOverride.includes("CORE_GRN"));
}

console.log("\n6. AI tools are universal — pack must not touch them");
{
  const planFlags = resolvePlanWideFeatureFlags(worldDefaults);
  const travel = resolve({ businessType: "travel", planFlags }) || [];
  const trading = resolve({ businessType: "trading", planFlags }) || [];
  const aiInTravel = AI_TOOL_IDS.filter(id => travel.includes(id)).length;
  const aiInTrading = AI_TOOL_IDS.filter(id => trading.includes(id)).length;
  check(`same AI tool count (${aiInTravel} vs ${aiInTrading})`, aiInTravel === aiInTrading);
}

console.log("\n7. STARTER / PRO / ENTERPRISE all narrow, none widen");
{
  for (const plan of ["STARTER", "PRO", "ENTERPRISE"]) {
    const planFlags = resolvePlanWideFeatureFlags(worldDefaults);
    const travel = resolveDashboardFeaturesForCompany({ businessType: "travel", planCode: plan, planFlags }) || [];
    const trading = resolveDashboardFeaturesForCompany({ businessType: "trading", planCode: plan, planFlags }) || [];
    const coreIds = new Set(CORE_DASHBOARD_FEATURES.filter(f => f.core).map(f => f.id));
    const t = travel.filter(id => coreIds.has(id)).length;
    const g = trading.filter(id => coreIds.has(id)).length;
    check(`${plan}: travel ${t} core pages < trading ${g}`, t < g);
  }
}

console.log(`\n${fails === 0 ? "All PKR / plan-path checks passed." : `${fails} CHECKS FAILED`}\n`);
rmSync(dir, { recursive: true, force: true });
process.exit(fails === 0 ? 0 : 1);
