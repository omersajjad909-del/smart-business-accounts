import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Industry Solutions — FinovaOS",
  description: "FinovaOS adapts to your industry. Purpose-built solutions for retail, manufacturing, restaurants, real estate, healthcare, schools, agencies, and more.",
  keywords: ["industry accounting software", "retail accounting", "manufacturing ERP", "restaurant billing", "school fee management", "hospital billing software"],
  alternates: { canonical: `${BASE}/industries` },
  openGraph: {
    title: "Industry Solutions — FinovaOS",
    description: "Purpose-built solutions for retail, manufacturing, restaurants, healthcare, schools, and more.",
    url: `${BASE}/industries`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Industry Solutions" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Industry Solutions — FinovaOS",
    description: "Purpose-built for your industry. Retail, manufacturing, restaurants, healthcare, schools and more.",
    images: [`${BASE}/icon.png`],
  },
};

export default function IndustriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
