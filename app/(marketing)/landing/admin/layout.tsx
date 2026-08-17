import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

/**
 * Overrides the canonical inherited from landing/layout.tsx.
 *
 * That parent deliberately points at `${BASE}/`, because /landing really is the
 * same page as the home page. The rule applied to this child too, so
 * /landing/admin was telling Google it *was* the home page — a duplicate claim
 * against entirely different content, which is the kind of signal that lands a
 * URL in "Duplicate without user-selected canonical".
 *
 * It is also noindexed: the page is an orphan — nothing links to it, it is not
 * in sitemap.ts, and the same material is covered by /roles and /security. Drop
 * the `robots` block if it is ever promoted into the real navigation.
 */
export const metadata: Metadata = {
  alternates: { canonical: `${BASE}/landing/admin` },
  robots: { index: false, follow: true },
};

export default function LandingAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
