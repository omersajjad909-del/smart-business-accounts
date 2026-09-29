import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

// The page itself is "use client" (it has an in-page search box), so it
// cannot export metadata — without this it fell through to the (marketing)
// root layout's 311-char description on every field.
export const metadata: Metadata = {
  title: "Sitemap",
  description: "Every page on FinovaOS — features, pricing, industries, docs, and legal — in one searchable directory.",
  openGraph: {
    title: "Sitemap | FinovaOS",
    description: "Every page on FinovaOS in one searchable directory.",
    url: `${BASE}/all-pages`,
    siteName: "FinovaOS",
    type: "website",
  },
  alternates: { canonical: `${BASE}/all-pages` },
};

export default function AllPagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
