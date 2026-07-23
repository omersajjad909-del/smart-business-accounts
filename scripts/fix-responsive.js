// Auto-patches non-responsive dashboard pages to add isMobile-based responsive grid layouts.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DASHBOARD_PATH = path.resolve(__dirname, "../app/dashboard");
const HOOK_IMPORT = `import { useResponsive } from "@/hooks/useResponsive";`;
const HOOK_USAGE = `\n  const { isMobile } = useResponsive();`;

// Find all pages with no responsive handling
let rawFiles;
try {
  rawFiles = execSync(
    `grep -rL "isMobile|sm:|md:|lg:|@media|matchMedia|useResponsive|MobileTable|DesktopTable" "${DASHBOARD_PATH}" --include="page.tsx"`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString();
} catch (e) {
  rawFiles = e.stdout ? e.stdout.toString() : "";
}

const files = rawFiles.trim().split("\n").filter(Boolean);
console.log(`Found ${files.length} non-responsive pages to patch\n`);

let fixed = 0;
let skipped = 0;
const errors = [];

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, "utf8");

    // Only process pages that have inline grid patterns we can safely fix
    const hasStats4Col =
      /gridTemplateColumns:\s*["'`]repeat\(4/.test(content) ||
      /gridTemplateColumns:\s*["'`]repeat\(3/.test(content) ||
      /gridTemplateColumns:\s*["'`]1fr\s+1fr\s+1fr\s+1fr["'`]/.test(content) ||
      /gridTemplateColumns:\s*["'`]1fr\s+1fr\s+1fr["'`]/.test(content);
    const hasSidebarLayout =
      /gridTemplateColumns:\s*["'`]1fr\s+\d+px/.test(content) ||
      /gridTemplateColumns:\s*["'`]\d+(?:\.\d+)?fr\s+\d+px/.test(content) ||
      /gridTemplateColumns:\s*["'`][^"'`]+\d+px[^"'`]*["'`]/.test(content);
    const hasPagePad =
      /padding:\s*["'`]?32["'`]?(?:px)?["'`]?/.test(content) ||
      /padding:\s*["'`]?24["'`]?(?:px)?["'`]?/.test(content);
    const hasModal =
      /width:\s*["'`](?:520|560|600|580|480|460|440)px["'`]/.test(content) &&
      /maxHeight/.test(content);

    if (!hasStats4Col && !hasSidebarLayout && !hasPagePad && !hasModal) {
      skipped++;
      continue;
    }

    let modified = false;

    // ── 1. Add import ──────────────────────────────────────────────────────
    if (!content.includes("useResponsive")) {
      // Find last import line
      const lines = content.split("\n");
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
      }
      if (lastImportIdx >= 0) {
        lines.splice(lastImportIdx + 1, 0, HOOK_IMPORT);
        content = lines.join("\n");
        modified = true;
      }
    }

    // ── 2. Add hook usage inside the default export function ──────────────
    if (!content.includes("useResponsive()")) {
      // Match: export default function FooPage(...) { or export default function FooPage() {
      const funcRe = /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/;
      const m = content.match(funcRe);
      if (m) {
        const insertAt = content.indexOf(m[0]) + m[0].length;
        content = content.slice(0, insertAt) + HOOK_USAGE + content.slice(insertAt);
        modified = true;
      }
    }

    // ── 3. Fix 4-column stats grids → 2-col on mobile ────────────────────
    content = content.replace(
      /gridTemplateColumns:\s*["'`]repeat\(4,\s*1fr\)["'`]/g,
      'gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)"'
    );

    // Fix 3-column grids → 1-col on mobile
    content = content.replace(
      /gridTemplateColumns:\s*["'`]repeat\(3,\s*1fr\)["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)"'
    );

    // Fix "1fr 1fr 1fr 1fr" → 2-col on mobile
    content = content.replace(
      /gridTemplateColumns:\s*["'`]1fr\s+1fr\s+1fr\s+1fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr"'
    );

    // Fix "1fr 1fr 1fr" → 1-col on mobile
    content = content.replace(
      /gridTemplateColumns:\s*["'`]1fr\s+1fr\s+1fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr"'
    );

    // ── 4. Fix sidebar/panel layout (1fr + fixed px) → single col mobile ─
    content = content.replace(
      /gridTemplateColumns:\s*["'`]1fr\s+(\d+)px["'`]/g,
      (_match, px) => `gridTemplateColumns: isMobile ? "1fr" : "1fr ${px}px"`
    );

    // Fix "Xfr Ypx" layouts (e.g. "1.2fr 160px 2fr", "2fr 1fr") with pixel widths → single col
    content = content.replace(
      /gridTemplateColumns:\s*["'`]([^"'`]*\d+px[^"'`]*)["'`]/g,
      (_match, cols) => `gridTemplateColumns: isMobile ? "1fr" : "${cols}"`
    );

    // ── 5. Fix page-level padding (outer div with minHeight or the S.page pattern) ─
    // Only patch where padding 32 or 24 appears alongside minHeight or fontFamily (page container)
    content = content.replace(
      /((?:minHeight:\s*["'`]100vh["'`][^}]*|fontFamily:[^}]+)[^}]*?)padding:\s*["'`]?32["'`]?(?:px)?["'`]?/g,
      '$1padding: isMobile ? "16px" : "32px"'
    );
    content = content.replace(
      /((?:minHeight:\s*["'`]100vh["'`][^}]*|fontFamily:[^}]+)[^}]*?)padding:\s*32\b/g,
      "$1padding: isMobile ? 16 : 32"
    );
    content = content.replace(
      /((?:minHeight:\s*["'`]100vh["'`][^}]*|fontFamily:[^}]+)[^}]*?)padding:\s*["'`]?24["'`]?(?:px)?["'`]?/g,
      '$1padding: isMobile ? "12px" : "24px"'
    );
    content = content.replace(
      /((?:minHeight:\s*["'`]100vh["'`][^}]*|fontFamily:[^}]+)[^}]*?)padding:\s*24\b/g,
      "$1padding: isMobile ? 12 : 24"
    );

    // ── 6. Fix modal widths → cap to 94vw on small screens ────────────────
    content = content.replace(
      /width:\s*["'`](520|560|600|480|460|440)px["'`](\s*,?\s*(?:maxHeight|overflowY))/g,
      (_match, px, after) => `width: isMobile ? "min(${px}px, 94vw)" : "${px}px"${after}`
    );

    if (modified) {
      fs.writeFileSync(filePath, content, "utf8");
      fixed++;
      console.log(`✓ ${filePath.replace(DASHBOARD_PATH, "")}`);
    } else {
      skipped++;
    }
  } catch (err) {
    errors.push({ filePath, error: err.message });
    console.error(`✗ ERROR: ${filePath}: ${err.message}`);
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Fixed : ${fixed}`);
console.log(`Skipped: ${skipped}`);
console.log(`Errors : ${errors.length}`);
