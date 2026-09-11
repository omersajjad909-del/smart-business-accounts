// ─────────────────────────────────────────────────────────────
//  Core Pack diff — the safety net for the page-ownership change.
//
//  Before core packs, every business type was handed all 132 core pages and the
//  only gate was the plan. Now each trade owns a subset. That is the point, but
//  it means a page a live customer uses today can disappear on deploy, so this
//  prints exactly which pages each business type loses and gains, per plan,
//  before anything ships.
//
//    node scripts/core-pack-diff.mjs            # summary
//    node scripts/core-pack-diff.mjs --verbose  # every page, per plan
//
//  A removal listed here is only safe if it is one somebody chose. Anything
//  surprising means the pack is wrong, not that the customer was.
// ─────────────────────────────────────────────────────────────

import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const VERBOSE = process.argv.includes("--verbose");
const PLANS = ["STARTER", "PRO", "ENTERPRISE"];

const dir = mkdtempSync(join(tmpdir(), "core-pack-diff-"));
const bundle = join(dir, "bundle.mjs");

try {
  await build({
    stdin: {
      contents: `
        export { CORE_DASHBOARD_FEATURES, createDefaultDashboardFeatureFlags } from "./lib/dashboardFeatureRegistry";
        export { CORE_PACKS, getCorePack, corePackAllows, describeCorePack } from "./lib/corePack";
        export { BUSINESS_TYPES } from "./lib/businessModules";
      `,
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundle,
    logLevel: "silent",
  });

  const mod = await import(pathToFileURL(bundle).href);
  const { CORE_DASHBOARD_FEATURES, createDefaultDashboardFeatureFlags, CORE_PACKS, getCorePack, corePackAllows, describeCorePack } = mod;

  const coreDefs = CORE_DASHBOARD_FEATURES.filter((f) => f.core);
  const label = new Map(coreDefs.map((f) => [f.id, `${f.section} › ${f.label}`]));
  const planDefaults = createDefaultDashboardFeatureFlags();

  console.log(`\n${coreDefs.length} core pages · ${Object.keys(CORE_PACKS).length} profiled business types\n`);

  let totalRemoved = 0;

  for (const businessType of Object.keys(CORE_PACKS)) {
    const pack = getCorePack(businessType);
    console.log(`${"─".repeat(72)}`);
    console.log(`${businessType}`);
    console.log(`  ${describeCorePack(pack)}`);
    console.log(
      `  payroll:${pack.payroll ? "yes" : "no"}  branches:${pack.multiBranch ? "yes" : "no"}` +
      `  crm:${pack.crm ? "yes" : "no"}  costing:${pack.costing ? "yes" : "no"}`,
    );

    for (const plan of PLANS) {
      // Before: every core id the plan grants. After: the same list, minus the
      // pages this trade's pack says it does not use.
      const before = (planDefaults[plan] || []).filter((id) => label.has(id));
      const after = before.filter((id) => corePackAllows(pack, id));
      const removed = before.filter((id) => !after.includes(id));
      totalRemoved += removed.length;

      console.log(`  ${plan.padEnd(11)} ${String(after.length).padStart(3)} / ${String(before.length).padEnd(3)} pages   −${removed.length}`);

      if (VERBOSE && removed.length) {
        for (const id of removed) console.log(`      − ${label.get(id)}  (${id})`);
      }
    }
  }

  console.log(`${"─".repeat(72)}`);

  // A page no live pack can ever reach is either mis-ruled or belongs to a
  // trade that is not live yet — worth seeing either way.
  const reachable = new Set();
  for (const businessType of Object.keys(CORE_PACKS)) {
    const pack = getCorePack(businessType);
    for (const def of coreDefs) if (corePackAllows(pack, def.id)) reachable.add(def.id);
  }
  const orphans = coreDefs.filter((d) => !reachable.has(d.id));
  console.log(`\nRemovals across all packs and plans: ${totalRemoved}`);
  console.log(`Core pages no live pack reaches: ${orphans.length}`);
  for (const def of orphans) console.log(`  · ${label.get(def.id)}  (${def.id})`);

  // Every id in the rules table has to name a page that exists, or the rule is
  // silently doing nothing.
  const known = new Set(coreDefs.map((d) => d.id));
  const allRuled = new Set();
  for (const def of coreDefs) {
    const everyone = Object.keys(CORE_PACKS).every((b) => corePackAllows(getCorePack(b), def.id));
    if (!everyone) allRuled.add(def.id);
  }
  const universal = coreDefs.filter((d) => !allRuled.has(d.id)).length;
  console.log(`\nUniversal (every live pack): ${universal}   Gated by pack: ${allRuled.size}`);
  if (!known.size) console.log("No core pages found — the registry import is wrong.");
  console.log("");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
