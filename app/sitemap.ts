// FILE: app/sitemap.ts
// Next.js 13+ automatic sitemap generation

import { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

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
    { url: `${BASE}/careers`,           lastModified: now, changeFrequency: "weekly" as const,  priority: 0.7 },
    { url: `${BASE}/roles`,             lastModified: now, changeFrequency: "weekly" as const,  priority: 0.6 },
    { url: `${BASE}/culture`,           lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    // Resources
    { url: `${BASE}/blog`,              lastModified: now, changeFrequency: "daily" as const,   priority: 0.8 },
    { url: `${BASE}/changelog`,         lastModified: now, changeFrequency: "weekly" as const,  priority: 0.6 },
    { url: `${BASE}/demo`,              lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/affiliate`,         lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/trust`,             lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${BASE}/help`,              lastModified: now, changeFrequency: "weekly" as const,  priority: 0.7 },
    { url: `${BASE}/security`,          lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/status`,            lastModified: now, changeFrequency: "daily" as const,   priority: 0.5 },
    // Legal
    { url: `${BASE}/legal/privacy`,     lastModified: now, changeFrequency: "yearly" as const,  priority: 0.4 },
    { url: `${BASE}/legal/terms`,       lastModified: now, changeFrequency: "yearly" as const,  priority: 0.4 },
    // Auth
    { url: `${BASE}/login`,             lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/signup`,            lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
  ];

  // Additional high-priority pages
  const extraPages = [
    { url: `${BASE}/get-started`,        lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 },
    { url: `${BASE}/updates`,            lastModified: now, changeFrequency: "weekly" as const,  priority: 0.6  },
    { url: `${BASE}/support`,            lastModified: now, changeFrequency: "monthly" as const, priority: 0.55 },
    { url: `${BASE}/developers/api`,     lastModified: now, changeFrequency: "monthly" as const, priority: 0.6  },
  ];

  // Blog articles
  const blogSlugs = [
    "bank-reconciliation-guide", "1", "2", "3", "4", "5", "6", "7",
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