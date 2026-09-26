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
 *   dark rgba() in a background  -> rgba(var(--dkr-xxxxxx, r,g,b),a)
 *   pale/bright text colour      -> var(--tx-xxxxxx, #xxxxxx) or rgba(var(--txr-xxxxxx, r,g,b),a)
 *                                   (only colours that would fail 4.5:1 on white)
 *   faint ink text               -> rgba(var(--ink),var(--ta-30, .3))   alpha raised in light,
 *                                   where a .3 grey on white is unreadable
 *
 * Colour values held in theme objects and consts (T.muted, const BORDER = …)
 * are recognised by their name: text-ish, surface-ish or border-ish.
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
const seenDarkRgba = new Set();
const seenText = new Set();
const RGBA_ANY = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*[\d.]+\s*)?\)/g;
const ALREADY_VAR = /var\(--[a-z]+-[0-9a-f]{6},\s*$/;

const toHex = (r, g, b) => [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
function luminance(h) {
  const f = (i) => { let v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
}
// Text that needs a light-theme replacement: anything under 4.5:1 on white,
// except pure white (handled by --ink-solid) and near-black (already fine).
const failsOnWhite = (h) => h !== "ffffff" && 1.05 / (luminance(h) + 0.05) < 4.5;

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
    if (ALREADY_VAR.test(whole.slice(0, offset))) return m;
    if (!isDarkSurface(hex)) return m;
    const h = expand(hex);
    if (kind === "bg") { seenDark.add(h); return `var(--dk-${h}, ${m})`; }
    seenDarkBorder.add(h); return `var(--dkb-${h}, ${m})`;
  });
}

function rewriteDarkRgba(s) {
  return s.replace(RGBA_ANY, (m, r, g, b, a, offset, whole) => {
    if (ALREADY_VAR.test(whole.slice(0, offset + m.indexOf(r)))) return m;
    [r, g, b] = [r, g, b].map(Number);
    const alpha = a ? parseFloat(a.replace(",", "")) : 1;
    // Pure black is a scrim or shadow, not a surface; faint tints stay tints.
    if (Math.max(r, g, b) > 0x40 || (r === 0 && g === 0 && b === 0) || alpha < 0.4) return m;
    const h = toHex(r, g, b);
    seenDarkRgba.add(h);
    return `rgba(var(--dkr-${h}, ${r},${g},${b}),${alpha})`;
  });
}
function rewriteTextColour(s) {
  s = s.replace(HEX, (m, hex, offset, whole) => {
    if (ALREADY_VAR.test(whole.slice(0, offset))) return m;
    const h = expand(hex);
    if (!failsOnWhite(h)) return m;
    seenText.add(h);
    return `var(--tx-${h}, ${m})`;
  });
  return s.replace(RGBA_ANY, (m, r, g, b, a, offset, whole) => {
    if (ALREADY_VAR.test(whole.slice(0, offset + m.indexOf(r)))) return m;
    const h = toHex(+r, +g, +b);
    if (!failsOnWhite(h)) return m;
    seenText.add(h);
    return `rgba(var(--txr-${h}, ${r},${g},${b})${a ? a.replace(/\s+/g, "") : ",1"})`;
  });
}

// Faint text alphas that read on a dark page but vanish on white.
function boostInkAlpha(s) {
  return s.replace(/rgba\(var\(--ink\),\s*(\d*\.?\d+)\)/g, (m, a) => {
    const n = parseFloat(a);
    if (!(n < 0.75)) return m;
    return `rgba(var(--ink),var(--ta-${String(Math.round(n * 100)).padStart(2, "0")}, ${a}))`;
  });
}

const COLOUR_ONLY = /^\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|white)\s*$/;
// What a named colour (theme-object key or const) is for.
function roleOf(name) {
  if (!name) return null;
  if (/(^|_|[a-z])(bg|Bg|BG)|panel|surface|card|background|base|elev|sheet|modal|overlay|input|field|row|stripe|hover/i.test(name)) return "bg";
  if (/border|line|divider|stroke|outline|rule|sep/i.test(name)) return "border";
  if (/text|muted|dim|sub|label|fg|faint|title|heading|ink|hint|caption|placeholder|soft|mute|secondary|tertiary/i.test(name)) return "text";
  return null;
}
function rewriteByRole(s, role) {
  s = rewriteInk(s);
  if (role === "bg") return rewriteDarkRgba(rewriteDarkHex(s, "bg"));
  if (role === "border") return rewriteDarkHex(s, "border");
  if (role === "text") {
    const v = s.trim().toLowerCase();
    if (v === "#fff" || v === "#ffffff" || v === "white") return `var(--ink-solid, ${s})`;
    return boostInkAlpha(rewriteTextColour(s));
  }
  return s;
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
    // el.style.background = "..."  (hover handlers)
    if (ts.isBinaryExpression(cur) && cur.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(cur.left) && ts.isPropertyAccessExpression(cur.left.expression) &&
        cur.left.expression.name.text === "style") {
      return { name: cur.left.name, initializer: null, parent: null };
    }
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
    if (/var\(--(ink|dkr-)/.test(c)) return true; // already repainted by an earlier pass
    const n = (c.match(/[\d.]+/g) || []).map(Number);
    if (n.length < 3) return false;
    // A tint of .3 or less is a pale wash over the page in light mode, so text
    // on it needs the same repaint as text on the page itself.
    return (n[0] === 255 && n[1] === 255 && n[2] === 255) || Math.max(n[0], n[1], n[2]) <= 64 || (n[3] !== undefined && n[3] <= 0.3);
  });
  return hexes.every((h) => isDarkSurface(h.slice(1))) && rgbDark;
}

// The literal background of a style object: null when none, undefined when dynamic.
function siblingBackground(obj) {
  let bg = null;
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && BG_PROPS.has(propName(p.name))) {
      const t = literalText(p.initializer);
      if (t === undefined) return "dynamic"; // not neutral: leave it alone
      bg = t;
    }
  }
  return bg;
}
function clipsToText(obj) {
  return obj.properties.some((p) => ts.isPropertyAssignment(p) &&
    /^(WebkitBackgroundClip|backgroundClip)$/.test(propName(p.name) || "") &&
    literalText(p.initializer) === "text");
}

// CSS text in <style> blocks: per rule, repaint white and pale text (hover
// states included) unless the same rule sets a coloured background, and lift
// faint text alphas — the same decisions as for style objects.
function rewriteCssRules(css) {
  return css.replace(/\{([^{}]*)\}/g, (whole, body) => {
    const bgs = [...body.matchAll(/background(?:-color|-image)?\s*:\s*([^;]*)/g)].map((m) => m[1].replace(/\s*!important\s*$/, ""));
    if (!bgs.every(backgroundIsNeutral)) return whole;
    const next = body.replace(/(^|[;\s{])color\s*:\s*([^;]*)/g, (d, lead, val) => {
      const imp = /!important/.test(val) ? " !important" : "";
      const v = val.replace(/\s*!important\s*$/, "").trim();
      const lv = v.toLowerCase();
      let out;
      if (lv === "#fff" || lv === "#ffffff" || lv === "white") out = `var(--ink-solid, ${v})`;
      else out = boostInkAlpha(rewriteTextColour(rewriteInk(v)));
      return `${lead}color:${out}${imp}`;
    });
    return `{${next}}`;
  });
}

function transformFile(file) {
  const src = fs.readFileSync(file, "utf8");
  if (!/rgba\(\s*255\s*,\s*255\s*,\s*255|#fff|white|#[01][0-9a-fA-F]{5}|#[23][0-9a-fA-F]{5}/.test(src)) return false;
  // OG images (satori), emails and print windows render outside the page's
  // stylesheet, where the variables do not exist.
  if (/ImageResponse|renderToStaticMarkup/.test(src)) return false;
  // Print windows get their CSS from template literals, and canvas charts take
  // colours as plain strings; neither can resolve var(), so those files only
  // get the style-property rewrites.
  const hasPrintHtml = /document\.write|<!DOCTYPE/i.test(src);
  const hasCanvas = /(fillStyle|strokeStyle|shadowColor)\s*=/.test(src);
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
      // Semi-transparent white text on a coloured button or badge stays white:
      // the button is coloured in both themes.
      const onColour = (key === "color" || key === "WebkitTextFillColor") && prop.parent &&
        ts.isObjectLiteralExpression(prop.parent) && !backgroundIsNeutral(siblingBackground(prop.parent));
      if (!onColour) next = rewriteInk(next);
      // Gradient text (background-clip: text): its colours are text colours,
      // so they get the same darker-on-white variables as plain text.
      if (BG_PROPS.has(key) && prop.parent && ts.isObjectLiteralExpression(prop.parent) && clipsToText(prop.parent)) {
        next = rewriteTextColour(next);
      }
      if (BG_PROPS.has(key)) next = rewriteDarkRgba(rewriteDarkHex(next, "bg"));
      else if (BORDER_PROPS.has(key)) next = rewriteDarkHex(next, "border");

      if (key === "color" || key === "WebkitTextFillColor") next = boostInkAlpha(next);

      // Hover handlers: e.currentTarget.style.color = "white". Same rule as a
      // style object — repaint unless this handler also sets a coloured background.
      if (key === "color" && !prop.parent && ts.isStringLiteral(node)) {
        const v = rawText.trim().toLowerCase();
        let fn = node.parent;
        while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
        const body = fn ? fn.getText(sf) : "";
        const bgs = [...body.matchAll(/style\.background(?:Color)?\s*=\s*["'`]([^"'`]*)["'`]/g)].map((m) => m[1]);
        const dynamicBg = /style\.background(?:Color)?\s*=\s*[^"'`\s]/.test(body);
        if (!dynamicBg && bgs.every(backgroundIsNeutral)) {
          if (v === "#fff" || v === "#ffffff" || v === "white") next = `var(--ink-solid, ${rawText})`;
          else next = rewriteTextColour(next);
        }
      }

      if ((key === "color" || key === "WebkitTextFillColor") && prop.parent && ts.isObjectLiteralExpression(prop.parent)) {
        // Text on a coloured button or badge keeps its colour; only text sitting
        // on a (formerly dark) neutral surface is repainted.
        let bg = null;
        let dynamic = false;
        for (const p of prop.parent.properties) {
          if (ts.isSpreadAssignment(p)) continue; // spreads usually carry card/input base styles
          if (ts.isPropertyAssignment(p) && BG_PROPS.has(propName(p.name))) {
            const t = literalText(p.initializer);
            if (t === undefined) dynamic = true; else bg = t;
          }
        }
        if (!dynamic && backgroundIsNeutral(bg)) {
          const v = rawText.trim().toLowerCase();
          if (v === "#fff" || v === "#ffffff" || v === "white") {
            if (ts.isStringLiteral(node) && prop.initializer === node) next = `var(--ink-solid, ${rawText})`;
          } else {
            next = rewriteTextColour(next);
          }
        }
      }
    } else if (!hasCanvas && ts.isStringLiteral(node) && COLOUR_ONLY.test(rawText) &&
               roleOf(key || (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name) ? node.parent.name.text : null))) {
      // A colour in a theme object or const, e.g. T = { muted: "rgba(255,255,255,.38)" },
      // const BORDER = "rgba(255,255,255,.08)". The name says what it paints.
      const name = key || node.parent.name.text;
      next = rewriteByRole(next, roleOf(name));
    } else if (!key && !hasCanvas && ts.isStringLiteral(node) && /^\s*rgba\(\s*255\s*,\s*255\s*,\s*255\s*,[^)]*\)\s*$/.test(rawText)) {
      // A bare colour value held in a const or passed to a style helper:
      // const border = "rgba(255,255,255,.07)";  s.btn("rgba(255,255,255,.08)")
      next = rewriteInk(next);
    } else if (!key && !hasPrintHtml && (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node))) {
      // Raw CSS text, e.g. <style>{`...`}</style>. Only when it looks like CSS declarations.
      if (/(background|border|color|box-shadow)\s*:/.test(rawText)) {
        next = rewriteInk(next);
        next = next.replace(/(background(?:-color|-image)?\s*:[^;}{]*)/g, (d) => rewriteDarkHex(d, "bg"));
        next = next.replace(/((?:border|outline)(?:-[a-z]+)*\s*:[^;}{]*)/g, (d) => rewriteDarkHex(d, "border"));
        next = rewriteCssRules(next);
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
console.log(JSON.stringify({
  changed, scanned: files.length,
  dark: [...seenDark].sort(), darkBorder: [...seenDarkBorder].sort(),
  darkRgba: [...seenDarkRgba].sort(), text: [...seenText].sort(),
}));
