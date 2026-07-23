// Third pass: fix multi-value padding strings on pages that already have isMobile.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DASHBOARD_PATH = path.resolve(__dirname, "../app/dashboard");

// Find pages that have isMobile AND still have hard-coded multi-value padding
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
console.log(`Checking ${files.length} pages with isMobile for padding fixes...\n`);

let fixed = 0;
let skipped = 0;

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    const original = content;

    // Fix page-level multi-value padding (e.g. "28px 32px", "24px 28px", "24px 32px", "20px 24px")
    // Only when adjacent to minHeight or fontFamily (page container indicator)
    // Pattern: padding: "Xpx Ypx" where X is 20-40, Y is 20-40
    content = content.replace(
      /padding:\s*["'`](\d{2,})px\s+(\d{2,})px["'`]/g,
      (_match, top, side) => {
        const t = parseInt(top);
        const s = parseInt(side);
        // Only fix typical page-level paddings (16px-40px range)
        if (t < 14 || t > 48 || s < 14 || s > 48) return _match;
        // Skip if already a ternary (shouldn't happen but safety check)
        if (_match.includes("isMobile")) return _match;
        const mTop = Math.max(12, Math.round(t * 0.55));
        const mSide = Math.max(10, Math.round(s * 0.45));
        return `padding: isMobile ? "${mTop}px ${mSide}px" : "${top}px ${side}px"`;
      }
    );

    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf8");
      fixed++;
      console.log(`✓ ${filePath.replace(DASHBOARD_PATH, "")}`);
    } else {
      skipped++;
    }
  } catch (err) {
    console.error(`✗ ERROR ${filePath}: ${err.message}`);
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Fixed padding: ${fixed}`);
console.log(`Skipped      : ${skipped}`);
