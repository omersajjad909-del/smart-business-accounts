// FILE: app/sitemap.ts
// Next.js 13+ automatic sitemap generation

import { MetadataRoute } from "next";

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
    // Tools & converters
    { url: `${BASE}/roi-calculator`,    lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/compare`,           lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/case-studies`,      lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 },
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

  // Help articles
  const helpSlugs = ["getting-started", "invoicing", "inventory", "payroll", "bank-reconciliation", "reports"];
  const helpPages = helpSlugs.map(slug => ({
    url: `${BASE}/help/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  return [...staticPages, ...extraPages, ...blogPages, ...helpPages];
}
