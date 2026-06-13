import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "FinovaOS Refund Policy — understand your refund eligibility, how to request a refund, and what to expect. Yearly plans refundable within 14 days.",
  openGraph: {
    title: "Refund Policy | FinovaOS",
    description: "FinovaOS refund policy for monthly and yearly subscriptions.",
    url: `${BASE}/legal/refund`,
    siteName: "FinovaOS",
    type: "website",
  },
  alternates: { canonical: `${BASE}/legal/refund` },
  robots: { index: true, follow: false },
};

export default function RefundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
