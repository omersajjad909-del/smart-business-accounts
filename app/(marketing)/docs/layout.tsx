import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Documentation — FinovaOS",
  description: "Comprehensive guides, API reference, video walkthroughs, and integration docs for FinovaOS — the global business accounting platform.",
  // No openGraph here before meant this page inherited the (marketing) root
  // layout's incomplete one (only type/locale/siteName/images — no title,
  // description, or url), same as canonical was missing outright.
  openGraph: {
    title: "Documentation | FinovaOS",
    description: "Guides, API reference, video walkthroughs, and integration docs for FinovaOS.",
    url: `${BASE}/docs`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Documentation" }],
    type: "website",
  },
  alternates: { canonical: `${BASE}/docs` },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
