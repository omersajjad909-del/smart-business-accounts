import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Business Accounts — Cloud Financial Management for SMEs",
  description: "Secure, cloud-based accounting for traders, distributors, manufacturers, and service businesses. Real-time dashboards, smart reporting, and multi-company management.",
  openGraph: {
    title: "Smart Business Accounts",
    description: "Cloud financial management for SMEs — professional, trustworthy, and simple.",
    url: "https://example.com/landing",
    siteName: "Smart Business Accounts",
    images: [
      { url: "/og/landing", width: 1200, height: 630, alt: "Smart Business Accounts" },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Business Accounts",
    description: "Cloud financial management for SMEs.",
    images: ["/og/landing"],
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
