// FILE: app/sitemap.ts
// Next.js 13+ automatic sitemap generation

import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SEO_ARTICLES } from "./(marketing)/blog/seo-articles";
import { ALL_POSTS } from "./(marketing)/blog/posts";
import { LIVE_TYPES } from "@/lib/businessModules";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";
const FORGE_BASE = "https://finovaforge.com";
const FORGE_HOSTS = ["finovaforge.com", "www.finovaforge.com"];

// finovaforge.com is a second brand served from this same deployment (see
// FORGE_HOSTS in proxy.ts and forgeCanonical() in app/(forge)/forge/layout.tsx).
// This file used to return the FinovaOS sitemap unconditionally, so
// finovaforge.com/sitemap.xml served 134 www.finovaos.app URLs and not one of
// its own 13 pages — Google had no sitemap-level way to discover the Forge
// site at all. /status is deliberately left out: robots.ts disallows it.
function forgeSitemap(now: Date): MetadataRoute.Sitemap {
  const forgePages = [
    { path: "",            changeFrequency: "weekly" as const,  priority: 1.0 },
    { path: "/about",      changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/products",   changeFrequency: "monthly" as const, priority: 0.9 },
    { path: "/industries", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/solutions",  changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/blog",       changeFrequency: "weekly" as const,  priority: 0.7 },
    { path: "/careers",    changeFrequency: "weekly" as const,  priority: 0.6 },
    { path: "/contact",    changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/support",    changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/security",   changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/privacy",    changeFrequency: "yearly" as const,  priority: 0.4 },
    { path: "/terms",      changeFrequency: "yearly" as const,  priority: 0.4 },
  ];
  return forgePages.map(({ path, changeFrequency, priority }) => ({
    url: `${FORGE_BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}

// A sitemap where every URL carries the exact same lastModified (the build
// timestamp) tells a crawler nothing — it reads as "everything changed at
// once," which is how a real 24-month-old page and a page edited five
// minutes ago end up indistinguishable. Content types that carry their own
// real date (blog posts, SEO articles, legal pages) use it below; only pages
// with no tracked per-page date fall back to the build time.
//
// Per-page dates below — each one must match that page's own on-page
// `LAST_UPDATED` constant (app/(marketing)/legal/<slug>/page.tsx). Six of the
// eight previously all pointed at this same May date regardless of what the
// page itself said, which defeats the point described above for exactly the
// pages meant to demonstrate it.
const LEGAL_LAST_UPDATED = new Date("2026-05-10"); // privacy, terms
const LEGAL_SLA_LAST_UPDATED = new Date("2026-06-15");
const LEGAL_DPA_LAST_UPDATED = new Date("2026-06-15");
const LEGAL_AUP_LAST_UPDATED = new Date("2026-06-15");
const LEGAL_REFUND_LAST_UPDATED = new Date("2026-06-13");
const LEGAL_DELIVERY_LAST_UPDATED = new Date("2026-08-21");
const LEGAL_COOKIES_LAST_UPDATED = new Date("2026-07-12");
const LEGAL_SUBPROCESSORS_LAST_UPDATED = new Date("2026-07-09");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const host = (await headers()).get("host") || "";
  if (FORGE_HOSTS.includes(host.toLowerCase())) {
    return forgeSitemap(now);
  }

  const staticPages = [
    // Marketing - highest priority
    { url: BASE,                        lastModified: now, changeFrequency: "weekly" as const,  priority: 1.0 },
    { url: `${BASE}/features`,          lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${BASE}/pricing`,           lastModified: now, changeFrequency: "weekly" as const,  priority: 0.9 },
    { url: `${BASE}/solutions`,         lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    // Company
    { url: `${BASE}/about`,             lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${BASE}/contact`,           lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${BASE}/waitlist`,          lastModified: now, changeFrequency: "weekly" as const,  priority: 0.75 },
    { url: `${BASE}/careers`,           lastModified: now, changeFrequency: "weekly" as const,  priority: 0.7 },
    // Real pages, each with its own self-referencing canonical, that were
    // linked from the footer and/or another marketing page but never added
    // here — Google had to discover them by crawling those links instead of
    // being told about them directly.
    { url: `${BASE}/culture`,           lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/roles`,             lastModified: now, changeFrequency: "weekly" as const,  priority: 0.6 },
    { url: `${BASE}/feedback`,          lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/automation`,        lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
    // Resources
    { url: `${BASE}/blog`,              lastModified: now, changeFrequency: "daily" as const,   priority: 0.8 },
    { url: `${BASE}/changelog`,         lastModified: now, changeFrequency: "weekly" as const,  priority: 0.6 },
    { url: `${BASE}/updates`,           lastModified: now, changeFrequency: "weekly" as const,  priority: 0.6 },
    { url: `${BASE}/demo`,              lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/affiliate`,         lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/trust`,             lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${BASE}/help`,              lastModified: now, changeFrequency: "weekly" as const,  priority: 0.7 },
    { url: `${BASE}/security`,          lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/testimonials`,      lastModified: now, changeFrequency: "weekly" as const,  priority: 0.7 },
    { url: `${BASE}/industries`,        lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    // Legal — real last-updated date (matches LAST_UPDATED shown on each page)
    { url: `${BASE}/legal/privacy`,     lastModified: LEGAL_LAST_UPDATED, changeFrequency: "yearly" as const,  priority: 0.4 },
    { url: `${BASE}/legal/cookies`,     lastModified: LEGAL_COOKIES_LAST_UPDATED, changeFrequency: "yearly" as const,  priority: 0.38 },
    { url: `${BASE}/legal/terms`,       lastModified: LEGAL_LAST_UPDATED, changeFrequency: "yearly" as const,  priority: 0.4 },
    { url: `${BASE}/legal/sla`,         lastModified: LEGAL_SLA_LAST_UPDATED, changeFrequency: "yearly" as const,  priority: 0.35 },
    { url: `${BASE}/legal/dpa`,         lastModified: LEGAL_DPA_LAST_UPDATED, changeFrequency: "yearly" as const,  priority: 0.35 },
    { url: `${BASE}/legal/aup`,         lastModified: LEGAL_AUP_LAST_UPDATED, changeFrequency: "yearly" as const,  priority: 0.35 },
    { url: `${BASE}/legal/refund`,      lastModified: LEGAL_REFUND_LAST_UPDATED, changeFrequency: "yearly" as const,  priority: 0.35 },
    { url: `${BASE}/legal/delivery`,    lastModified: LEGAL_DELIVERY_LAST_UPDATED, changeFrequency: "yearly" as const,  priority: 0.35 },
    // Linked from the footer ("Sub-processors") and from /legal/dpa, but
    // missing from this sitemap entirely until now — a real, indexable page
    // that depended on Google finding it by crawling the footer link instead
    // of being told about it directly.
    { url: `${BASE}/legal/sub-processors`, lastModified: LEGAL_SUBPROCESSORS_LAST_UPDATED, changeFrequency: "yearly" as const, priority: 0.35 },
    // Tools & converters
    { url: `${BASE}/roi-calculator`,    lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/compare`,           lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/integrations`,      lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
    { url: `${BASE}/faq`,               lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    // Head-to-head pages — slugs must match RIVALS in compare/_data.ts
    { url: `${BASE}/compare/xero`,       lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
    { url: `${BASE}/compare/zoho-books`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
    { url: `${BASE}/compare/quickbooks`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
    { url: `${BASE}/compare/wave`,       lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
  ];

  // Additional pages
  const extraPages = [
    { url: `${BASE}/get-started`,              lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 },
    { url: `${BASE}/support`,                  lastModified: now, changeFrequency: "monthly" as const, priority: 0.65 },
    { url: `${BASE}/developers/api`,           lastModified: now, changeFrequency: "monthly" as const, priority: 0.6  },
    { url: `${BASE}/docs`,                     lastModified: now, changeFrequency: "weekly" as const,  priority: 0.65 },
    // Feature detail pages — all slugs verified against MODULES in features/[slug]/page.tsx
    { url: `${BASE}/features/accounting`,          lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 },
    { url: `${BASE}/features/invoicing`,           lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 },
    { url: `${BASE}/features/inventory`,           lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 },
    { url: `${BASE}/features/bank-reconciliation`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 },
    { url: `${BASE}/features/hr-payroll`,          lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 },
    { url: `${BASE}/features/crm`,                 lastModified: now, changeFrequency: "monthly" as const, priority: 0.8  },
    { url: `${BASE}/features/reports`,             lastModified: now, changeFrequency: "monthly" as const, priority: 0.8  },
    { url: `${BASE}/features/pos`,                 lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
    { url: `${BASE}/features/purchase-grn`,        lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
    { url: `${BASE}/features/multi-currency`,      lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
    { url: `${BASE}/features/multi-branch`,        lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
    { url: `${BASE}/features/role-access`,         lastModified: now, changeFrequency: "monthly" as const, priority: 0.7  },
  ];

  // Blog articles — only add real published slugs here (must exist in app/(marketing)/blog/posts.ts)
  const blogSlugs = [
    "bank-reconciliation-guide",
    "5-signs-outgrown-spreadsheets",
    "multi-currency-invoicing-guide",
    "cloud-erp-vs-accounting-software",
    "hr-payroll-software-guide",
  ];
  const blogPages = blogSlugs.map(slug => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: ALL_POSTS[slug]?.date ? new Date(ALL_POSTS[slug].date) : now,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  // Buyer-intent articles. Derived from the data file so the sitemap cannot
  // drift out of sync with what actually renders. Higher priority than the
  // rest of the blog: these are the pages built to be found on search and
  // cited by AI answer engines.
  const seoArticlePages = Object.entries(SEO_ARTICLES).map(([slug, article]) => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: article.date ? new Date(article.date) : now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // Help articles.
  // Every key of ARTICLES in app/(marketing)/help/[slug]/page.tsx. Google was
  // already crawling these; leaving them out of the sitemap meant it had to
  // guess at the canonical, which is how "?helpful=yes|no" variants ended up
  // competing with the real article URLs.
  const helpSlugs = [
    "add-branch", "add-employees", "add-products", "attendance", "balance-sheet", "bank-reconciliation",
    "branch-roles", "cancel-subscription", "cash-flow", "chart-of-accounts", "choose-plan", "company-profile",
    "connect-bank", "consolidated-pl", "cpv", "create-account", "create-invoice", "credit-notes",
    "crv", "data-export", "delete-account", "download-invoices", "export-reports", "first-invoice",
    "getting-started", "grn", "import-statements", "inventory-valuation", "invite-team", "journal-entries",
    "leave-management", "match-transactions", "multi-company", "multiple-accounts", "payslips", "period-locking",
    "pl-statement", "purchase-orders", "quotation-invoice", "record-payment", "recurring-invoices", "run-payroll",
    "salary-advance", "scheduled-reports", "send-invoice", "stock-alerts", "stock-entries", "stock-reports",
    "stock-transfer", "switch-company", "tax-summary", "trial-balance", "unmatched-transactions", "update-payment",
    "upgrade-plan",
  ];
  const helpPages = helpSlugs.map(slug => ({
    url: `${BASE}/help/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  // Industry landing pages. Only the industries that are actually live get
  // submitted — the coming-soon ones still carry a self-referencing canonical
  // (see app/(marketing)/for/[industry]/layout.tsx) but they are thin, so
  // pushing ~90 of them at Google would invite the duplicate-content problem
  // this sitemap is meant to help solve.
  const industryPages = LIVE_TYPES.map(id => ({
    url: `${BASE}/for/${id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...extraPages, ...seoArticlePages, ...blogPages, ...helpPages, ...industryPages];
}
