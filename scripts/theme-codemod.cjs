/**
 * One-shot codemod: moves hardcoded dark-theme colours in inline styles onto
 * CSS variables so the light theme can repaint them.
 *
 * Every replacement resolves to the exact same colour in dark mode, so the dark
 * theme is unchanged. Only html:not(.dark) (see app/globals.css, "Light theme
 * repaint") gives the variables different values.
 *
 *   rgba(255,255,255,a)          -> rgba(var(--ink),a)        --ink = 255,255,255 in dark
 *   color: "#fff" / "white"      -> var(--ink-solid, #fff)    only when the same style
 *                                                             object has no coloured background
 *   dark hex in a background     -> var(--dk-xxxxxx, #xxxxxx)
 *   dark hex in a border         -> var(--dkb-xxxxxx, #xxxxxx)
 *
 * Only style-like object properties and CSS text in template literals are
 * touched. SVG/chart props (fill, stroke, tick objects) are left alone because
 * var() does not resolve in SVG presentation attributes or on a canvas.
 *
 * Usage: node scripts/theme-codemod.cjs <dir> [<dir> ...]
 * Prints the dark hexes it rewrote so globals.css can list them.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const WHITE_RGBA = /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/g;
const HEX = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?![-\w])/g;

const BG_PROPS = new Set(["background", "backgroundColor", "backgroundImage", "background-color", "background-image"]);
const BORDER_PROPS = new Set([
  "border", "borderColor", "borderTop", "borderBottom", "borderLeft", "borderRight",
  "borderTopColor", "borderBottomColor", "borderLeftColor", "borderRightColor",
  "outline", "outlineColor", "border-color", "border-top", "border-bottom", "border-left", "border-right",
]);
const INK_PROPS = new Set([
  ...BG_PROPS, ...BORDER_PROPS,
  "color", "boxShadow", "box-shadow", "textShadow", "caretColor", "textDecorationColor",
  "backdropFilter", "WebkitTextFillColor", "accentColor", "columnRuleColor",
]);

const seenDark = new Set();
const seenDarkBorder = new Set();

function expand(hex) {
  hex = hex.toLowerCase();
  return hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
}
// A "dark surface" hex: every channel low. Accent colours (#10b981 etc.) fail this.
function isDarkSurface(hex) {
  const h = expand(hex);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return Math.max(r, g, b) <= 0x40;
}

function rewriteInk(s) {
  return s.replace(WHITE_RGBA, "rgba(var(--ink),");
}
function rewriteDarkHex(s, kind) {
  return s.replace(HEX, (m, hex, offset, whole) => {
    // Already inside a var() fallback we produced.
    if (/var\(--dkb?-[0-9a-f]{6},\s*$/.test(whole.slice(0, offset))) return m;
    if (!isDarkSurface(hex)) return m;
    const h = expand(hex);
    if (kind === "bg") { seenDark.add(h); return `var(--dk-${h}, ${m})`; }
    seenDarkBorder.add(h); return `var(--dkb-${h}, ${m})`;
  });
}

function propName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

// Walk up through ?:, ||, ??, parens and template spans to the owning property.
function owningProperty(node) {
  let cur = node.parent;
  while (cur) {
    if (ts.isPropertyAssignment(cur)) return cur;
    if (
      ts.isConditionalExpression(cur) || ts.isParenthesizedExpression(cur) ||
      ts.isBinaryExpression(cur) || ts.isTemplateSpan(cur) || ts.isTemplateExpression(cur) ||
      ts.isAsExpression(cur)
    ) { cur = cur.parent; continue; }
    return null;
  }
  return null;
}

function literalText(expr) {
  if (!expr) return null;
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  return undefined; // dynamic
}

// Is a background value one that white text was sitting on only because the page was dark?
function backgroundIsNeutral(text) {
  if (text == null) return true;
  const t = text.trim().toLowerCase();
  if (t === "" || t === "transparent" || t === "none" || t === "inherit") return true;
  if (/^rgba\(\s*255\s*,\s*255\s*,\s*255/.test(t)) return true;
  if (/^var\(--(surface|card-bg|card-bg-2|panel-bg|panel-bg-2|app-bg|background)\)/.test(t)) return true;
  // Pure dark surface / gradient made only of dark surfaces.
  const hexes = t.match(/#[0-9a-f]{3,6}\b/g) || [];
  const rgbs = t.match(/rgba?\([^)]*\)/g) || [];
  if (hexes.length === 0 && rgbs.length === 0) return false;
  const rgbDark = rgbs.every((c) => {
    const n = c.match(/[\d.]+/g).map(Number);
    return (n[0] === 255 && n[1] === 255 && n[2] === 255) || Math.max(n[0], n[1], n[2]) <= 64 || (n[3] !== undefined && n[3] <= 0.12);
  });
  return hexes.every((h) => isDarkSurface(h.slice(1))) && rgbDark;
}

function transformFile(file) {
  const src = fs.readFileSync(file, "utf8");
  if (!/rgba\(\s*255\s*,\s*255\s*,\s*255|#fff|white|#[01][0-9a-fA-F]{5}|#[23][0-9a-fA-F]{5}/.test(src)) return false;
  // OG images (satori), emails and print windows render outside the page's
  // stylesheet, where the variables do not exist.
  if (/ImageResponse|document\.write|<!DOCTYPE|renderToStaticMarkup/i.test(src)) return false;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];

  function edit(node, next) {
    const start = node.getStart(sf) + 1; // inside the quote/backtick
    const end = node.getEnd() - 1;
    const old = src.slice(start, end);
    if (old !== next) edits.push({ start, end, text: next });
  }

  function handleTextNode(node, rawText) {
    const prop = owningProperty(node);
    const key = prop && propName(prop.name);
    let next = rawText;

    if (key && INK_PROPS.has(key)) {
      next = rewriteInk(next);
      if (BG_PROPS.has(key)) next = rewriteDarkHex(next, "bg");
      else if (BORDER_PROPS.has(key)) next = rewriteDarkHex(next, "border");

      if (key === "color" && ts.isStringLiteral(node) && prop.initializer === node) {
        const v = rawText.trim().toLowerCase();
        if (v === "#fff" || v === "#ffffff" || v === "white") {
          const obj = prop.parent;
          let bg = null;
          let dynamic = false;
          if (ts.isObjectLiteralExpression(obj)) {
            for (const p of obj.properties) {
              if (ts.isSpreadAssignment(p)) continue; // spreads usually carry card/input base styles
              if (ts.isPropertyAssignment(p) && BG_PROPS.has(propName(p.name))) {
                const t = literalText(p.initializer);
                if (t === undefined) dynamic = true; else bg = t;
              }
            }
          }
          if (!dynamic && backgroundIsNeutral(bg)) next = `var(--ink-solid, ${rawText})`;
        }
      }
    } else if (!key && (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node))) {
      // Raw CSS text, e.g. <style>{`...`}</style>. Only when it looks like CSS declarations.
      if (/(background|border|color|box-shadow)\s*:/.test(rawText)) {
        next = rewriteInk(next);
        next = next.replace(/(background(?:-color|-image)?\s*:[^;}{]*)/g, (d) => rewriteDarkHex(d, "bg"));
        next = next.replace(/((?:border|outline)(?:-[a-z]+)*\s*:[^;}{]*)/g, (d) => rewriteDarkHex(d, "border"));
      }
    }
    return next;
  }

  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const raw = src.slice(node.getStart(sf) + 1, node.getEnd() - 1);
      const next = handleTextNode(node, raw);
      if (next !== raw) edit(node, next);
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const start = node.getStart(sf) + 1;
      const end = node.getEnd() - (ts.isTemplateTail(node) ? 1 : 2);
      const raw = src.slice(start, end);
      const next = handleTextNode(node, raw);
      if (next !== raw) edits.push({ start, end, text: next });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (!edits.length) return false;
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  fs.writeFileSync(file, out);
  return true;
}

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (ent.name !== "node_modules") walk(p, out); }
    else if (/\.tsx?$/.test(ent.name) && !ent.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

const files = process.argv.slice(2).flatMap((d) => (fs.statSync(d).isDirectory() ? walk(d, []) : [d]));
let changed = 0;
for (const f of files) if (transformFile(f)) changed++;
console.log(JSON.stringify({ changed, scanned: files.length, dark: [...seenDark].sort(), darkBorder: [...seenDarkBorder].sort() }));
