// ─────────────────────────────────────────────────────────────
//  Nav link check — a page nobody can reach is a page nobody has.
//
//  The sidebar is hand-written NavLinks in app/dashboard/layout.tsx; the
//  registry only decides whether a link is allowed to show, not whether one
//  exists. So a page could be built, registered, plan-gated and routed, and
//  still be reachable only by typing the URL — which is what happened to the
//  whole Hajj group business: Departures, Pilgrim Bookings and Vouchers all
//  had pages and registry entries and no way in.
//
//    node scripts/nav-link-check.mjs              # every business type
//    node scripts/nav-link-check.mjs travel       # one of them
//
//  Exits non-zero when something is unreachable, so it can gate a release.
//  A page that is deliberately reached from inside another screen — a print
//  view, a wizard step — belongs in REACHED_FROM_A_PAGE below, with the
//  reason, rather than being left to look like an accident.
// ─────────────────────────────────────────────────────────────

import { build } from "esbuild";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ONLY = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;

/** Routes with no sidebar link on purpose, and why. */
const REACHED_FROM_A_PAGE = new Map([
  // Opened from the ticket, trip and pilgrim-booking screens with the id of
  // the thing being printed; it means nothing on its own.
  ["/dashboard/travel/print", "opened from the document it prints"],
]);

const dir = mkdtempSync(join(tmpdir(), "nav-link-check-"));
const bundle = join(dir, "bundle.mjs");
let failed = 0;

try {
  await build({
    stdin: {
      contents: `export { DASHBOARD_FEATURE_DEFS } from "./lib/dashboardFeatureRegistry";`,
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundle,
    logLevel: "silent",
  });

  const { DASHBOARD_FEATURE_DEFS } = await import(pathToFileURL(bundle).href);
  const layout = readFileSync("app/dashboard/layout.tsx", "utf8");

  const byBusiness = new Map();
  for (const feature of DASHBOARD_FEATURE_DEFS) {
    if (ONLY && feature.business !== ONLY) continue;
    if (REACHED_FROM_A_PAGE.has(feature.route)) continue;
    if (layout.includes(`href="${feature.route}"`)) continue;
    /* A "?tab=" route is a tab on a page, not a page. It is reachable as soon
       as the page it lives on is, and counting each tab as a missing link is
       how a checker ends up crying wolf twenty-four times. */
    const [base] = String(feature.route).split("?");
    if (base !== feature.route && layout.includes(`href="${base}"`)) continue;
    if (!byBusiness.has(feature.business)) byBusiness.set(feature.business, []);
    byBusiness.get(feature.business).push(feature);
  }

  if (!byBusiness.size) {
    console.log(`Every ${ONLY ? `${ONLY} ` : ""}page in the registry has a way in.`);
  } else {
    for (const [business, list] of [...byBusiness].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n${business} — ${list.length} page${list.length === 1 ? "" : "s"} with no link in the sidebar`);
      for (const feature of list) {
        console.log(`  ${feature.id.padEnd(26)} ${String(feature.label).padEnd(30)} ${feature.route}`);
      }
      failed += list.length;
    }
    console.log(`\n${failed} page${failed === 1 ? "" : "s"} can only be reached by typing the URL.`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
