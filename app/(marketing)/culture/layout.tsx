import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Our Culture — FinovaOS",
  description: "How we work at FinovaOS — remote-first, async by default, ownership-driven. Learn about our values, rituals, and what makes us different.",
  alternates: { canonical: `${BASE}/culture` },
  openGraph: {
    title: "Our Culture — FinovaOS",
    description: "Remote-first. Async by default. Ownership-driven. Learn how we work at FinovaOS.",
    url: `${BASE}/culture`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Culture" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Culture — FinovaOS",
    description: "Remote-first. Async by default. Ownership-driven.",
    images: [`${BASE}/icon.png`],
  },
};

export default function CultureLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
