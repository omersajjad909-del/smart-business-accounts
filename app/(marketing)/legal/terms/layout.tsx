import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Finova's Terms of Service govern your use of our cloud accounting and business management platform. Read our terms, your rights, and our obligations. Last updated March 1, 2025.",
  openGraph: {
    title: "Terms of Service | Finova",
    description: "Terms and conditions governing your use of Finova.",
    url: `${BASE}/legal/terms`,
    siteName: "Finova",
    type: "website",
  },
  alternates: { canonical: `${BASE}/legal/terms` },
  robots: { index: true, follow: false },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
