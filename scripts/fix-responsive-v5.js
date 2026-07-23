// Final targeted fixes for remaining non-responsive grids.
const fs = require("fs");
const { execSync } = require("child_process");

const BASE = "d:/projects/smart-business-accounts/app/dashboard";

// Files with specific remaining patterns
const FILTER_BAR_FILES = [
  "advance-payment/page.tsx",
  "contra/page.tsx",
  "cpv/page.tsx",
  "crv/page.tsx",
  "expense-vouchers/page.tsx",
  "jv/page.tsx",
];

const FORM_GRID_FILES = [
  "payroll/page.tsx",
  "stock-movements/page.tsx",
  "trade/export-docs/page.tsx",
  "trade/freight/page.tsx",
  "notifications/page.tsx",
  "contra/page.tsx",
  "cpv/page.tsx",
  "crv/page.tsx",
];

let fixed = 0;

function patch(relPath, fn) {
  const full = `${BASE}/${relPath}`;
  if (!fs.existsSync(full)) return;
  let c = fs.readFileSync(full, "utf8");
  const orig = c;
  c = fn(c);
  if (c !== orig) {
    fs.writeFileSync(full, c, "utf8");
    console.log(`✓ ${relPath}`);
    fixed++;
  }
}

// ── Fix filter bars "180px 240px 1fr" → stack on mobile ──────────
[...FILTER_BAR_FILES, "sales-invoice/page.tsx"].forEach(f => {
  patch(f, c => c
    .replace(
      /gridTemplateColumns:\s*["'`]180px 240px 1fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr" : "180px 240px 1fr"'
    )
    .replace(
      /gridTemplateColumns:\s*["'`]160px 160px 1fr 2fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr 1fr" : "160px 160px 1fr 2fr"'
    )
    .replace(
      /gridTemplateColumns:\s*["'`]160px 1fr 1fr 160px["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr 1fr" : "160px 1fr 1fr 160px"'
    )
  );
});

// ── Fix multi-col form rows in accounting/trade pages ────────────
FORM_GRID_FILES.forEach(f => {
  patch(f, c => c
    .replace(
      /gridTemplateColumns:\s*["'`]2fr 1fr 1fr 1fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr"'
    )
    .replace(
      /gridTemplateColumns:\s*["'`]2fr 1fr 1fr 1fr auto["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr auto"'
    )
    .replace(
      /gridTemplateColumns:\s*["'`]1fr 1fr 1fr 1fr 1fr["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr"'
    )
    .replace(
      /gridTemplateColumns:\s*["'`]1fr 100px 100px 100px["'`]/g,
      'gridTemplateColumns: isMobile ? "1fr" : "1fr 100px 100px 100px"'
    )
  );
});

// ── POS and Sales-order line item tables → overflow wrapper ──────
["retail/pos/page.tsx", "sales-order/page.tsx"].forEach(f => {
  patch(f, c => {
    // Wrap the invoice line items grid in overflow-x-auto
    // Pattern: a div with multi-column fixed grid used for line items
    c = c.replace(
      /(<div[^>]*gridTemplateColumns:\s*["'`]22px 1fr 68px 88px 58px 68px 18px["'`][^>]*>)/g,
      '<div style={{ overflowX: "auto" }}>$1<div style={{ minWidth: 560 }}>'
    );
    c = c.replace(
      /(<div[^>]*gridTemplateColumns:\s*["'`]1fr 80px 110px 90px 32px["'`][^>]*>)/g,
      '<div style={{ overflowX: "auto" }}>$1<div style={{ minWidth: 480 }}>'
    );
    return c;
  });
});

// ── hospital/prescriptions line items ────────────────────────────
patch("hospital/prescriptions/page.tsx", c =>
  c.replace(
    /gridTemplateColumns:\s*["'`]2fr 1fr 1\.5fr 1fr 60px 32px["'`]/g,
    'gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1.5fr 1fr 60px 32px"'
  )
);

// ── AI page table grids ───────────────────────────────────────────
patch("ai/page.tsx", c => c
  .replace(
    /gridTemplateColumns:\s*["'`]1fr 60px 90px 80px 90px["'`]/g,
    'gridTemplateColumns: isMobile ? "1fr" : "1fr 60px 90px 80px 90px"'
  )
  .replace(
    /gridTemplateColumns:\s*["'`]1fr 80px 90px 90px 90px 90px["'`]/g,
    'gridTemplateColumns: isMobile ? "1fr" : "1fr 80px 90px 90px 90px 90px"'
  )
);

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Fixed: ${fixed}`);
