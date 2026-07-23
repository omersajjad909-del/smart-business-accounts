// Final pass: fix repeat(4,minmax(0,1fr)) variants and remaining fixed-px layouts.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DASHBOARD_PATH = path.resolve(__dirname, "../app/dashboard");

// All pages that have isMobile already
let rawFiles;
try {
  rawFiles = execSync(
    `grep -rl "isMobile" "${DASHBOARD_PATH}" --include="page.tsx"`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString();
} catch (e) {
  rawFiles = e.stdout ? e.stdout.toString() : "";
}

const files = rawFiles.trim().split("\n").filter(Boolean);
console.log(`Scanning ${files.length} pages with isMobile...\n`);

let fixed = 0;
let skipped = 0;

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    const original = content;

    // ── 4-col grids: minmax variant ──────────────────────────────
    content = content.replace(
      /gridTemplateColumns:\s*["'`]repeat\(4,\s*minmax\(0,\s*1fr\)\)["'`]/g,
      'gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,minmax(0,1fr))"'
    );
    // repeat(4, minmax(180px, 1fr)) etc
    content = content.replace(
      /gridTemplateColumns:\s*["'`]repeat\(4,\s*minmax\([^)]+\)\)["'`]/g,
      (m) => {
        if (m.includes("isMobile")) return m;
        return `gridTemplateColumns: isMobile ? "repeat(2,1fr)" : ${m.replace("gridTemplateColumns: ", "")}`;
      }
    );

    // ── 3-col grids: minmax variant ──────────────────────────────
    content = content.replace(
      /gridTemplateColumns:\s*["'`]repeat\(3,\s*minmax\(0,\s*1fr\)\)["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))"'
    );
    content = content.replace(
      /gridTemplateColumns:\s*["'`]repeat\(3,\s*minmax\([^)]+\)\)["'`]/g,
      (m) => {
        if (m.includes("isMobile")) return m;
        return `gridTemplateColumns: isMobile ? "1fr" : ${m.replace("gridTemplateColumns: ", "")}`;
      }
    );

    // ── Fixed-px sidebar (Xfr Ypx or Xpx 1fr) not yet guarded ──
    // e.g. "1fr 320px", "1fr 360px", "2fr 320px", "300px 1fr", "260px 1fr"
    content = content.replace(
      /gridTemplateColumns:\s*["'`](\d+(?:\.\d+)?fr)\s+(\d{3,})px["'`]/g,
      (_m, fr, px) => `gridTemplateColumns: isMobile ? "1fr" : "${fr} ${px}px"`
    );
    content = content.replace(
      /gridTemplateColumns:\s*["'`](\d{3,})px\s+(\d+(?:\.\d+)?fr)["'`]/g,
      (_m, px, fr) => `gridTemplateColumns: isMobile ? "1fr" : "${px}px ${fr}"`
    );
    // "1fr 340px 1fr" type
    content = content.replace(
      /gridTemplateColumns:\s*["'`]1fr\s+(\d{3,})px\s+1fr["'`]/g,
      (_m, px) => `gridTemplateColumns: isMobile ? "1fr" : "1fr ${px}px 1fr"`
    );

    // ── Remaining unguarded "1fr 1fr 1fr 1fr" (4-col) ───────────
    content = content.replace(
      /gridTemplateColumns:\s*["'`]1fr\s+1fr\s+1fr\s+1fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr"'
    );

    // ── Remaining unguarded "1fr 1fr 1fr" (3-col) ───────────────
    content = content.replace(
      /gridTemplateColumns:\s*["'`]1fr\s+1fr\s+1fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr"'
    );

    // ── auto-fill / auto-fit with minmax ─────────────────────────
    // leave these alone — they're already responsive by nature

    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf8");
      fixed++;
      console.log(`✓ ${filePath.replace(DASHBOARD_PATH, "")}`);
    } else {
      skipped++;
    }
  } catch (err) {
    console.error(`✗ ${filePath}: ${err.message}`);
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Fixed : ${fixed}`);
console.log(`Skipped: ${skipped}`);
