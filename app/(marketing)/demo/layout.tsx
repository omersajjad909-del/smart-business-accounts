import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Try Live Demo - Explore FinovaOS by Business Type",
  description:
    "Select your business type, explore the exact modules you get, and launch a live FinovaOS demo workspace tailored for traders, wholesalers, distributors, and import/export teams.",
  keywords: [
    "live accounting software demo", "business type demo", "FinovaOS live demo", "cloud accounting demo", "trading business demo", "import export demo",
  ],
  openGraph: {
    title: "Try Live Demo - Explore FinovaOS by Business Type",
    description:
      "Pick your business type and preview FinovaOS's workflows, modules, and live workspace before you start.",
    url: `${BASE}/demo`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Demo" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Try Live FinovaOS Demo",
    description: "Choose your business type and explore a live FinovaOS demo workspace.",
    images: [`${BASE}/icon.png`],
  },
  // No canonical here on purpose. A hardcoded canonical in a nested layout
  // applies to the whole subtree, so this one made /demo/start declare itself
  // a duplicate of /demo. The (marketing) layout already derives a per-pathname
  // canonical from x-pathname, which is correct for the parent and every child.
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

