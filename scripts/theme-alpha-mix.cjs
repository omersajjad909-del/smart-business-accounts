/**
 * Rewrites hex-alpha suffixes on colour expressions into color-mix():
 *
 *   `${plan.color}12`      ->  `color-mix(in srgb, ${plan.color} 7.1%, transparent)`
 *   plan.color + "40"      ->  `color-mix(in srgb, ${plan.color} 25.1%, transparent)`
 *
 * Appending two hex digits only works while the colour is a literal "#rrggbb".
 * scripts/theme-codemod.cjs turns data colours into "var(--tx-xxxxxx, #xxxxxx)"
 * so the light theme can darken them, and "var(...)12" is invalid CSS: the
 * browser drops the whole declaration, in both themes. color-mix gives the
 * identical colour for a hex value and also accepts var().
 *
 * SVG presentation attributes and canvas styles are left alone.
 *
 * Usage: node scripts/theme-alpha-mix.cjs <file|dir> ...
 */
const fs = require("fs");
const path = require("path");

const pct = (hh) => `${+((parseInt(hh, 16) / 255) * 100).toFixed(1)}%`;
const SKIP_CONTEXT = /(fill|stroke|stopColor|stop-color|floodColor|fillStyle|strokeStyle|shadowColor)\s*[=:]\s*\{?\s*[`"']?[^`"'\n]*$/;

function transform(src) {
  let n = 0;
  // Inside template literals: ${expr}HH
  src = src.replace(/\$\{([^{}`]+)\}([0-9a-fA-F]{2})(?![0-9a-zA-Z_])/g, (m, expr, hh, off, whole) => {
    const lineStart = whole.lastIndexOf("\n", off) + 1;
    if (SKIP_CONTEXT.test(whole.slice(lineStart, off))) return m;
    n++;
    return `color-mix(in srgb, \${${expr}} ${pct(hh)}, transparent)`;
  });
  // String concatenation: expr + "HH"
  src = src.replace(/(?<![\w$.\]])([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)\s*\+\s*(["'])([0-9a-fA-F]{2})\2/g, (m, expr, q, hh, off, whole) => {
    const lineStart = whole.lastIndexOf("\n", off) + 1;
    if (SKIP_CONTEXT.test(whole.slice(lineStart, off))) return m;
    n++;
    return `\`color-mix(in srgb, \${${expr}} ${pct(hh)}, transparent)\``;
  });
  return [src, n];
}

function walk(p, out) {
  if (fs.statSync(p).isDirectory()) {
    for (const e of fs.readdirSync(p)) if (e !== "node_modules") walk(path.join(p, e), out);
  } else if (/\.tsx?$/.test(p)) out.push(p);
  return out;
}

let total = 0;
for (const f of process.argv.slice(2).flatMap((a) => walk(a, []))) {
  const src = fs.readFileSync(f, "utf8");
  if (/(fillStyle|strokeStyle)\s*=/.test(src)) continue; // canvas code takes plain colour strings
  const [next, n] = transform(src);
  if (n) { fs.writeFileSync(f, next); total += n; console.log(String(n).padStart(4), f); }
}
console.log("rewrites:", total);
