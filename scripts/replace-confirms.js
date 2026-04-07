const fs = require("fs");
const path = require("path");

const DASHBOARD = path.join(__dirname, "../app/dashboard");

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

const files = walk(DASHBOARD);
let totalFixed = 0;
let filesFixed = 0;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("confirm(")) continue;

  // Replace: if (!confirm("msg")) return; / if (confirm("msg"))
  // Replace: if (window.confirm("msg")) / confirm("msg")
  // Replace:  const ok = confirm("msg")
  // All variations: window.confirm(x) → await confirmToast(x)

  const original = src;

  // Pattern: if (!confirm(...)) return;  OR  if (!window.confirm(...)) return;
  src = src.replace(/if\s*\(\s*!(?:window\.)?confirm\(([^)]+)\)\s*\)\s*return;/g,
    (_, msg) => `if (!(await confirmToast(${msg}))) return;`);

  // Pattern: if (confirm(...)) {  OR  if (window.confirm(...)) {
  src = src.replace(/if\s*\(\s*(?:window\.)?confirm\(([^)]+)\)\s*\)/g,
    (_, msg) => `if (await confirmToast(${msg}))`);

  // Pattern: const ok = confirm(...)  OR  const confirmed = confirm(...)
  src = src.replace(/const\s+(\w+)\s*=\s*(?:window\.)?confirm\(([^)]+)\)/g,
    (_, varName, msg) => `const ${varName} = await confirmToast(${msg})`);

  // Pattern: standalone confirm(...) calls remaining
  src = src.replace(/(?<![.a-zA-Z])(?:window\.)?confirm\(([^)]+)\)/g,
    (_, msg) => `await confirmToast(${msg})`);

  if (src === original) continue;

  // Add import if needed
  const hasImport = src.includes("confirmToast");
  if (hasImport && !src.includes('from "@/lib/toast-feedback"') && !src.includes("from '@/lib/toast-feedback'")) {
    // Add import after first import line
    src = src.replace(/(import[^;]+;[\r\n])/, `$1import { confirmToast } from "@/lib/toast-feedback";\n`);
  } else if (!src.includes('from "@/lib/toast-feedback"') && !src.includes("from '@/lib/toast-feedback'")) {
    src = `import { confirmToast } from "@/lib/toast-feedback";\n` + src;
  }

  fs.writeFileSync(file, src, "utf8");
  totalFixed++;
  filesFixed++;
  console.log(`Fixed: ${path.relative(DASHBOARD, file)}`);
}

console.log(`\nDone: ${filesFixed} files updated`);
