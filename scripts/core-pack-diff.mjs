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
        export { CORE_PACKS, getCorePack, corePackAllows, describeCorePack, hasCorePack } from "./lib/corePack";
        export { BUSINESS_TYPES, BUSINESS_PHASE_CONFIG, LIVE_TYPES } from "./lib/businessModules";
        export { ALL_BUSINESS_TYPES } from "./lib/businessTypes";
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
  const {
    CORE_DASHBOARD_FEATURES, createDefaultDashboardFeatureFlags,
    CORE_PACKS, getCorePack, corePackAllows, describeCorePack, hasCorePack,
    BUSINESS_PHASE_CONFIG, LIVE_TYPES, ALL_BUSINESS_TYPES,
  } = mod;

  const coreDefs = CORE_DASHBOARD_FEATURES.filter((f) => f.core);
  const label = new Map(coreDefs.map((f) => [f.id, `${f.section} › ${f.label}`]));
  const planDefaults = createDefaultDashboardFeatureFlags();

  // Coverage first: an unprofiled trade silently falls back to the widest pack,
  // which is the old "every business looks the same" behaviour coming back for
  // that one trade. Both id vocabularies are checked — business-setup writes
  // BUSINESS_PHASE_CONFIG ids, the admin panel lists businessTypes.ts ids.
  const everyId = [
    ...Object.keys(BUSINESS_PHASE_CONFIG),
    ...ALL_BUSINESS_TYPES.map((b) => b.id),
  ];
  const unprofiled = [...new Set(everyId)].filter((id) => !hasCorePack(id)).sort();
  console.log(`\n${coreDefs.length} core pages · ${Object.keys(CORE_PACKS).length} packs`);
  console.log(`business type ids across both lists: ${new Set(everyId).size} · unprofiled: ${unprofiled.length}`);
  if (unprofiled.length) console.log(`  falling back to DEFAULT_CORE_PACK: ${unprofiled.join(", ")}`);

  // Only live trades can have customers to regress, so those are listed first
  // and in full; the rest are summarised.
  const live = new Set(LIVE_TYPES);
  const order = Object.keys(CORE_PACKS).sort((a, b) => (live.has(b) ? 1 : 0) - (live.has(a) ? 1 : 0));

  let totalRemoved = 0;

  for (const businessType of order.filter((b) => live.has(b))) {
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

  // Everything not yet live: one line each, since nobody is using these packs
  // in anger yet and the page count is the only thing worth eyeballing.
  console.log(`\nNot live yet — Enterprise core page count per pack:\n`);
  const rows = order
    .filter((b) => !live.has(b))
    .map((b) => {
      const pack = getCorePack(b);
      const all = (planDefaults.ENTERPRISE || []).filter((id) => label.has(id));
      return { b, n: all.filter((id) => corePackAllows(pack, id)).length, d: describeCorePack(pack) };
    })
    .sort((x, y) => y.n - x.n || x.b.localeCompare(y.b));
  for (const r of rows) console.log(`  ${String(r.n).padStart(3)}  ${r.b.padEnd(22)} ${r.d}`);

  // A page no pack can reach is either mis-ruled or spelled wrong in the rules
  // table, where a typo is silent — the rule simply never fires.
  const reachable = new Set();
  for (const businessType of Object.keys(CORE_PACKS)) {
    const pack = getCorePack(businessType);
    for (const def of coreDefs) if (corePackAllows(pack, def.id)) reachable.add(def.id);
  }
  const orphans = coreDefs.filter((d) => !reachable.has(d.id));
  console.log(`\n${"─".repeat(72)}`);
  console.log(`Removals across live packs and plans: ${totalRemoved}`);
  console.log(`Core pages no pack reaches: ${orphans.length}`);
  for (const def of orphans) console.log(`  · ${label.get(def.id)}  (${def.id})`);

  const gated = coreDefs.filter((def) =>
    !Object.keys(CORE_PACKS).every((b) => corePackAllows(getCorePack(b), def.id)),
  );
  console.log(`Universal (every pack): ${coreDefs.length - gated.length}   Gated by pack: ${gated.length}`);
  console.log("");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
