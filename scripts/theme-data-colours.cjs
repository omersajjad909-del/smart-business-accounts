/**
 * Moves bright hex colours held in data objects onto the light-theme text
 * variables:   { status: "matched", c: "#34d399" }
 *          ->  { status: "matched", c: "var(--tx-34d399, #34d399)" }
 *
 * scripts/theme-codemod.cjs only sees colours written directly in style props;
 * mockup rows, status maps and card lists keep theirs in plain objects, and on
 * a white page those pastel colours drop below readable contrast. Only light
 * colours (relative luminance > 0.25) are touched; dark ones already read on
 * white. Run scripts/theme-vars.cjs afterwards to generate the variables.
 *
 * Faint white text ("rgba(255,255,255,.4)", usually the idle branch of an
 * active/hover ternary) becomes rgba(var(--ink), ...) the same way, unless it
 * sits on a gradient surface nearby, where it has to stay white. Offer.tsx is
 * a gradient banner end to end and is skipped.
 *
 * Usage: node scripts/theme-data-colours.cjs <file|dir> ...
 */
const fs = require("fs");
const path = require("path");

// Any "#rrggbb" string literal, except where the property it belongs to paints
// a surface: a darkened background would break the text sitting on it.
const RE = /"#([0-9a-fA-F]{6})"/g;
const SURFACE = /^(background|bg|border|outline|shadow|fill|stroke|stop|gradient|glow|ring|track|bar|dot|swatch)/i;
// The property a literal belongs to: the last `name:` or `name =` before it on
// the line (`=>`, `==` excluded). Array elements have none.
const ownerProp = (line) => {
  let last = "";
  for (const m of line.matchAll(/([A-Za-z_$][\w$]*)\s*(?::|=(?![=>]))/g)) last = m[1];
  return last;
};
const isSurface = (line) => SURFACE.test(ownerProp(line).replace(/^(box|text)/i, ""));
const lum = (hex) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const n = parseInt(hex, 16);
  return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};

function walk(p, out) {
  if (fs.statSync(p).isDirectory()) {
    for (const e of fs.readdirSync(p)) if (e !== "node_modules") walk(path.join(p, e), out);
  } else if (/\.tsx?$/.test(p)) out.push(p);
  return out;
}

let total = 0;
for (const f of process.argv.slice(2).flatMap((a) => walk(a, []))) {
  const src = fs.readFileSync(f, "utf8");
  // Canvas and next/og (satori) take plain colour strings only.
  if (/fillStyle|strokeStyle|ImageResponse/.test(src) || /Offer\.tsx$/.test(f)) continue;
  let n = 0;
  // A text variable on a surface is always wrong: put the plain colour back.
  let fixed = src.replace(/"var\(--tx-[0-9a-f]{6}, (#[0-9a-fA-F]{6})\)"/g, (m, hex, off, whole) => {
    const line = whole.slice(whole.lastIndexOf("\n", off) + 1, off);
    if (!isSurface(line)) return m;
    n++;
    return `"${hex}"`;
  });
  const next = fixed.replace(RE, (m, hex, off, whole) => {
    if (lum(hex) <= 0.25 || /^f{6}$/i.test(hex)) return m;
    const line = whole.slice(whole.lastIndexOf("\n", off) + 1, off);
    if (isSurface(line)) return m;
    n++;
    return `"var(--tx-${hex.toLowerCase()}, #${hex})"`;
  });
  const faint = /Offer\.tsx$/.test(f) ? next : next.replace(/"rgba\(255,\s*255,\s*255,\s*(0?\.\d+)\)"/g, (m, a, off, whole) => {
    const lineStart = whole.lastIndexOf("\n", off) + 1;
    const line = whole.slice(lineStart, off);
    if (isSurface(line)) return m;
    const idleBranch = /\?[^?]*:\s*$/.test(line);
    const above = whole.slice(0, lineStart).split("\n").slice(-8).join("\n") + line;
    if (!idleBranch && /background[^,\n]*gradient/.test(above)) return m;
    n++;
    const digits = (a.replace(/^0?\./, "") + "0").slice(0, 2);
    return `"rgba(var(--ink),var(--ta-${digits}, ${a}))"`;
  });
  if (n) { fs.writeFileSync(f, faint); total += n; console.log(String(n).padStart(4), f); }
}
console.log("rewrites:", total);
