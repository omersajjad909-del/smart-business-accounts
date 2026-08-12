/**
 * Extracts the dashboard sidebar's own group order into lib/dashboardNavOrder.ts.
 *
 * The sidebar is ~2000 lines of hand-written JSX in app/dashboard/layout.tsx, so
 * its order lives nowhere a component can import. /admin/plans needs that order:
 * admins read the sidebar all day and expect the plan grid to match it, and it
 * used to group pages by the registry's own `businessLabel · section` instead —
 * which buried the shared pages under the industry ones and matched nothing the
 * admin had ever seen.
 *
 * Run after adding or reordering sidebar links:
 *   npm run gen:nav-order
 *
 * A page missing from the generated map is not lost — the grid puts it in a
 * trailing "Not in the sidebar" group, which is also how you spot a page that
 * has no sidebar link at all.
 */
import fs from "node:fs";
import path from "node:path";

const LAYOUT = path.join(process.cwd(), "app/dashboard/layout.tsx");
const OUT = path.join(process.cwd(), "lib/dashboardNavOrder.ts");

const lines = fs.readFileSync(LAYOUT, "utf8").split("\n");

/** Links rendered above the first <NavGroup> — Dashboard, AI Intelligence, etc. */
const TOP_LEVEL = "Main";

const stack = [];
const groups = new Map();
const order = [];

const bucket = (title) => {
  if (!groups.has(title)) {
    groups.set(title, []);
    order.push(title);
  }
  return groups.get(title);
};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (/<NavGroup\b/.test(line)) {
    // title= sits on the opening line for one-liners and a line or two down
    // when the props are wrapped.
    let title = null;
    for (let j = i; j < Math.min(i + 6, lines.length); j++) {
      const m = lines[j].match(/title="([^"]+)"/);
      if (m) { title = m[1]; break; }
    }
    stack.push(title ?? TOP_LEVEL);
  }
  if (/<\/NavGroup>/.test(line)) stack.pop();

  // <NavLink> only. Plain href= also matches the topbar, the quick-action menu
  // and the search results, which would drag /dashboard/sales-invoice into the
  // "Main" bucket and — first occurrence winning — keep it out of Sales &
  // Purchase where the sidebar actually shows it.
  for (const m of line.matchAll(/<NavLink\s+href="(\/dashboard[^"]*)"/g)) {
    const route = m[1].split("?")[0];
    const arr = bucket(stack.length ? stack[stack.length - 1] : TOP_LEVEL);
    // First occurrence wins: a few routes (sales-invoice, inventory) are linked
    // from both a core group and an industry group, and the grid needs one
    // deterministic home for each.
    if (!arr.includes(route)) arr.push(route);
  }
}

const untitled = order.filter((g) => g === "(untitled)");
if (untitled.length) {
  console.error(`refusing to write: ${untitled.length} <NavGroup> without a string title=`);
  process.exit(1);
}

const body = order
  .map((title) => {
    const routes = groups.get(title).map((r) => `      ${JSON.stringify(r)},`).join("\n");
    return `  {\n    title: ${JSON.stringify(title)},\n    routes: [\n${routes}\n    ],\n  },`;
  })
  .join("\n");

const file = `// GENERATED FILE — do not edit by hand.
// Source: app/dashboard/layout.tsx
// Regenerate: npm run gen:nav-order
//
// The dashboard sidebar's groups and links, in the exact order the sidebar
// renders them. /admin/plans groups its page grid by this so the two screens
// read the same way round.

export type DashboardNavGroup = { title: string; routes: string[] };

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
${body}
];

/** route -> index of its sidebar group, and its position inside that group. */
const ROUTE_POSITION = new Map<string, { group: number; item: number }>();
DASHBOARD_NAV_GROUPS.forEach((group, gi) => {
  group.routes.forEach((route, ri) => {
    if (!ROUTE_POSITION.has(route)) ROUTE_POSITION.set(route, { group: gi, item: ri });
  });
});

/**
 * Where a route sits in the sidebar, or null when the sidebar never links it.
 * Query strings are stripped so /dashboard/ai?tab=x resolves like /dashboard/ai.
 */
export function navPositionForRoute(route: string): { group: number; item: number } | null {
  return ROUTE_POSITION.get(String(route || "").split("?")[0]) ?? null;
}

export function navGroupTitle(index: number): string {
  return DASHBOARD_NAV_GROUPS[index]?.title ?? "";
}
`;

fs.writeFileSync(OUT, file);
console.log(`wrote ${path.relative(process.cwd(), OUT)} — ${order.length} groups, ${[...groups.values()].reduce((n, r) => n + r.length, 0)} links`);
