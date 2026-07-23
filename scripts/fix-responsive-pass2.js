// Second pass: fixes remaining non-responsive pages with 1fr 1fr grids and complex padding.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DASHBOARD_PATH = path.resolve(__dirname, "../app/dashboard");
const HOOK_IMPORT = `import { useResponsive } from "@/hooks/useResponsive";`;
const HOOK_USAGE = `\n  const { isMobile } = useResponsive();`;

// Find all truly non-responsive pages (exclude workspace pages too)
let rawFiles;
try {
  rawFiles = execSync(
    `grep -rL "isMobile|sm:|md:|lg:|@media|matchMedia|useResponsive|MobileTable|DesktopTable|BusinessRecordWorkspace" "${DASHBOARD_PATH}" --include="page.tsx"`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString();
} catch (e) {
  rawFiles = e.stdout ? e.stdout.toString() : "";
}

const files = rawFiles.trim().split("\n").filter(Boolean);
console.log(`Found ${files.length} non-responsive pages for pass 2\n`);

let fixed = 0;
let skipped = 0;
const errors = [];

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, "utf8");

    // Skip redirects and trivial pages
    if (content.length < 200 || content.includes("router.replace") || content.includes("redirect(")) {
      skipped++;
      continue;
    }

    // Detect patterns
    const has2ColGrid = /gridTemplateColumns:\s*["'`]1fr\s+1fr["'`]/.test(content);
    const has2FrGrid = /gridTemplateColumns:\s*["'`]2fr\s+1fr["'`]/.test(content) ||
                       /gridTemplateColumns:\s*["'`]1\.5fr\s+1fr["'`]/.test(content) ||
                       /gridTemplateColumns:\s*["'`]3fr\s+2fr["'`]/.test(content);
    const hasTable = /<table/.test(content) && !/<div[^>]*overflowX/.test(content);
    const hasComplexPad = /padding:\s*["'`]\d+px\s+\d+px["'`]/.test(content);
    const hasModalWidth = /width:\s*["'`](?:520|560|600|580|480|460|440|700|750|800)px["'`]/.test(content);

    if (!has2ColGrid && !has2FrGrid && !hasTable && !hasComplexPad && !hasModalWidth) {
      skipped++;
      continue;
    }

    let modified = false;

    // 1. Add import
    if (!content.includes("useResponsive")) {
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

    // 2. Add hook usage inside component
    if (!content.includes("useResponsive()")) {
      const funcRe = /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/;
      const m = content.match(funcRe);
      if (m) {
        const insertAt = content.indexOf(m[0]) + m[0].length;
        content = content.slice(0, insertAt) + HOOK_USAGE + content.slice(insertAt);
        modified = true;
      }
    }

    // 3. Fix 2-col fr grids → single col on mobile
    content = content.replace(
      /gridTemplateColumns:\s*["'`]1fr\s+1fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr"'
    );
    content = content.replace(
      /gridTemplateColumns:\s*["'`]2fr\s+1fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr"'
    );
    content = content.replace(
      /gridTemplateColumns:\s*["'`]1\.5fr\s+1fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr"'
    );
    content = content.replace(
      /gridTemplateColumns:\s*["'`]3fr\s+2fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr"'
    );

    // 4. Fix complex padding like "28px 32px", "24px 28px", "20px 24px", "16px 24px"
    content = content.replace(
      /padding:\s*["'`](\d+)px\s+(\d+)px["'`]/g,
      (_match, top, side) => {
        const mTop = Math.max(8, Math.round(parseInt(top) * 0.6));
        const mSide = Math.max(8, Math.round(parseInt(side) * 0.5));
        return `padding: isMobile ? "${mTop}px ${mSide}px" : "${top}px ${side}px"`;
      }
    );

    // 5. Wrap raw <table> elements with overflow-x-auto if they don't have it
    // Add overflow wrapper around tables that are inside a div without overflow-x-auto
    content = content.replace(
      /(<div[^>]*style=\{[^}]*\}[^>]*>)\s*(<table\s)/g,
      (match, divOpen, tableOpen) => {
        if (match.includes("overflow")) return match;
        return `${divOpen}<div style={{ overflowX: "auto" }}>${tableOpen}`;
      }
    );

    // 6. Fix modal widths
    content = content.replace(
      /width:\s*["'`](520|560|600|580|480|460|440|700|750|800)px["'`](\s*,?\s*(?:maxHeight|overflowY|borderRadius|padding|background))/g,
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
