import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Try Live Demo - Explore Finova by Business Type",
  description:
    "Select your business type, explore the exact modules you get, and launch a live Finova demo workspace tailored for traders, wholesalers, distributors, and import/export teams.",
  keywords: [
    "live accounting software demo", "business type demo", "Finova live demo", "cloud accounting demo", "trading business demo", "import export demo",
  ],
  openGraph: {
    title: "Try Live Demo - Explore Finova by Business Type",
    description:
      "Pick your business type and preview Finova's workflows, modules, and live workspace before you start.",
    url: `${BASE}/demo`,
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Finova Demo" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Try Live Finova Demo",
    description: "Choose your business type and explore a live Finova demo workspace.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/demo` },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

