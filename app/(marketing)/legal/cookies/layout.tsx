import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Learn how FinovaOS uses cookies, analytics, security cookies, and preference storage across our website and product surfaces.",
  openGraph: {
    title: "Cookie Policy | FinovaOS",
    description: "How FinovaOS uses cookies, analytics, and browser storage.",
    url: `${BASE}/legal/cookies`,
    siteName: "FinovaOS",
    type: "website",
  },
  alternates: { canonical: `${BASE}/legal/cookies` },
  robots: { index: true, follow: false },
};

export default function CookieLayout({ children }: { children: React.ReactNode }) {
  return children;
}
