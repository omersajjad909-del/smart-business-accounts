const fs = require('fs');
const path = require('path');

function getAllTsx(dir) {
  const results = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.next') {
        results.push(...getAllTsx(full));
      } else if (item.isFile() && item.name.endsWith('.tsx')) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

const files = getAllTsx('./app/dashboard');
let totalFixed = 0;

for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  if (!src.includes('alert(') && !src.includes('window.alert(')) continue;

  const orig = src;

  // Ensure toast import is at top (after "use client" if present)
  const hasImport = src.includes("from 'react-hot-toast'") || src.includes('from "react-hot-toast"');
  if (!hasImport) {
    if (src.startsWith('"use client"') || src.startsWith("'use client'")) {
      src = src.replace(/^["']use client["'];?\n/, `"use client";\nimport toast from "react-hot-toast";\n`);
    } else {
      src = 'import toast from "react-hot-toast";\n' + src;
    }
  }

  function classify(msg) {
    const m = (msg || '').toLowerCase();
    if (/success|saved|updated|added|deleted|completed|sent|done|imported|assigned|cleared|approved|paid|created|confirmed|removed|set|fixed/.test(m)) return 'success';
    if (/fail|error|required|invalid|expired|missing|select|login|warning|cannot|not found|already|only|must|please|wrong|incorrect|unauthorized|forbidden/.test(m)) return 'error';
    return 'neutral';
  }

  // Replace alert( and window.alert( — handle multi-arg patterns too
  src = src.replace(/(?:window\.)?alert\s*\(([^;]+?)\)\s*;/g, (match, inner) => {
    // Skip if already converted
    if (match.trim().startsWith('toast')) return match;
    const type = classify(inner);
    if (type === 'success') return `toast.success(${inner});`;
    if (type === 'error') return `toast.error(${inner});`;
    return `toast(${inner});`;
  });

  // Also handle: return alert("...") pattern
  src = src.replace(/return\s+(?:window\.)?alert\s*\(([^)]+)\)/g, (match, inner) => {
    if (match.includes('toast')) return match;
    const type = classify(inner);
    if (type === 'success') return `{ toast.success(${inner}); return; }`;
    if (type === 'error') return `{ toast.error(${inner}); return; }`;
    return `{ toast(${inner}); return; }`;
  });

  if (src !== orig) {
    fs.writeFileSync(f, src, 'utf8');
    totalFixed++;
    console.log('Fixed:', f);
  }
}

console.log('\nTotal files fixed:', totalFixed);

// Count remaining
let remaining = 0;
for (const f of getAllTsx('./app/dashboard')) {
  const src = fs.readFileSync(f, 'utf8');
  const matches = src.match(/(?<![a-zA-Z.])alert\s*\(/g);
  if (matches) remaining += matches.length;
}
console.log('Remaining alert() calls:', remaining);
