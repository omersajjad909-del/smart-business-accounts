import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: "FinovaOS's Acceptable Use Policy — what you may and may not do on the platform. Last updated 15 June 2026.",
  openGraph: {
    title: "Acceptable Use Policy | FinovaOS",
    description: "What you may and may not do on the FinovaOS platform.",
    url: `${BASE}/legal/aup`,
    siteName: "FinovaOS",
    type: "website",
  },
  alternates: { canonical: `${BASE}/legal/aup` },
  robots: { index: true, follow: false },
};

export default function AupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
