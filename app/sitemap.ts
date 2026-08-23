// FILE: app/sitemap.ts
// Next.js 13+ automatic sitemap generation

import { MetadataRoute } from "next";
import { SEO_ARTICLES } from "./(marketing)/blog/seo-articles";
import { LIVE_TYPES } from "@/lib/businessModules";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

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
    // Resources
    { url: `${BASE}/blog`,              lastModified: now, changeFrequency: "daily" as const,   priority: 0.8 },
    { url: `${BASE}/changelog`,         lastModified: now, changeFrequency: "weekly" as const,  priority: 0.6 },
    { url: `${BASE}/demo`,              lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/affiliate`,         lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/trust`,             lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${BASE}/help`,              lastModified: now, changeFrequency: "weekly" as const,  priority: 0.7 },
    { url: `${BASE}/security`,          lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/testimonials`,      lastModified: now, changeFrequency: "weekly" as const,  priority: 0.7 },
    { url: `${BASE}/industries`,        lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    // Legal
    { url: `${BASE}/legal/privacy`,     lastModified: now, changeFrequency: "yearly" as const,  priority: 0.4 },
    { url: `${BASE}/legal/cookies`,     lastModified: now, changeFrequency: "yearly" as const,  priority: 0.38 },
    { url: `${BASE}/legal/terms`,       lastModified: now, changeFrequency: "yearly" as const,  priority: 0.4 },
    { url: `${BASE}/legal/sla`,         lastModified: now, changeFrequency: "yearly" as const,  priority: 0.35 },
    { url: `${BASE}/legal/dpa`,         lastModified: now, changeFrequency: "yearly" as const,  priority: 0.35 },
    { url: `${BASE}/legal/aup`,         lastModified: now, changeFrequency: "yearly" as const,  priority: 0.35 },
    { url: `${BASE}/legal/refund`,      lastModified: now, changeFrequency: "yearly" as const,  priority: 0.35 },
    { url: `${BASE}/legal/delivery`,    lastModified: now, changeFrequency: "yearly" as const,  priority: 0.35 },
    // Tools & converters
    { url: `${BASE}/roi-calculator`,    lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/compare`,           lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/case-studies`,      lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
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
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  // Buyer-intent articles. Derived from the data file so the sitemap cannot
  // drift out of sync with what actually renders. Higher priority than the
  // rest of the blog: these are the pages built to be found on search and
  // cited by AI answer engines.
  const seoArticlePages = Object.keys(SEO_ARTICLES).map(slug => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: now,
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
