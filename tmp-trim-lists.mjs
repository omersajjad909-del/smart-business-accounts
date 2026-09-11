import { build } from "esbuild";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "trim-"));
const out = join(dir, "b.mjs");
await build({
  stdin: {
    contents: `export { coreModulesFor, getCorePack } from "./lib/corePack";`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
});
const { coreModulesFor } = await import(pathToFileURL(out).href);

const src = readFileSync("lib/businessModules.ts", "utf8").split("\n");
const targets = [
  [205, "trading"], [237, "manufacturing"], [277, "investor"],
  [308, "distribution"], [340, "wholesale"], [370, "retail"],
];
// import_company + clearing_forwarding + travel
for (const [n, line] of src.entries()) {
  if (/^    modules: \[\.\.\.CORE/.test(line)) {
    const ln = n + 1;
    if (ln > 380 && ln < 1760 && !targets.some(([t]) => t === ln)) {
      // only the uncommented ones: import_company, clearing_forwarding, travel
    }
  }
}
targets.push([1508, "import_company"], [1546, "clearing_forwarding"], [1719, "travel"]);

for (const [ln, id] of targets) {
  const line = src[ln - 1];
  const m = line.match(/^\s*modules: \[\.\.\.CORE(?:_P1)?,\s*(.*)\],\s*$/);
  if (!m) { console.log(`!! line ${ln} (${id}) did not match:\n   ${line.slice(0, 90)}`); continue; }
  const listed = m[1].split(",").map(s => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
  const core = new Set(coreModulesFor(id));
  const kept = listed.filter(k => !core.has(k));
  const dropped = listed.filter(k => core.has(k));
  console.log(`\n${id}  (line ${ln})`);
  console.log(`  core from pack : ${core.size}`);
  console.log(`  redundant      : ${dropped.length}  ${dropped.join(" ")}`);
  console.log(`  industry keeps : ${kept.length}  ${kept.join(" ")}`);
  console.log(`  NEW: modules: [...coreModulesFor("${id}"), ${kept.map(k => `"${k}"`).join(",")}],`);
}
rmSync(dir, { recursive: true, force: true });
